import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/qr_models.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../widgets/three_d_widgets.dart';
import 'edit_qr_sheet.dart';
import 'qr_scanner_screen.dart';
import 'settings_screen.dart';

enum _QrFilter { all, active, inactive, expired }

class AdminDashboardScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const AdminDashboardScreen({super.key, required this.onLogout});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  List<QrCodeRecord> _records = [];
  PlatformSettings _settings = const PlatformSettings();
  bool _loading = true;
  bool _generating = false;
  String _searchQuery = '';
  _QrFilter _filter = _QrFilter.all;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      FirestoreService.fetchAllQrCodes(),
      FirestoreService.fetchPlatformSettings(),
    ]);
    if (!mounted) return;
    setState(() {
      _records = results[0] as List<QrCodeRecord>;
      _settings = results[1] as PlatformSettings;
      _loading = false;
    });
  }

  String get _domainUrl {
    final d = _settings.publicDomainUrl.trim();
    return d.isNotEmpty ? d : 'https://smart-card-inky.vercel.app';
  }

  List<QrCodeRecord> get _filteredRecords {
    final q = _searchQuery.trim().toLowerCase();
    return _records.where((r) {
      if (_filter == _QrFilter.active && (!r.isActive || r.isExpired)) return false;
      if (_filter == _QrFilter.inactive && r.isActive) return false;
      if (_filter == _QrFilter.expired && !r.isExpired) return false;

      if (q.isEmpty) return true;
      if (r.id.toLowerCase().contains(q)) return true;
      if (r.label.toLowerCase().contains(q)) return true;
      if ((r.targetUrl ?? '').toLowerCase().contains(q)) return true;
      if (r.appType.labelAr.toLowerCase().contains(q)) return true;
      for (final w in r.wallets) {
        if (w.phone.toLowerCase().contains(q) || w.ownerName.toLowerCase().contains(q)) return true;
      }
      return false;
    }).toList();
  }

  Future<void> _openScanner() async {
    final scannedId = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    );
    if (!mounted || scannedId == null || scannedId.isEmpty) return;

    QrCodeRecord? found;
    for (final r in _records) {
      if (r.id == scannedId) {
        found = r;
        break;
      }
    }
    found ??= await FirestoreService.getQrCode(scannedId);
    if (!mounted) return;

    if (found == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFEF4444),
          content: Text('الرمز "$scannedId" غير موجود في قاعدة البيانات.'),
        ),
      );
      return;
    }

    _openEditScreen(found);
  }

  Future<void> _openBulkGenerateDialog() async {
    int count = 5;
    int months = 1;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          backgroundColor: const Color(0xFF121216),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
            side: const BorderSide(color: Color(0x4DF59E0B)),
          ),
          title: const Text(
            'توليد أكواد QR جديدة',
            style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 16),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('عدد البطاقات المطلوبة:', style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [1, 5, 10, 20].map((c) {
                  final sel = count == c;
                  return ChoiceChip(
                    selected: sel,
                    selectedColor: const Color(0xFFFBBF24),
                    backgroundColor: Colors.black54,
                    label: Text('$c', style: TextStyle(color: sel ? Colors.black : Colors.white, fontWeight: FontWeight.w900)),
                    onSelected: (_) => setModalState(() => count = c),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              const Text('مدة الصلاحية الافتراضية:', style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  (1, 'شهر'),
                  (3, '3 شهور'),
                  (6, '6 شهور'),
                  (12, 'سنة'),
                  (999, 'دائم'),
                ].map((opt) {
                  final sel = months == opt.$1;
                  return ChoiceChip(
                    selected: sel,
                    selectedColor: const Color(0xFFFBBF24),
                    backgroundColor: Colors.black54,
                    label: Text(opt.$2, style: TextStyle(color: sel ? Colors.black : Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800)),
                    onSelected: (_) => setModalState(() => months = opt.$1),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFBBF24), foregroundColor: Colors.black),
              child: const Text('توليد الآن', style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true || !mounted) return;
    setState(() => _generating = true);
    final created = await FirestoreService.createBulkQrCodes(count, months);
    if (!mounted) return;
    setState(() {
      _records = [...created, ..._records];
      _generating = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        content: Text('تم توليد ${created.length} رمز QR جديد وحفظهم في قاعدة البيانات.'),
      ),
    );
  }

  void _openEditScreen(QrCodeRecord record) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EditQrSheet(
          record: record,
          domainUrl: _domainUrl,
          onSaved: (updated) {
            setState(() {
              _records = _records.map((r) => r.id == updated.id ? updated : r).toList();
            });
          },
          onDeleted: (deletedId) {
            setState(() {
              _records = _records.where((r) => r.id != deletedId).toList();
            });
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final total = _records.length;
    final activeCount = _records.where((r) => r.isActive && !r.isExpired).length;
    final inactiveCount = _records.where((r) => !r.isActive).length;
    final expiredCount = _records.where((r) => r.isExpired).length;
    final totalScans = _records.fold<int>(0, (acc, r) => acc + r.totalScans);
    final filtered = _filteredRecords;

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121216),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Floating3DLogo(
              size: 36,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF18181B),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x66FBBF24)),
                ),
                child: Image.asset('assets/logo.png', fit: BoxFit.contain),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Smart Card Admin',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFFFBBF24)),
                ),
                Text(
                  'لوحة الإدارة الحصرية',
                  style: TextStyle(fontSize: 10, color: Colors.white60),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFFBBF24)),
            tooltip: 'تحديث',
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.settings_rounded, color: Colors.white70),
            tooltip: 'الإعدادات والأمان',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => SettingsScreen(
                    initialSettings: _settings,
                    onSettingsUpdated: (s) => setState(() => _settings = s),
                  ),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFF87171)),
            tooltip: 'تسجيل الخروج',
            onPressed: () async {
              await AuthService.logoutAdmin();
              widget.onLogout();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openScanner,
        backgroundColor: const Color(0xFFFBBF24),
        foregroundColor: Colors.black,
        icon: const Icon(Icons.qr_code_scanner_rounded),
        label: const Text('مسح بالكاميرا', style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: RefreshIndicator(
        color: const Color(0xFFFBBF24),
        backgroundColor: const Color(0xFF121216),
        onRefresh: _loadData,
        child: CustomScrollView(
          slivers: [
            // KPI Row + Quick Actions
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _kpiTile('إجمالي الأكواد', '$total', const Color(0xFFFBBF24))),
                        const SizedBox(width: 8),
                        Expanded(child: _kpiTile('المفعّلة', '$activeCount', const Color(0xFF10B981))),
                        const SizedBox(width: 8),
                        Expanded(child: _kpiTile('المسحات', '$totalScans', const Color(0xFF38BDF8))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 46,
                            child: ElevatedButton.icon(
                              onPressed: _generating ? null : _openBulkGenerateDialog,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFFBBF24),
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: _generating
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                  : const Icon(Icons.add_box_rounded, size: 18),
                              label: const Text('توليد أكواد جديدة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12.5)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: SizedBox(
                            height: 46,
                            child: OutlinedButton.icon(
                              onPressed: _openScanner,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFFCD34D),
                                side: const BorderSide(color: Color(0x4DF59E0B)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: const Icon(Icons.camera_alt_rounded, size: 18),
                              label: const Text('فحص رمز QR', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      onChanged: (v) => setState(() => _searchQuery = v),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'ابحث بالكود، الاسم، الرقم، أو المنصة...',
                        hintStyle: const TextStyle(color: Colors.white38, fontSize: 12.5),
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFFBBF24)),
                        filled: true,
                        fillColor: const Color(0xFF121216),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0x33F59E0B)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0x33F59E0B)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _filterChip('الكل ($total)', _QrFilter.all),
                          const SizedBox(width: 6),
                          _filterChip('مفعّلة ($activeCount)', _QrFilter.active),
                          const SizedBox(width: 6),
                          _filterChip('غير مفعّلة ($inactiveCount)', _QrFilter.inactive),
                          const SizedBox(width: 6),
                          _filterChip('منتهية ($expiredCount)', _QrFilter.expired),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (_loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator(color: Color(0xFFFBBF24))),
              )
            else if (filtered.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: Text('لا توجد بطاقات مطابقة للبحث.', style: TextStyle(color: Colors.white54)),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(14, 4, 14, 90),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final r = filtered[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _buildQrCard(r),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _kpiTile(String title, String value, Color accent) {
    return Tilt3DCard(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      borderColor: accent.withValues(alpha: 0.35),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: accent),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, _QrFilter value) {
    final selected = _filter == value;
    return ChoiceChip(
      selected: selected,
      selectedColor: const Color(0xFFFBBF24),
      backgroundColor: const Color(0xFF121216),
      side: BorderSide(color: selected ? const Color(0xFFFDE68A) : Colors.white12),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
          color: selected ? Colors.black : Colors.white70,
        ),
      ),
      onSelected: (_) => setState(() => _filter = value),
    );
  }

  Widget _buildQrCard(QrCodeRecord r) {
    final scanUrl = '${_domainUrl.replaceAll(RegExp(r'/+$'), '')}/q/${r.id}';
    final statusColor = r.isExpired
        ? const Color(0xFFEF4444)
        : r.isActive
            ? const Color(0xFF10B981)
            : const Color(0xFFF59E0B);
    final statusText = r.isExpired ? 'منتهي' : (r.isActive ? 'مفعّل' : 'متاح للتفعيل');

    return Tilt3DCard(
      onTap: () => _openEditScreen(r),
      borderColor: statusColor.withValues(alpha: 0.35),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
            ),
            child: QrImageView(
              data: scanUrl,
              version: QrVersions.auto,
              size: 56,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      r.id,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFFFBBF24)),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: statusColor.withValues(alpha: 0.45)),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: statusColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  r.label.isNotEmpty ? r.label : '${r.appType.labelAr} • ${r.targetUrl ?? "بدون رابط"}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(r.appType.icon, size: 13, color: r.appType.brandColor),
                    const SizedBox(width: 4),
                    Text(
                      r.appType.labelAr,
                      style: const TextStyle(fontSize: 10.5, color: Colors.white60, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(width: 10),
                    const Icon(Icons.visibility_rounded, size: 13, color: Colors.white54),
                    const SizedBox(width: 3),
                    Text(
                      '${r.totalScans} مسحة',
                      style: const TextStyle(fontSize: 10.5, color: Colors.white60),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.copy_rounded, size: 18, color: Color(0xFFFCD34D)),
            tooltip: 'نسخ رابط البطاقة',
            onPressed: () {
              Clipboard.setData(ClipboardData(text: scanUrl));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('تم نسخ رابط البطاقة: $scanUrl')),
              );
            },
          ),
        ],
      ),
    );
  }
}
