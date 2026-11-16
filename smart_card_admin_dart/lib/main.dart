import 'package:flutter/material.dart';
import 'screens/admin_dashboard_screen.dart';
import 'screens/admin_login_screen.dart';
import 'services/auth_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmartCardAdminApp());
}

class SmartCardAdminApp extends StatefulWidget {
  const SmartCardAdminApp({super.key});

  @override
  State<SmartCardAdminApp> createState() => _SmartCardAdminAppState();
}

class _SmartCardAdminAppState extends State<SmartCardAdminApp> {
  bool _checkingAuth = true;
  bool _authenticated = false;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final authed = await AuthService.isAdminAuthenticated();
    if (!mounted) return;
    setState(() {
      _authenticated = authed;
      _checkingAuth = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Card Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF09090B),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF59E0B),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: _checkingAuth
          ? const Scaffold(
              backgroundColor: Color(0xFF09090B),
              body: Center(
                child: CircularProgressIndicator(color: Color(0xFFFBBF24)),
              ),
            )
          : _authenticated
              ? AdminDashboardScreen(
                  onLogout: () => setState(() => _authenticated = false),
                )
              : AdminLoginScreen(
                  onLoginSuccess: () => setState(() => _authenticated = true),
                ),
    );
  }
}
