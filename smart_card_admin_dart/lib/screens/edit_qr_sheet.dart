import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/qr_models.dart';
import '../services/firestore_service.dart';
import '../utils/deep_links.dart';
import '../widgets/three_d_widgets.dart';

const List<String> _egyptianBanks = [
  'البنك الأهلي المصري (NBE)',
  'بنك مصر (Banque Misr)',
  'البنك التجاري الدولي (CIB)',
  'بنك قطر الوطني (QNB)',
  'بنك القاهرة (Banque du Caire)',
  'بنك الإسكندرية (AlexBank)',
  'بنك فيصل الإسلامي',
  'مصرف أبوظبي الإسلامي (ADIB)',
  'بنك البركة مصر',
  'البنك العربي الأفريقي الدولي (AAIB)',
  'بنك كريدي أجريكول مصر',
  'بنك HSBC مصر',
  'بنك آخر / حساب دولي',
];

class EditQrSheet extends StatefulWidget {
  final QrCodeRecord record;
  final String domainUrl;
  final ValueChanged<QrCodeRecord> onSaved;
  final ValueChanged<String> onDeleted;

  const EditQrSheet({
    super.key,
    required this.record,
    required this.domainUrl,
    required this.onSaved,
    required this.onDeleted,
  });

  @override
  State<EditQrSheet> createState() => _EditQrSheetState();
}

class _EditQrSheetState extends State<EditQrSheet> {
  final GlobalKey _qrKey = GlobalKey();
  late QrCodeRecord _record;
  late AppType _selectedType;
  late TextEditingController _labelCtrl;
  late TextEditingController _targetCtrl;

  // Bank fields
  String _bankName = _egyptianBanks.first;
  late TextEditingController _bankAccCtrl;
  late TextEditingController _bankOwnerCtrl;
  late TextEditingController _bankIbanCtrl;
  late TextEditingController _bankNotesCtrl;

  // Multi-wallet (1 to 4) with 100% automatic operator detection
  int _walletCount = 1;
  final List<TextEditingController> _walletPhoneCtrls = List.generate(4, (_) => TextEditingController());
  final List<TextEditingController> _walletOwnerCtrls = List.generate(4, (_) => TextEditingController());
  final List<WalletProvider> _walletProviders = List.filled(4, WalletProvider.generic);

  bool _saving = false;
  bool _purging = false;
  bool _deactivating = false;
  String? _errorMsg;
  String? _noticeMsg;

