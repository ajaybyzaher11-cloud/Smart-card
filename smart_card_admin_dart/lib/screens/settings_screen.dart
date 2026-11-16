import 'package:flutter/material.dart';
import '../models/qr_models.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../widgets/three_d_widgets.dart';

class SettingsScreen extends StatefulWidget {
  final PlatformSettings initialSettings;
  final ValueChanged<PlatformSettings> onSettingsUpdated;

  const SettingsScreen({
    super.key,
    required this.initialSettings,
    required this.onSettingsUpdated,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _domainCtrl;
  late TextEditingController _waCtrl;
  late TextEditingController _titleCtrl;

  final _curPwdCtrl = TextEditingController();
  final _newPwdCtrl = TextEditingController();

  bool _savingSettings = false;
  bool _savingPwd = false;
  String? _statusMsg;
  bool _isError = false;

  @override
  void initState() {
    super.initState();
    _domainCtrl = TextEditingController(text: widget.initialSettings.publicDomainUrl);
    _waCtrl = TextEditingController(text: widget.initialSettings.developerWhatsapp);
    _titleCtrl = TextEditingController(text: widget.initialSettings.developerTitle);
  }

  @override
  void dispose() {
    _domainCtrl.dispose();
    _waCtrl.dispose();
    _titleCtrl.dispose();
    _curPwdCtrl.dispose();
    _newPwdCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    setState(() {
      _savingSettings = true;
      _statusMsg = null;
      _isError = false;
    });

    var cleanDomain = _domainCtrl.text.trim();
    if (cleanDomain.endsWith('/')) {
      cleanDomain = cleanDomain.substring(0, cleanDomain.length - 1);
    }
    final cleanWa = _waCtrl.text.trim();
    final digits = cleanWa.replaceAll(RegExp(r'[^\d]'), '');
    final waNum = digits.startsWith('01') ? '2$digits' : digits;

    final updated = PlatformSettings(
      developerWhatsapp: cleanWa.isEmpty ? '01550523365' : cleanWa,
      developerContactUrl: 'https://wa.me/$waNum',
      developerTitle: _titleCtrl.text.trim().isEmpty ? 'تواصل مع المطور' : _titleCtrl.text.trim(),
      supportMessage: widget.initialSettings.supportMessage,
      publicDomainUrl: cleanDomain.isEmpty ? 'https://smart-card-inky.vercel.app' : cleanDomain,
    );

    final ok = await FirestoreService.updatePlatformSettings(updated);
    if (!mounted) return;
    setState(() {
      _savingSettings = false;
      _isError = !ok;
      _statusMsg = ok ? 'تم حفظ إعدادات الدومين والتواصل في قاعدة البيانات بنجاح.' : 'تعذر حفظ الإعدادات.';
    });
    if (ok) {
      widget.onSettingsUpdated(updated);
    }
  }

  Future<void> _changePassword() async {
    setState(() {
      _savingPwd = true;
      _statusMsg = null;
      _isError = false;
    });
    final res = await AuthService.changeAdminPassword(_curPwdCtrl.text, _newPwdCtrl.text);
    if (!mounted) return;
    setState(() {
      _savingPwd = false;
      _isError = !res.success;
      _statusMsg = res.message;
      if (res.success) {
        _curPwdCtrl.clear();
        _newPwdCtrl.clear();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121216),
        foregroundColor: Colors.white,
        title: const Text('إعدادات المنصة والأمان', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card3DEnter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_statusMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _isError ? const Color(0x26EF4444) : const Color(0x2610B981),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _isError ? const Color(0x66EF4444) : const Color(0x6610B981),
                    ),
                  ),
                  child: Text(
                    _statusMsg!,
                    style: TextStyle(
                      color: _isError ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Domain & Contact Settings
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF121216),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x4DF59E0B)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'إعدادات الدومين ورابط البطاقات',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFFFBBF24)),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _domainCtrl,
                      textDirection: TextDirection.ltr,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'الدومين الأساسي للبطاقات',
                        labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
                        filled: true,
                        fillColor: Colors.black54,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _waCtrl,
                      textDirection: TextDirection.ltr,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'رقم واتساب المطور',
                        labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
                        filled: true,
                        fillColor: Colors.black54,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _savingSettings ? null : _saveSettings,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFBBF24),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: Text(
                          _savingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات المنصة',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Password Change
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF121216),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'تغيير كلمة مرور الأدمن',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFFFBBF24)),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _curPwdCtrl,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'كلمة المرور الحالية',
                        labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
                        filled: true,
                        fillColor: Colors.black54,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _newPwdCtrl,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'كلمة المرور الجديدة',
                        labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
                        filled: true,
                        fillColor: Colors.black54,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _savingPwd ? null : _changePassword,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white10,
                          foregroundColor: const Color(0xFFFCD34D),
                          side: const BorderSide(color: Color(0x4DF59E0B)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: Text(
                          _savingPwd ? 'جاري التحديث...' : 'تحديث كلمة المرور في السحابة',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
