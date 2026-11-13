import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Ban,
  Settings,
} from 'lucide-react';
import jsQR from 'jsqr';
import { extractQrIdFromUrl } from '../lib/qrService';

type ScannerStep = 'choice' | 'requesting' | 'scanning' | 'denied' | 'unsupported';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScannedId: (id: string) => void;
  mode?: 'customer' | 'admin';
  onDeclined?: () => void;
  onUploadFallback?: () => void;
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScannedId,
  mode = 'customer',
  onDeclined,
  onUploadFallback,
}: QrScannerModalProps) {
  const [step, setStep] = useState<ScannerStep>('choice');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        const id = extractQrIdFromUrl(code.data);
        if (id) {
          stopCamera();
          onScannedId(id);
          onClose();
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [onClose, onScannedId, stopCamera]);

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStep('unsupported');
      setErrorMsg('المتصفح الحالي لا يدعم تشغيل الكاميرا مباشرة أو الموقع لا يعمل عبر HTTPS. يمكنك رفع صورة الرمز بدلاً من ذلك.');
      return;
    }

    setStep('requesting');

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (innerErr: any) {
        if (innerErr?.name === 'OverconstrainedError' || innerErr?.name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          throw innerErr;
        }
      }

      streamRef.current = stream;
      setStep('scanning');
      setIsScanning(true);

      // Attach stream after React mounts videoRef in 'scanning' step
      requestAnimationFrame(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
          scanVideoFrame();
        }
      });
    } catch (err: any) {
      console.warn('Camera access error:', err);
      stopCamera();
      const errName = err?.name || '';
      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError'
      ) {
        setStep('denied');
        setErrorMsg('تم رفض إذن استخدام الكاميرا من المتصفح. يمكنك إعادة المحاولة لمنح الإذن أو تفعيله من إعدادات المتصفح.');
      } else {
        setStep('denied');
        setErrorMsg('تعذر تشغيل الكاميرا. تأكد من عدم استخدامها في تطبيق آخر أو جرّب إعادة طلب الإذن.');
      }
    }
  }, [scanVideoFrame, stopCamera]);

  // Whenever modal opens, check permission status:
  // If browser permission is ALREADY 'granted', start scanning immediately;
  // otherwise ALWAYS present the explicit permission choice screen first ('choice')!
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const initScanner = async () => {
      setErrorMsg(null);
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (!cancelled && status.state === 'granted') {
            startCamera();
            return;
          }
        }
      } catch {
        // Fallback: browser doesn't support permissions.query for camera (e.g. Safari)
      }
      if (!cancelled) {
        setStep('choice');
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleDeclineChoice = () => {
    stopCamera();
    onDeclined?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.18)] border border-amber-500/30 overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Camera className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                {mode === 'admin' ? 'كاميرا الأدمن لمسح الرمز' : 'مسح الرمز بالكاميرا'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {step === 'choice'
                  ? 'إذن الوصول إلى كاميرا الهاتف'
                  : step === 'denied'
                  ? 'لم يتم تفعيل إذن الكاميرا بعد'
                  : 'وجّه الكاميرا نحو كود الـ QR للتعرف التلقائي'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center">
          {/* STEP 1: Explicit Camera Permission Choice */}
          {step === 'choice' && (
            <div className="w-full space-y-5 text-center animate-in fade-in duration-200">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.15)]">
                <Camera className="w-10 h-10 text-amber-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-white">
                  هل تسمح باستخدام الكاميرا لمسح الرمز؟
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {mode === 'admin'
                    ? 'أنت داخل لوحة الأدمن: يرجى الموافقة على إذن الكاميرا لمسح البطاقة وفتح صفحة التعديل الفوري. يتم استخدام الكاميرا للمسح اللحظي فقط ولا يتم حفظ أي صور.'
                    : 'يتطلب مسح رمز الـ QR تشغيل كاميرا الجهاز مؤقتاً لقراءة الرمز فقط دون التقاط أو حفظ أي صور.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-right text-[11px] text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>يمكنك الموافقة الآن أو الرفض والاختيار لاحقاً في أي وقت.</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>السماح باستخدام الكاميرا</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeclineChoice}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Ban className="w-4 h-4 text-slate-400" />
                  <span>رفض الآن (سيظل خيار المسح متاحاً)</span>
                </button>

                {onUploadFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onUploadFallback();
                    }}
                    className="w-full py-2.5 px-4 text-amber-300 hover:text-amber-200 hover:bg-amber-400/10 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>أو رفع صورة رمز QR من الجهاز</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Requesting Permission */}
          {step === 'requesting' && (
            <div className="w-full py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-white">جاري طلب إذن الكاميرا...</p>
                <p className="text-xs text-slate-400">اضغط على "سماح" (Allow) في نافذة المتصفح بالأعلى</p>
              </div>
            </div>
          )}

          {/* STEP 3: Active Camera Scanner */}
          {step === 'scanning' && (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[320px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-amber-500/20 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />

                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-56 border-2 border-amber-400/80 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400" />
                      <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_15px_#f59e0b] animate-bounce mt-24" />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-4 text-center">
                يتم فحص الكود تلقائياً في أجزاء من الثانية بمجرد ظهور الرمز في المربع
              </p>
            </div>
          )}

          {/* STEP 4: Permission Denied or Unsupported — Re-choice & Recovery */}
          {(step === 'denied' || step === 'unsupported') && (
            <div className="w-full space-y-4 text-center animate-in fade-in duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">
                  {step === 'unsupported' ? 'الكاميرا غير مدعومة هنا' : 'تم رفض إذن الكاميرا'}
                </h3>
                {errorMsg && (
                  <p className="text-xs text-amber-200/90 leading-relaxed">{errorMsg}</p>
                )}
              </div>

              {step === 'denied' && (
                <div className="p-3.5 bg-black/50 border border-amber-500/20 rounded-2xl text-right space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Settings className="w-3.5 h-3.5" />
                    <span>في حال استمر الحظر من المتصفح:</span>
                  </div>
                  <p>1. اضغط على علامة القفل أو الإعدادات بجانب رابط الموقع في الأعلى.</p>
                  <p>2. فعّل خيار الكاميرا (Camera → Allow / سماح) ثم اضغط "إعادة طلب إذن الكاميرا".</p>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                {step === 'denied' && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-black" />
                    <span>إعادة طلب إذن الكاميرا الآن</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep('choice');
                  }}
                  className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs rounded-2xl transition cursor-pointer"
                >
                  العودة لاختيار إذن الكاميرا
                </button>

                {onUploadFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onUploadFallback();
                    }}
                    className="w-full py-2.5 px-4 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة الرمز بدلاً من الكاميرا</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeclineChoice}
                  className="w-full py-2 text-slate-400 hover:text-white text-[11px] font-bold transition cursor-pointer"
                >
                  إغلاق (سيظهر خيار المسح بالكاميرا مجدداً)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
