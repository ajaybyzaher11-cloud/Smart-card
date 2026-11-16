import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String projectId = 'clean-plateau-dv4kj';
  static const String databaseId = 'ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0';
  static const String apiKey = 'AIzaSyAjyCP484AEQ52-9CDgp8TDkAw5woA1TFc';

  // SHA-256 of default password "admin1234"
  static const String defaultBaseHash = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';

  static const String _sessionKey = 'smart_card_admin_session_active';
  static const String _sessionExpiryKey = 'smart_card_admin_session_expiry';
  static const String _cachedHashKey = 'smart_card_admin_pwd_hash';

  static String hashPassword(String plain) {
    final bytes = utf8.encode(plain);
    return sha256.convert(bytes).toString();
  }

  static Future<bool> isAdminAuthenticated() async {
    final prefs = await SharedPreferences.getInstance();
    final active = prefs.getBool(_sessionKey) ?? false;
    if (!active) return false;
    final expiry = prefs.getInt(_sessionExpiryKey) ?? 0;
    if (expiry > 0 && DateTime.now().millisecondsSinceEpoch > expiry) {
      await logoutAdmin();
      return false;
    }
    return true;
  }

  static Future<String> getActivePasswordHash() async {
    try {
      final url = Uri.parse(
        'https://firestore.googleapis.com/v1/projects/$projectId/databases/$databaseId/documents/settings/auth?key=$apiKey',
      );
      final res = await http.get(url).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final hashVal = data['fields']?['hash']?['stringValue']?.toString();
        if (hashVal != null && hashVal.length == 64) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_cachedHashKey, hashVal);
          return hashVal;
        }
      }
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_cachedHashKey);
    if (cached != null && cached.length == 64) {
      return cached;
    }
    return defaultBaseHash;
  }

  static Future<bool> loginAdmin(String passwordAttempt) async {
    final clean = passwordAttempt.trim();
    if (clean.isEmpty) return false;

    final attemptHash = hashPassword(clean);
    final activeHash = await getActivePasswordHash();

    if (attemptHash == activeHash) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_sessionKey, true);
      await prefs.setInt(
        _sessionExpiryKey,
        DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch,
      );
      await prefs.setString(_cachedHashKey, attemptHash);
      return true;
    }
    return false;
  }

  static Future<({bool success, String message})> changeAdminPassword(
    String currentPassword,
    String newPassword,
  ) async {
    final cur = currentPassword.trim();
    final next = newPassword.trim();

    if (cur.isEmpty) {
      return (success: false, message: 'الرجاء إدخال كلمة المرور الحالية.');
    }
    if (next.length < 4) {
      return (success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف أو أرقام.');
    }

    final curHash = hashPassword(cur);
    final activeHash = await getActivePasswordHash();
    if (curHash != activeHash) {
      return (success: false, message: 'كلمة المرور الحالية غير صحيحة.');
    }

    final newHash = hashPassword(next);
    final nowIso = DateTime.now().toUtc().toIso8601String();

    final payload = jsonEncode({
      'fields': {
        'hash': {'stringValue': newHash},
        'updated_at': {'stringValue': nowIso},
        'migrated': {'booleanValue': true},
      }
    });

    try {
      final authDocUrl = Uri.parse(
        'https://firestore.googleapis.com/v1/projects/$projectId/databases/$databaseId/documents/settings/auth?key=$apiKey',
      );
      final res = await http
          .patch(authDocUrl, headers: {'Content-Type': 'application/json'}, body: payload)
          .timeout(const Duration(seconds: 8));
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return (success: false, message: 'تعذر حفظ كلمة المرور في قاعدة البيانات (${res.statusCode}).');
      }

      // Mirror to platform_settings/auth
      final mirrorUrl = Uri.parse(
        'https://firestore.googleapis.com/v1/projects/$projectId/databases/$databaseId/documents/platform_settings/auth?key=$apiKey',
      );
      await http.patch(mirrorUrl, headers: {'Content-Type': 'application/json'}, body: payload).catchError((_) => res);
    } catch (e) {
      return (success: false, message: 'حدث خطأ أثناء الاتصال بالسيرفر: $e');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cachedHashKey, newHash);

    return (
      success: true,
      message: 'تم تحديث كلمة مرور الأدمن في قاعدة البيانات السحابية بنجاح!',
    );
  }

  static Future<void> logoutAdmin() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    await prefs.remove(_sessionExpiryKey);
  }
}
