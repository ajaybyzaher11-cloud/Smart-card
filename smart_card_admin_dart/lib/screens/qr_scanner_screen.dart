import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../utils/deep_links.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _checkingPermission = true;
  bool _hasPermission = false;
  bool _permanentlyDenied = false;
  bool _handledScan = false;
  bool _torchOn = false;
  String? _statusMsg;

  @override
  void initState() {
    super.initState();
    _requestCameraPermission();
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _requestCameraPermission() async {
    setState(() {
      _checkingPermission = true;
      _statusMsg = null;
    });

    final status = await Permission.camera.request();
    if (!mounted) return;

    setState(() {
      _checkingPermission = false;
      _hasPermission = status.isGranted;
      _permanentlyDenied = status.isPermanentlyDenied;
      if (!status.isGranted) {
        _statusMsg = 'تم رفض إذن الكاميرا — يمكنك منح الإذن الآن لمسح الرمز مباشرة.';
      }
    });
  }

  void _onRawQrDetected(String rawValue) {
    if (_handledScan) return;
    final extracted = extractQrIdFromUrl(rawValue);
    if (extracted != null && extracted.isNotEmpty) {
      _handledScan = true;
      Navigator.of(context).pop(extracted);
    }
  }

  Future<void> _pickImageAndDecode() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;

    final capture = await _scannerController.analyzeImage(file.path);
    if (!mounted) return;

    if (capture != null && capture.barcodes.isNotEmpty) {
      for (final b in capture.barcodes) {
        final raw = b.rawValue;
        if (raw != null && raw.isNotEmpty) {
          final id = extractQrIdFromUrl(raw);
          if (id != null) {
            Navigator.of(context).pop(id);
            return;
          }
        }
      }
    }

    setState(() {
      _statusMsg = 'لم يتم العثور على رمز QR صالح داخل الصورة المختارة.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121216),
        foregroundColor: Colors.white,
        title: const Text(
          'مسح رمز QR بالكاميرا',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        actions: [
          if (_hasPermission)
            IconButton(
              icon: Icon(
                _torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                color: const Color(0xFFFBBF24),
              ),
              onPressed: () async {
                await _scannerController.toggleTorch();
                setState(() => _torchOn = !_torchOn);
              },
              tooltip: 'الفلاش',
            ),
          IconButton(
            icon: const Icon(Icons.photo_library_rounded, color: Color(0xFFFBBF24)),
            onPressed: _pickImageAndDecode,
            tooltip: 'مسح صورة من المعرض',
          ),
        ],
      ),
      body: _checkingPermission
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFFBBF24)),
            )
          : !_hasPermission
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF121216),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0x4DF59E0B)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              color: const Color(0x1AF59E0B),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0x4DF59E0B)),
                            ),
                            child: const Icon(Icons.camera_alt_rounded, color: Color(0xFFFBBF24), size: 34),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'إذن الكاميرا لمسح الرمز',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _statusMsg ?? 'اختر السماح باستخدام الكاميرا لمسح أي رمز Smart Card وتعديله فوراً.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12.5, color: Colors.white70),
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton.icon(
                              onPressed: _permanentlyDenied ? openAppSettings : _requestCameraPermission,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFFBBF24),
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: const Icon(Icons.camera_enhance_rounded),
                              label: Text(
                                _permanentlyDenied ? 'فتح إعدادات الإذن' : 'إعطاء إذن الكاميرا الآن',
                                style: const TextStyle(fontWeight: FontWeight.w900),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: OutlinedButton.icon(
                              onPressed: _pickImageAndDecode,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFFCD34D),
                                side: const BorderSide(color: Color(0x4DF59E0B)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: const Icon(Icons.upload_rounded),
                              label: const Text('أو اختيار صورة QR من المعرض', style: TextStyle(fontWeight: FontWeight.w700)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : Stack(
                  children: [
                    MobileScanner(
                      controller: _scannerController,
                      onDetect: (capture) {
                        for (final barcode in capture.barcodes) {
                          final raw = barcode.rawValue;
                          if (raw != null && raw.isNotEmpty) {
                            _onRawQrDetected(raw);
                            break;
                          }
                        }
                      },
                    ),
                    Center(
                      child: Container(
                        width: 240,
                        height: 240,
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFFBBF24), width: 3),
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    ),
                    if (_statusMsg != null)
                      Positioned(
                        bottom: 24,
                        left: 20,
                        right: 20,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0x66EF4444)),
                          ),
                          child: Text(
                            _statusMsg!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                          ),
                        ),
                      ),
                  ],
                ),
    );
  }
}
