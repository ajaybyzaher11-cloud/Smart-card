import { useState, useRef, DragEvent } from 'react';
import { Upload, Search, AlertCircle, CheckCircle2, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { decodeQrFromImageFile, extractQrIdFromUrl, getQrCode } from '../lib/qrService';
import { QrCodeRecord } from '../types/qr';

interface UploadQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeFound: (record: QrCodeRecord) => void;
}

export function UploadQrModal({ isOpen, onClose, onCodeFound }: UploadQrModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Create thumbnail preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      const decodedText = await decodeQrFromImageFile(file);
      if (!decodedText) {
        setErrorMsg('تعذر قراءة رمز QR من الصورة المرفوعة. تأكد من وضوح الصورة وتوسط الرمز.');
        setLoading(false);
        return;
      }

      const extractedId = extractQrIdFromUrl(decodedText);
      if (!extractedId) {
        setErrorMsg(`تم فك الرمز (${decodedText}) ولكن لم يتم العثور على معرّف ID صالح.`);
        setLoading(false);
        return;
      }

      // Query database
      const record = await getQrCode(extractedId);
      if (!record) {
        setErrorMsg(`تم استخراج المعرّف [${extractedId}] ولكن الكود غير موجود بقاعدة البيانات.`);
        setLoading(false);
        return;
      }

      // Found! Pass record to parent
      setLoading(false);
      onCodeFound(record);
      onClose();
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMsg('حدث خطأ أثناء معالجة الصورة.');
      setLoading(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualId.trim();
    if (!cleanId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const record = await getQrCode(cleanId);
      if (!record) {
        setErrorMsg(`لم يتم العثور على أي كود بالمعرّف "${cleanId}".`);
        setLoading(false);
        return;
      }
      setLoading(false);
      onCodeFound(record);
      onClose();
    } catch {
      setErrorMsg('تعذر البحث عن الكود.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setErrorMsg(null);
    setManualId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.15)] border border-amber-500/30 overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Upload className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                فحص وتعديل رمز الـ QR (رفع صورة)
              </h2>
              <p className="text-xs text-slate-400">ارفع صورة الكود لفك تشفيره أوتوماتيكياً واستدعاء بياناته</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drag & Drop Box */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[190px] ${
                isDragging
                  ? 'border-violet-600 bg-violet-50/70 scale-[0.99]'
                  : 'border-slate-300 hover:border-violet-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-violet-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-bold">جاري قراءة وفك تشفير الـ QR Code...</p>
                  <p className="text-xs text-slate-500">تحليل مصفوفة البيكسلات واستخراج المعرّف</p>
                </div>
              ) : imagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <span className="text-xs text-violet-700 font-semibold underline">انقر لاختيار صورة أخرى</span>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">اسحب وأفلت صورة الـ QR هنا</p>
                  <p className="text-xs text-slate-500 mt-1">أو انقر لتصفح واختيار صورة من جهازك (PNG, JPG, WEBP)</p>
                  <span className="mt-3 inline-block px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-violet-700 shadow-2xs">
                    فك تشفير فوري بـ jsQR
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">تنبيه:</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs font-semibold text-slate-400">
              أو استخدم البحث المباشر
            </span>
          </div>

          {/* Manual ID Input */}
          <form onSubmit={handleManualSearch} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              كتابة المعرّف (ID) يدوياً كخيار بديل:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="مثال: V1StGXR8_Z"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !manualId.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition"
              >
                <Search className="w-4 h-4" />
                بحث وجلب
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
