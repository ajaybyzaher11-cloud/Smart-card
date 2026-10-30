import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import jsQR from 'jsqr';
import { extractQrIdFromUrl } from '../lib/qrService';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScannedId: (id: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScannedId }: QrScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setErrorMsg('تعذر الوصول إلى الكاميرا. يرجى التحقق من الأذونات أو استخدام فحص الصور.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanVideoFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.15)] border border-amber-500/30 overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Camera className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                كاميرا مسح الـ QR (Live Scanner)
              </h2>
              <p className="text-xs text-slate-400">وجّه الكاميرا نحو كود الـ QR للتعرف التلقائي</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewer */}
        <div className="p-6 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[320px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-amber-500/20 flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />

            {/* Scanning Laser Line */}
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

          {errorMsg && (
            <div className="mt-4 p-3 bg-amber-500/15 border border-amber-400/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4 text-center">
            يتم فحص الكود تلقائياً في أجزاء من الثانية بمجرد ظهور الرمز في المربع
          </p>
        </div>
      </div>
    </div>
  );
}
