import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/qr_models.dart';
import '../utils/deep_links.dart';
import 'auth_service.dart';

class FirestoreService {
  static String get _baseDocUrl =>
      'https://firestore.googleapis.com/v1/projects/${AuthService.projectId}/databases/${AuthService.databaseId}/documents';

  static String get _apiKey => AuthService.apiKey;
  static const String _cacheKey = 'smart_card_admin_qr_cache_v1';
  static const String _settingsCacheKey = 'smart_card_admin_settings_v1';

  // ---- Firestore REST Value Encoding / Decoding ----

  static dynamic _parseFirestoreValue(dynamic val) {
    if (val is! Map) return null;
    if (val.containsKey('stringValue')) return val['stringValue'];
    if (val.containsKey('booleanValue')) return val['booleanValue'];
    if (val.containsKey('integerValue')) return int.tryParse(val['integerValue'].toString()) ?? 0;
    if (val.containsKey('doubleValue')) return (val['doubleValue'] as num).toDouble();
    if (val.containsKey('nullValue')) return null;
    if (val.containsKey('timestampValue')) return val['timestampValue'];
    if (val.containsKey('arrayValue')) {
      final list = (val['arrayValue']?['values'] as List?) ?? [];
      return list.map(_parseFirestoreValue).where((e) => e != null).toList();
    }
    if (val.containsKey('mapValue')) {
      final fields = (val['mapValue']?['fields'] as Map?) ?? {};
      final out = <String, dynamic>{};
      fields.forEach((k, v) {
        out[k.toString()] = _parseFirestoreValue(v);
      });
      return out;
    }
    return null;
  }

  static QrCodeRecord? _docToQrRecord(Map<String, dynamic>? doc) {
    if (doc == null || doc['fields'] is! Map) return null;
    final name = (doc['name'] ?? '').toString();
    final docId = name.contains('/') ? name.split('/').last : '';
    final fields = Map<String, dynamic>.from(doc['fields'] as Map);
    final parsed = <String, dynamic>{};
    fields.forEach((k, v) {
      parsed[k] = _parseFirestoreValue(v);
    });
    final id = (parsed['id'] ?? docId).toString();
    if (id.isEmpty || id == 'undefined' || id == 'null') return null;
    parsed['id'] = id;
    return QrCodeRecord.fromJson(parsed);
  }

  static Map<String, dynamic> _toFirestoreValue(dynamic value) {
    if (value == null) return {'nullValue': null};
    if (value is bool) return {'booleanValue': value};
    if (value is int) return {'integerValue': value.toString()};
    if (value is double) return {'doubleValue': value};
    if (value is List) {
      return {
        'arrayValue': {
          'values': value.map(_toFirestoreValue).toList(),
        }
      };
    }
    if (value is Map) {
      final fields = <String, dynamic>{};
      value.forEach((k, v) {
        fields[k.toString()] = _toFirestoreValue(v);
      });
      return {
        'mapValue': {'fields': fields}
      };
    }
    return {'stringValue': value.toString()};
  }

  static Map<String, dynamic> _recordToFirestoreFields(QrCodeRecord record) {
    final json = record.toJson();
    final fields = <String, dynamic>{};
    json.forEach((k, v) {
      fields[k] = _toFirestoreValue(v);
    });
    return fields;
  }

  // ---- Local Cache ----