  @override
  void initState() {
    super.initState();
    _record = widget.record;
    _selectedType = _record.appType;
    _labelCtrl = TextEditingController(text: _record.label);
    _targetCtrl = TextEditingController(text: _record.targetUrl ?? '');
    _bankAccCtrl = TextEditingController();
    _bankOwnerCtrl = TextEditingController();
    _bankIbanCtrl = TextEditingController();
    _bankNotesCtrl = TextEditingController();

    if (_selectedType == AppType.bank || (_record.targetUrl?.startsWith('bank://') ?? false)) {
      _selectedType = AppType.bank;
      final bank = decodeBankDetails(_record.targetUrl);
      if (bank != null) {
        _bankName = _egyptianBanks.contains(bank.bankName) ? bank.bankName : _egyptianBanks.last;
        _bankAccCtrl.text = bank.accountNumber;
        _bankOwnerCtrl.text = bank.accountName;
        _bankIbanCtrl.text = bank.iban;
        _bankNotesCtrl.text = bank.notes;
      }
    } else if (_selectedType == AppType.wallet || _record.wallets.isNotEmpty) {
      _selectedType = AppType.wallet;
      if (_record.wallets.isNotEmpty) {
        _walletCount = _record.wallets.length.clamp(1, 4);
        for (var i = 0; i < _record.wallets.length && i < 4; i++) {
          final w = _record.wallets[i];
          _walletPhoneCtrls[i].text = w.phone;
          _walletOwnerCtrls[i].text = w.ownerName;
          _walletProviders[i] = resolveWalletProvider(w.phone, w.provider);
        }
      } else if ((_record.targetUrl ?? '').isNotEmpty) {
        _walletPhoneCtrls[0].text = _record.targetUrl!;
        _walletProviders[0] = resolveWalletProvider(_record.targetUrl!);
      }
    }
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    _targetCtrl.dispose();
    _bankAccCtrl.dispose();
    _bankOwnerCtrl.dispose();
    _bankIbanCtrl.dispose();
    _bankNotesCtrl.dispose();
    for (final c in _walletPhoneCtrls) {
      c.dispose();
    }
    for (final c in _walletOwnerCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  String get _scanUrl => '${widget.domainUrl.replaceAll(RegExp(r'/+$'), '')}/q/${_record.id}';

  void _onWalletPhoneChanged(int idx, String val) {
    setState(() {
      final trimmed = val.trim();
      if (trimmed.isEmpty) {
        _walletProviders[idx] = WalletProvider.generic;
      } else if (isQuickPayUrl(trimmed)) {
        _walletProviders[idx] = detectWalletProviderFromUrl(trimmed);
      } else {
        _walletProviders[idx] = detectWalletInfo(trimmed).provider;
      }
    });
  }

  Future<void> _purgeTargetFromDb({int? walletIndex}) async {
    setState(() {
      _purging = true;
      _errorMsg = null;
      _noticeMsg = null;
    });

    if (walletIndex != null) {
      _walletPhoneCtrls[walletIndex].clear();
      _walletProviders[walletIndex] = WalletProvider.generic;
      final remaining = <WalletItem>[];
      for (var i = 0; i < _walletCount; i++) {
        final phone = _walletPhoneCtrls[i].text.trim();
        if (phone.isNotEmpty) {
          remaining.add(WalletItem(
            phone: phone,
            provider: resolveWalletProvider(phone, _walletProviders[i]),
            ownerName: _walletOwnerCtrls[i].text.trim(),
          ));
        }
      }
      final updated = await FirestoreService.purgeQrTarget(
        existing: _record,
        appType: AppType.wallet,
        remainingWallets: remaining,
        label: _labelCtrl.text,
      );
      if (!mounted) return;
      if (updated != null) {
        _record = updated;
        widget.onSaved(updated);
        _noticeMsg = 'تم حذف الرابط/الرقم القديم نهائياً من قاعدة البيانات.';
      }
    } else {
      _targetCtrl.clear();
      final updated = await FirestoreService.purgeQrTarget(
        existing: _record,
        appType: _selectedType,
        label: _labelCtrl.text,
      );
      if (!mounted) return;
      if (updated != null) {
        _record = updated;
        widget.onSaved(updated);
        _noticeMsg = 'تم حذف الرابط القديم نهائياً من قاعدة البيانات.';
      }
    }

    setState(() => _purging = false);
  }

  Future<void> _save() async {
    setState(() {
      _errorMsg = null;
      _noticeMsg = null;
    });

    String? finalTarget = _targetCtrl.text.trim();
    List<WalletItem>? finalWallets;

    if (_selectedType == AppType.bank) {
      if (_bankAccCtrl.text.trim().isEmpty) {
        setState(() => _errorMsg = 'يرجى كتابة رقم الحساب البنكي.');
        return;
      }
      finalTarget = encodeBankDetails(BankDetails(
        bankName: _bankName,
        accountNumber: _bankAccCtrl.text.trim(),
        accountName: _bankOwnerCtrl.text.trim(),
        iban: _bankIbanCtrl.text.trim(),
        notes: _bankNotesCtrl.text.trim(),
      ));
    } else if (_selectedType == AppType.wallet) {
      final list = <WalletItem>[];
      for (var i = 0; i < _walletCount; i++) {
        final phone = _walletPhoneCtrls[i].text.trim();
        final owner = _walletOwnerCtrls[i].text.trim();
        if (phone.isEmpty) {
          setState(() => _errorMsg = _walletCount == 1
              ? 'يرجى إدخال رقم المحفظة أو رابط الدفع السريع.'
              : 'يرجى إدخال بيانات المحفظة رقم ${i + 1}.');
          return;
        }
        if (owner.isEmpty) {
          setState(() => _errorMsg = _walletCount == 1
              ? 'يرجى كتابة اسم صاحب المحفظة (إلزامي).'
              : 'يرجى كتابة اسم صاحب المحفظة رقم ${i + 1} (إلزامي).');
          return;
        }
        final prov = resolveWalletProvider(phone, _walletProviders[i]);
        list.add(WalletItem(
          phone: isQuickPayUrl(phone) ? sanitizeQuickPayUrl(phone, prov) : detectWalletInfo(phone).cleanPhone,
          provider: prov,
          ownerName: owner,
        ));
      }
      finalWallets = list;
      finalTarget = list.first.phone;
    } else if (_selectedType == AppType.instapay) {
      if (finalTarget.isEmpty) {
        setState(() => _errorMsg = 'يرجى إدخال رابط الدفع السريع من تطبيق إنستاباي.');
        return;
      }
      if (!finalTarget.startsWith('http://') && !finalTarget.startsWith('https://')) {
        finalTarget = 'https://$finalTarget';
      }
    } else if (_selectedType == AppType.whatsapp && finalTarget.isNotEmpty) {
      finalTarget = formatWhatsappTargetUrl(finalTarget);
    } else if (_selectedType == AppType.phone && finalTarget.isNotEmpty) {
      finalTarget = formatPhoneTargetUrl(finalTarget);
    } else if (_selectedType == AppType.tiktok && finalTarget.isNotEmpty) {
      finalTarget = formatTikTokTargetUrl(finalTarget);
    } else if (_selectedType == AppType.instagram && finalTarget.isNotEmpty) {
      finalTarget = formatInstagramTargetUrl(finalTarget);
    } else if (_selectedType == AppType.telegram && finalTarget.isNotEmpty) {
      finalTarget = formatTelegramTargetUrl(finalTarget);
    } else if (_selectedType == AppType.snapchat && finalTarget.isNotEmpty) {
      finalTarget = formatSnapchatTargetUrl(finalTarget);
    } else if (finalTarget.isEmpty) {
      setState(() => _errorMsg = 'يرجى إدخال الرابط أو البيانات المطلوبة.');
      return;
    }

    setState(() => _saving = true);
    final updated = await FirestoreService.updateQrCode(
      existing: _record,
      appType: _selectedType,
      targetUrl: finalTarget,
      label: _labelCtrl.text,
      wallets: finalWallets,
    );
    if (!mounted) return;
    setState(() => _saving = false);

    if (updated != null) {
      _record = updated;
      widget.onSaved(updated);
      Navigator.of(context).pop();
    } else {
      setState(() => _errorMsg = 'تعذر الحفظ في قاعدة البيانات. تحقق من الاتصال.');
    }
  }

  Future<void> _renew(int months) async {
    setState(() => _saving = true);
    final updated = await FirestoreService.renewQrSubscription(_record, months);
    if (!mounted) return;
    setState(() => _saving = false);
    if (updated != null) {
      setState(() {
        _record = updated;
        _noticeMsg = months >= 900 ? 'تم التفعيل الدائم بنجاح.' : 'تم تجديد الاشتراك +$months شهر بنجاح.';
      });
      widget.onSaved(updated);
    }
  }

  Future<void> _deactivateCard() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0x66F59E0B)),
        ),
        title: const Text(
          'إلغاء التفعيل وإعادة الكارت كجديد؟',
          style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 15.5),
        ),
        content: Text(
          'سيتم مسح جميع البيانات المكتوبة على البطاقة (${_record.id}) بما في ذلك الروابط وأرقام المحافظ والوصف وعداد المسحات، وستعود إلى حالة "غير مفعل" ليتمكن العميل من تفعيلها من الصفر.',
          style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.5),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('تراجع')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFBBF24), foregroundColor: Colors.black),
            child: const Text('تأكيد إلغاء التفعيل', style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;
    setState(() {
      _deactivating = true;
      _errorMsg = null;
      _noticeMsg = null;
    });

    final reset = await FirestoreService.deactivateQrCode(_record);
    if (!mounted) return;
    setState(() => _deactivating = false);

    if (reset != null) {
      _record = reset;
      widget.onSaved(reset);
      Navigator.of(context).pop();
    } else {
      setState(() => _errorMsg = 'تعذر إلغاء التفعيل في قاعدة البيانات، تحقق من الاتصال.');
    }
  }

  Future<void> _shareQrPng() async {
    try {
      final boundary = _qrKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return;
      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return;
      final bytes = byteData.buffer.asUint8List();
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/smart_card_${_record.id}.png');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles([XFile(file.path)], text: 'Smart Card QR: ${_record.id}\n$_scanUrl');
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121216),
        foregroundColor: Colors.white,
        title: Text(
          'إدارة البطاقة: ${_record.id}',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_forever_rounded, color: Color(0xFFF87171)),
            tooltip: 'حذف الرمز نهائياً',
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: const Color(0xFF18181B),
                  title: const Text('حذف رمز QR؟', style: TextStyle(color: Colors.white)),
                  content: Text('سيتم حذف الرمز ${_record.id} نهائياً من قاعدة البيانات.', style: const TextStyle(color: Colors.white70)),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('حذف', style: TextStyle(color: Color(0xFFF87171))),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                final ok = await FirestoreService.deleteQrCode(_record.id);
                if (!context.mounted) return;
                if (ok) {
                  widget.onDeleted(_record.id);
                  Navigator.of(context).pop();
                }
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card3DEnter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // QR Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF121216),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x4DF59E0B)),
                ),
                child: Row(
                  children: [
                    RepaintBoundary(
                      key: _qrKey,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: QrImageView(
                          data: _scanUrl,
                          version: QrVersions.auto,
                          size: 92,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _record.id,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFFBBF24),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'المسحات: ${_record.totalScans} • ${_record.isActive ? "مفعّل" : "غير مفعّل"}',
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              OutlinedButton.icon(
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: _scanUrl));
                                  setState(() => _noticeMsg = 'تم نسخ رابط البطاقة.');
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFFFCD34D),
                                  side: const BorderSide(color: Color(0x4DF59E0B)),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                icon: const Icon(Icons.copy_rounded, size: 15),
                                label: const Text('نسخ', style: TextStyle(fontSize: 11)),
                              ),
                              OutlinedButton.icon(
                                onPressed: _shareQrPng,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFFFCD34D),
                                  side: const BorderSide(color: Color(0x4DF59E0B)),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                icon: const Icon(Icons.share_rounded, size: 15),
                                label: const Text('مشاركة PNG', style: TextStyle(fontSize: 11)),
                              ),
                              OutlinedButton.icon(
                                onPressed: () => launchUrl(Uri.parse(_scanUrl), mode: LaunchMode.externalApplication),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white70,
                                  side: const BorderSide(color: Colors.white24),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                icon: const Icon(Icons.open_in_new_rounded, size: 15),
                                label: const Text('اختبار', style: TextStyle(fontSize: 11)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              if (_errorMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0x26EF4444),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0x66EF4444)),
                  ),
                  child: Text(_errorMsg!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
                ),
                const SizedBox(height: 12),
              ],
              if (_noticeMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0x2610B981),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0x6610B981)),
                  ),
                  child: Text(_noticeMsg!, style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12)),
                ),
                const SizedBox(height: 12),
              ],

              // Label input
              TextField(
                controller: _labelCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'اسم / وصف البطاقة (اختياري)',
                  labelStyle: const TextStyle(color: Colors.white70, fontSize: 12.5),
                  filled: true,
                  fillColor: const Color(0xFF121216),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 16),

              // 3D Platform Grid
              const Text(
                'اختر المنصة المرتبطة بالكارت:',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFFCD34D)),
              ),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 1.05,
                children: AppType.values.map((t) {
                  return PlatformTile3D(
                    selected: _selectedType == t,
                    icon: t.icon,
                    iconColor: t.brandColor,
                    label: t.labelAr,
                    onTap: () {
                      setState(() {
                        if (_selectedType != t) {
                          _selectedType = t;
                          _targetCtrl.clear();
                          _errorMsg = null;
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Dynamic Platform Inputs
              if (_selectedType == AppType.wallet) _buildWalletEditor()
              else if (_selectedType == AppType.bank) _buildBankEditor()
              else _buildStandardTargetEditor(),

              const SizedBox(height: 18),

              // Subscription & Scan Reset Bar
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF121216),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'إدارة الاشتراك والعداد:',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFFFCD34D)),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ActionChip(
                          backgroundColor: Colors.black54,
                          label: const Text('+1 شهر', style: TextStyle(color: Colors.white, fontSize: 11.5)),
                          onPressed: () => _renew(1),
                        ),
                        ActionChip(
                          backgroundColor: Colors.black54,
                          label: const Text('+3 شهور', style: TextStyle(color: Colors.white, fontSize: 11.5)),
                          onPressed: () => _renew(3),
                        ),
                        ActionChip(
                          backgroundColor: Colors.black54,
                          label: const Text('+12 شهر', style: TextStyle(color: Colors.white, fontSize: 11.5)),
                          onPressed: () => _renew(12),
                        ),
                        ActionChip(
                          backgroundColor: const Color(0x33F59E0B),
                          label: const Text('تفعيل دائم', style: TextStyle(color: Color(0xFFFCD34D), fontSize: 11.5)),
                          onPressed: () => _renew(999),
                        ),
                        ActionChip(
                          backgroundColor: const Color(0x26EF4444),
                          label: const Text('تصفير المسحات', style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 11.5)),
                          onPressed: () async {
                            final ok = await FirestoreService.resetQrScanCount(_record);
                            if (ok && mounted) {
                              final updated = QrCodeRecord(
                                id: _record.id,
                                isActive: _record.isActive,
                                targetUrl: _record.targetUrl,
                                appType: _record.appType,
                                label: _record.label,
                                createdAt: _record.createdAt,
                                updatedAt: DateTime.now().toUtc().toIso8601String(),
                                totalScans: 0,
                                expiresAt: _record.expiresAt,
                                subscriptionMonths: _record.subscriptionMonths,
                                wallets: _record.wallets,
                                isPrinted: _record.isPrinted,
                                printedAt: _record.printedAt,
                              );
                              setState(() {
                                _record = updated;
                                _noticeMsg = 'تم تصفير عداد المسحات.';
                              });
                              widget.onSaved(updated);
                            }
                          },
                        ),
                      ],
                    ),
                    const Divider(color: Colors.white12, height: 22),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      activeColor: const Color(0xFF22D3EE),
                      title: const Text(
                        'حالة الطباعة (تمت طباعة البطاقة ✓)',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF67E8F9)),
                      ),
                      subtitle: Text(
                        _record.isPrinted ? 'موجودة الآن في قائمة الكروت المطبوعة' : 'في انتظار الطباعة (غير مطبوعة)',
                        style: const TextStyle(fontSize: 11, color: Colors.white60),
                      ),
                      value: _record.isPrinted,
                      onChanged: (val) async {
                        final res = await FirestoreService.toggleQrPrintedStatus(_record, val);
                        if (res != null && mounted) {
                          setState(() {
                            _record = res;
                            _noticeMsg = val
                                ? 'تم نقل البطاقة إلى خانة الكروت المطبوعة ✓'
                                : 'تمت إعادة البطاقة إلى قائمة غير المطبوعة';
                          });
                          widget.onSaved(res);
                        }
                      },
                    ),
                    if (_record.isActive) ...[
                      const Divider(color: Colors.white12, height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: (_saving || _purging || _deactivating) ? null : _deactivateCard,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFFBBF24),
                            side: const BorderSide(color: Color(0x66F59E0B)),
                            backgroundColor: const Color(0x1AF59E0B),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          icon: _deactivating
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFFBBF24)),
                                )
                              : const Icon(Icons.restart_alt_rounded, size: 18),
                          label: Text(
                            _deactivating ? 'جاري إلغاء التفعيل...' : 'إلغاء التفعيل وإرجاع الكارت كجديد',
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: (_saving || _purging || _deactivating) ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFBBF24),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  icon: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                      : const Icon(Icons.save_rounded),
                  label: Text(
                    _saving ? 'جاري الحفظ...' : 'حفظ وتحديث البطاقة فوراً',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStandardTargetEditor() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x4DF59E0B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'بيانات ${_selectedType.labelAr}:',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFFCD34D)),
              ),
              if (_targetCtrl.text.trim().isNotEmpty)
                TextButton.icon(
                  onPressed: _purging ? null : () => _purgeTargetFromDb(),
                  icon: const Icon(Icons.delete_sweep_rounded, size: 16, color: Color(0xFFF87171)),
                  label: const Text('حذف من قاعدة البيانات', style: TextStyle(fontSize: 11, color: Color(0xFFF87171))),
                ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _targetCtrl,
            textDirection: TextDirection.ltr,
            style: const TextStyle(color: Colors.white, fontSize: 13.5),
            decoration: InputDecoration(
              hintText: _selectedType.placeholder,
              hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
              filled: true,
              fillColor: Colors.black54,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBankEditor() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x4DF59E0B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'بيانات الحساب البنكي:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFFCD34D)),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _bankName,
            dropdownColor: const Color(0xFF18181B),
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.black54,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            items: _egyptianBanks
                .map((b) => DropdownMenuItem(value: b, child: Text(b, overflow: TextOverflow.ellipsis)))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _bankName = v);
            },
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _bankAccCtrl,
            textDirection: TextDirection.ltr,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'رقم الحساب البنكي (إلزامي)',
              labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
              filled: true,
              fillColor: Colors.black54,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _bankOwnerCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'اسم صاحب الحساب (اختياري)',
              labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
              filled: true,
              fillColor: Colors.black54,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _bankIbanCtrl,
            textDirection: TextDirection.ltr,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'IBAN (اختياري)',
              labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
              filled: true,
              fillColor: Colors.black54,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWalletEditor() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF121216),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0x4DF59E0B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'عدد المحافظ المرتبطة بالكارت:',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFFFCD34D)),
              ),
              const SizedBox(height: 10),
              Row(
                children: [1, 2, 3, 4].map((count) {
                  final selected = _walletCount == count;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: InkWell(
                        onTap: () => setState(() => _walletCount = count),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: selected ? const Color(0xFFFBBF24) : Colors.black54,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: selected ? const Color(0xFFFDE68A) : Colors.white12),
                          ),
                          child: Column(
                            children: [
                              Text(
                                '$count',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: selected ? Colors.black : Colors.white,
                                ),
                              ),
                              Text(
                                count == 1 ? 'محفظة' : 'محافظ',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: selected ? Colors.black87 : Colors.white60,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ...List.generate(_walletCount, (idx) {
          final text = _walletPhoneCtrls[idx].text.trim();
          final prov = text.isNotEmpty ? resolveWalletProvider(text, _walletProviders[idx]) : WalletProvider.generic;
          final isKnown = text.isNotEmpty && prov != WalletProvider.generic;

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF121216),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isKnown ? prov.color.withValues(alpha: 0.6) : const Color(0x4DF59E0B),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: (isKnown ? prov.color : const Color(0xFFF59E0B)).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.account_balance_wallet_rounded,
                            color: isKnown ? prov.color : const Color(0xFFFBBF24),
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _walletCount > 1 ? 'المحفظة رقم ${idx + 1}' : 'بيانات المحفظة',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Colors.white),
                            ),
                            if (isKnown)
                              Text(
                                '${prov.nameAr} (${prov.nameEn})',
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: prov.color),
                              ),
                          ],
                        ),
                      ],
                    ),
                    if (text.isNotEmpty)
                      TextButton.icon(
                        onPressed: _purging ? null : () => _purgeTargetFromDb(walletIndex: idx),
                        icon: const Icon(Icons.delete_sweep_rounded, size: 15, color: Color(0xFFF87171)),
                        label: const Text('حذف من القاعدة', style: TextStyle(fontSize: 11, color: Color(0xFFF87171))),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _walletPhoneCtrls[idx],
                  textDirection: TextDirection.ltr,
                  onChanged: (v) => _onWalletPhoneChanged(idx, v),
                  style: const TextStyle(color: Color(0xFFFCD34D), fontWeight: FontWeight.w700, fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'رقم المحفظة أو رابط الدفع السريع (إلزامي)',
                    labelStyle: const TextStyle(color: Colors.white70, fontSize: 11.5),
                    hintText: '010... أو https://...',
                    hintStyle: const TextStyle(color: Colors.white30),
                    filled: true,
                    fillColor: Colors.black54,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _walletOwnerCtrls[idx],
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'اسم صاحب المحفظة (إلزامي)',
                    labelStyle: const TextStyle(color: Colors.white70, fontSize: 11.5),
                    hintText: 'مثال: أحمد محمد علي',
                    hintStyle: const TextStyle(color: Colors.white30),
                    filled: true,
                    fillColor: Colors.black54,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
