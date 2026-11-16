import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../widgets/three_d_widgets.dart';

class AdminLoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const AdminLoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _controller = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_controller.text.trim().isEmpty || _loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final ok = await AuthService.loginAdmin(_controller.text);
    if (!mounted) return;

    if (ok) {
      widget.onLoginSuccess();
    } else {
      setState(() {
        _loading = false;
        _error = 'كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Card3DEnter(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 420),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF121216),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0x4DF59E0B)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                      blurRadius: 36,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Floating3DLogo(
                      size: 80,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF18181B),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0x66FBBF24)),
                        ),
                        child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0x1AF59E0B),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: const Color(0x4DF59E0B)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shield_rounded, size: 14, color: Color(0xFFFBBF24)),
                          SizedBox(width: 6),
                          Text(
                            'تطبيق الإدارة فقط — Admin Only',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFFCD34D)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Smart Card Admin',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFFBBF24),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'سجّل دخولك لإدارة وتوليد وتعديل رموز QR مباشرة',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12.5, color: Colors.white60),
                    ),
                    const SizedBox(height: 24),
                    if (_error != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0x26EF4444),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0x66EF4444)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Color(0xFFFCA5A5), size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _error!,
                                style: const TextStyle(fontSize: 12, color: Color(0xFFFCA5A5), fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextField(
                      controller: _controller,
                      obscureText: _obscure,
                      onSubmitted: (_) => _submit(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                      decoration: InputDecoration(
                        labelText: 'كلمة مرور الإدارة',
                        labelStyle: const TextStyle(color: Color(0xFFFCD34D), fontSize: 13),
                        hintText: 'أدخل كلمة المرور',
                        hintStyle: const TextStyle(color: Colors.white38),
                        filled: true,
                        fillColor: Colors.black54,
                        prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFFFBBF24)),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscure ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                            color: Colors.white54,
                          ),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0x4DF59E0B)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0x33F59E0B)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFFBBF24), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _loading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFBBF24),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 6,
                        ),
                        icon: _loading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                              )
                            : const Icon(Icons.login_rounded),
                        label: Text(
                          _loading ? 'جاري التحقق...' : 'دخول لوحة الإدارة',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