  static Future<List<QrCodeRecord>> _loadCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw == null || raw.isEmpty) return [];
      final list = jsonDecode(raw) as List;
      return list
          .whereType<Map>()
          .map((m) => QrCodeRecord.fromJson(Map<String, dynamic>.from(m)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> _saveCache(List<QrCodeRecord> records) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey,
        jsonEncode(records.map((r) => r.toJson()).toList()),
      );
    } catch (_) {}
  }

  // ---- Core Operations ----

  static Future<List<QrCodeRecord>> fetchAllQrCodes() async {
    try {
      final url = Uri.parse('$_baseDocUrl:runQuery?key=$_apiKey');
      final res = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'structuredQuery': {
                'from': [
                  {'collectionId': 'qr_codes'}
                ],
              }
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final rows = jsonDecode(res.body) as List;
        final records = <QrCodeRecord>[];
        for (final row in rows) {
          if (row is Map && row['document'] is Map) {
            final rec = _docToQrRecord(Map<String, dynamic>.from(row['document'] as Map));
            if (rec != null) records.add(rec);
          }
        }
        records.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        await _saveCache(records);
        return records;
      }
    } catch (_) {}

    return _loadCache();
  }

  static Future<QrCodeRecord?> getQrCode(String id) async {
    final cleanId = id.trim();
    if (cleanId.isEmpty) return null;

    try {
      final url = Uri.parse('$_baseDocUrl/qr_codes/${Uri.encodeComponent(cleanId)}?key=$_apiKey');
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final doc = jsonDecode(res.body) as Map<String, dynamic>;
        final rec = _docToQrRecord(doc);
        if (rec != null) return rec;
      }
    } catch (_) {}

    final cached = await _loadCache();
    for (final item in cached) {
      if (item.id == cleanId) return item;
    }
    return null;
  }

  static String _generateNanoid8() {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
    final rand = Random.secure();
    return List.generate(8, (_) => alphabet[rand.nextInt(alphabet.length)]).join();
  }

  static Future<List<QrCodeRecord>> createBulkQrCodes(int count, int subscriptionMonths) async {
    final safeCount = count.clamp(1, 50);
    final now = DateTime.now().toUtc();
    final nowIso = now.toIso8601String();
    String? expiresAt;
    if (subscriptionMonths > 0 && subscriptionMonths < 900) {
      expiresAt = DateTime.utc(now.year, now.month + subscriptionMonths, now.day, now.hour, now.minute, now.second)
          .toIso8601String();
    }

    final created = <QrCodeRecord>[];
    for (var i = 0; i < safeCount; i++) {
      final id = _generateNanoid8();
      final record = QrCodeRecord(
        id: id,
        isActive: false,
        targetUrl: null,
        appType: AppType.website,
        label: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        totalScans: 0,
        expiresAt: expiresAt,
        subscriptionMonths: subscriptionMonths,
      );

      final url = Uri.parse('$_baseDocUrl/qr_codes/${Uri.encodeComponent(id)}?key=$_apiKey');
      final res = await http
          .patch(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'fields': _recordToFirestoreFields(record)}),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        created.add(record);
      }
    }

    return created;
  }

  /// Full canonical update: permanently overwrites the Firestore document without updateMask
  /// so any old link, old wallets array, or old platform fields are erased cleanly.
  static Future<QrCodeRecord?> updateQrCode({
    required QrCodeRecord existing,
    required AppType appType,
    required String? targetUrl,
    required String label,
    List<WalletItem>? wallets,
    String? expiresAt,
    int? subscriptionMonths,
    bool forceActive = true,
  }) async {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final cleanTarget = targetUrl?.trim();
    final hasValidTarget = cleanTarget != null && cleanTarget.isNotEmpty;
    final cleanWallets = (appType == AppType.wallet && wallets != null)
        ? wallets.where((w) => w.phone.trim().isNotEmpty).map((w) {
            final trimmedPhone = w.phone.trim();
            final resolvedProv = resolveWalletProvider(trimmedPhone, w.provider);
            final normalizedPhone = isQuickPayUrl(trimmedPhone)
                ? sanitizeQuickPayUrl(trimmedPhone, resolvedProv)
                : detectWalletInfo(trimmedPhone).cleanPhone;
            return WalletItem(
              phone: normalizedPhone,
              provider: resolvedProv == WalletProvider.generic ? WalletProvider.vodafone : resolvedProv,
              ownerName: w.ownerName.trim(),
            );
          }).toList()
        : <WalletItem>[];

    final effectiveActive = appType == AppType.wallet
        ? cleanWallets.isNotEmpty && forceActive
        : (hasValidTarget && forceActive);

    final effectiveTarget = appType == AppType.wallet
        ? (cleanWallets.isNotEmpty ? cleanWallets.first.phone : null)
        : (hasValidTarget ? cleanTarget : null);

    final updated = QrCodeRecord(
      id: existing.id,
      isActive: effectiveActive,
      targetUrl: effectiveTarget,
      appType: appType,
      label: label.trim(),
      createdAt: existing.createdAt,
      updatedAt: nowIso,
      lastScannedAt: existing.lastScannedAt,
      totalScans: existing.totalScans,
      expiresAt: expiresAt ?? existing.expiresAt,
      subscriptionMonths: subscriptionMonths ?? existing.subscriptionMonths,
      wallets: appType == AppType.wallet ? cleanWallets : const [],
    );

    final url = Uri.parse('$_baseDocUrl/qr_codes/${Uri.encodeComponent(existing.id)}?key=$_apiKey');
    final res = await http
        .patch(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'fields': _recordToFirestoreFields(updated)}),
        )
        .timeout(const Duration(seconds: 8));

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return updated;
    }
    return null;
  }

  /// Permanently purges a deleted link/wallet target from Firestore immediately
  static Future<QrCodeRecord?> purgeQrTarget({
    required QrCodeRecord existing,
    required AppType appType,
    List<WalletItem>? remainingWallets,
    String? label,
  }) async {
    return updateQrCode(
      existing: existing,
      appType: appType,
      targetUrl: null,
      label: label ?? existing.label,
      wallets: remainingWallets ?? const [],
      forceActive: appType == AppType.wallet && (remainingWallets?.any((w) => w.phone.trim().isNotEmpty) ?? false),
    );
  }

  static Future<bool> resetQrScanCount(QrCodeRecord existing) async {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final updated = QrCodeRecord(
      id: existing.id,
      isActive: existing.isActive,
      targetUrl: existing.targetUrl,
      appType: existing.appType,
      label: existing.label,
      createdAt: existing.createdAt,
      updatedAt: nowIso,
      lastScannedAt: existing.lastScannedAt,
      totalScans: 0,
      expiresAt: existing.expiresAt,
      subscriptionMonths: existing.subscriptionMonths,
      wallets: existing.wallets,
    );
    final url = Uri.parse('$_baseDocUrl/qr_codes/${Uri.encodeComponent(existing.id)}?key=$_apiKey');
    final res = await http
        .patch(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'fields': _recordToFirestoreFields(updated)}),
        )
        .timeout(const Duration(seconds: 8));
    return res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<QrCodeRecord?> renewQrSubscription(QrCodeRecord existing, int months) async {
    final now = DateTime.now().toUtc();
    String? newExpiresAt;
    if (months > 0 && months < 900) {
      final base = (existing.expiresAt != null && !existing.isExpired)
          ? (DateTime.tryParse(existing.expiresAt!) ?? now)
          : now;
      newExpiresAt = DateTime.utc(base.year, base.month + months, base.day, base.hour, base.minute, base.second)
          .toIso8601String();
    } else {
      newExpiresAt = null;
    }

    final updated = QrCodeRecord(
      id: existing.id,
      isActive: existing.isActive,
      targetUrl: existing.targetUrl,
      appType: existing.appType,
      label: existing.label,
      createdAt: existing.createdAt,
      updatedAt: now.toIso8601String(),
      lastScannedAt: existing.lastScannedAt,
      totalScans: existing.totalScans,
      expiresAt: newExpiresAt,
      subscriptionMonths: months,
      wallets: existing.wallets,
    );

    final url = Uri.parse('$_baseDocUrl/qr_codes/${Uri.encodeComponent(existing.id)}?key=$_apiKey');
    final res = await http
        .patch(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'fields': _recordToFirestoreFields(updated)}),
        )
        .timeout(const Duration(seconds: 8));
    return (res.statusCode >= 200 && res.statusCode < 300) ? updated : null;
  }

  static Future<bool> deleteQrCode(String id) async {
    final url = Uri.parse('$_baseDocUrl/qr_codes/${Uri.encodeComponent(id)}?key=$_apiKey');
    final res = await http.delete(url).timeout(const Duration(seconds: 8));
    return res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<PlatformSettings> fetchPlatformSettings() async {
    try {
      final url = Uri.parse('$_baseDocUrl/settings/platform?key=$_apiKey');
      final res = await http.get(url).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final doc = jsonDecode(res.body) as Map<String, dynamic>;
        final fields = (doc['fields'] as Map?) ?? {};
        final parsed = <String, dynamic>{};
        fields.forEach((k, v) {
          parsed[k.toString()] = _parseFirestoreValue(v);
        });
        final settings = PlatformSettings.fromJson(parsed);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_settingsCacheKey, jsonEncode(settings.toJson()));
        return settings;
      }
    } catch (_) {}

    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_settingsCacheKey);
      if (raw != null && raw.isNotEmpty) {
        return PlatformSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      }
    } catch (_) {}

    return const PlatformSettings();
  }

  static Future<bool> updatePlatformSettings(PlatformSettings settings) async {
    try {
      final url = Uri.parse('$_baseDocUrl/settings/platform?key=$_apiKey');
      final fields = <String, dynamic>{};
      settings.toJson().forEach((k, v) {
        fields[k] = _toFirestoreValue(v);
      });
      final res = await http
          .patch(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'fields': fields}),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_settingsCacheKey, jsonEncode(settings.toJson()));
        return true;
      }
    } catch (_) {}
    return false;
  }
}
