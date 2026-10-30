import { useState, useRef, DragEvent } from 'react';
import { Upload, Search, AlertCircle, Loader2, X, Image as ImageIcon, Sparkles, PlusCircle } from 'lucide-react';
import { decodeQrFromImageFile, extractQrIdFromUrl, lookupExistingQrCode, getQrCode } from '../lib/qrService';
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
  const [notFoundId, setNotFoundId] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process uploaded image file
  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setNotFoundId(null);

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
      const cleanId = extractedId || decodedText.trim();

      // Query database
      const record = await lookupExistingQrCode(cleanId);
      if (!record) {
        setNotFoundId(cleanId);
        setErrorMsg(`تم استخراج المعرّف [${cleanId}] ولكن الكود غير مسجل بقاعدة البيانات.`);
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

  // Search by manual ID
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    let raw = manualId.trim();
    if (!raw) return;

    // Handle full URL pasted
    const extracted = extractQrIdFromUrl(raw);
    const cleanId = extracted || raw;

    setLoading(true);
    setErrorMsg(null);
    setNotFoundId(null);

    try {
      const record = await lookupExistingQrCode(cleanId);
      if (!record) {
        setNotFoundId(cleanId);
        setErrorMsg(`لم يتم العثور على أي كود بالمعرّف "${cleanId}".`);
        setLoading(false);
        return;
      }
      setLoading(false);
      onCodeFound(record);
      onClose();
    } catch (err) {
      console.error('Search error:', err);
      // Fallback
      try {
        const fallbackRecord = await getQrCode(cleanId);
        if (fallbackRecord) {
          setLoading(false);
          onCodeFound(fallbackRecord);
          onClose();
          return;
        }
      } catch {}
      setErrorMsg('تعذر البحث عن الكود، يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  // Create & Edit new card on the fly if not found
  const handleCreateAndEdit = () => {
    if (!notFoundId) return;
    const newRecord: QrCodeRecord = {
      id: notFoundId,
      is_active: false,
      target_url: null,
      created_at: new Date().toISOString(),
      total_scans: 0,
      subscription_months: 1,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    onCodeFound(newRecord);
    onClose();
  };

  const handleReset = () => {
    setImagePreview(null);
    setErrorMsg(null);
    setNotFoundId(null);
    setManualId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-amber-500/30 overflow-hidden flex flex-col text-white">
        
        {/* Ambient gold glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-black/60 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Upload className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                فحص وتعديل رمز الـ QR (رفع صورة أو بحث برقم الكارت)
              </h2>
              <p className="text-xs text-slate-400">ابحث برقم الكارت أو ارفع الصورة لجلب الكارت وتعديل بياناته واشتراكه</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 relative z-10">
          
          {/* Section 1: Drag & Drop Photo Area */}
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
              className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[170px] ${
                isDragging
                  ? 'border-amber-400 bg-amber-400/10 scale-[0.99]'
                  : 'border-amber-500/30 hover:border-amber-400/70 bg-black/50 hover:bg-[#15151c]'
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-amber-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-bold text-amber-200">جاري قراءة وفك تشفير الـ QR Code...</p>
                  <p className="text-xs text-slate-400">تحليل مصفوفة الرمز واستخراج رقم الكارت</p>
                </div>
              ) : imagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-contain rounded-xl border border-amber-500/30 bg-white p-1.5 shadow-lg"
                  />
                  <span className="text-xs text-amber-300 font-bold underline">انقر لاختيار صورة أخرى</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-2.5">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-black text-slate-100">اسحب وأفلت صورة الـ QR هنا</p>
                  <p className="text-xs text-slate-400 mt-1">أو انقر لتصفح واختيار صورة من جهازك (PNG, JPG, WEBP)</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full text-[11px] font-bold text-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>فك تشفير فوري واستدعاء الكارت</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-500/15 border border-rose-500/35 rounded-2xl text-xs text-rose-300 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
              {notFoundId && (
                <button
                  type="button"
                  onClick={handleCreateAndEdit}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black rounded-xl text-[11px] flex items-center gap-1 shadow-md hover:from-amber-300 hover:to-amber-400 flex-shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>تسجيل هذا الكود وتعديله الآن</span>
                </button>
              )}
            </div>
          )}

          {/* Divider with High-Contrast Label */}
          <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-amber-500/25" />
            </div>
            <span className="relative bg-[#0e0e12] px-4 text-xs font-black text-amber-400 tracking-wide">
              أو اكتب رقم الكارت مباشرة (ID)
            </span>
          </div>

          {/* Section 2: Manual ID Input with Pristine High-Contrast Colors */}
          <form onSubmit={handleManualSearch} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-200/90">
                أدخل معرّف أو رقم الكارت (ID):
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                مثال: I9pFBZwn8Y
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="اكتب رقم الكارت هنا... مثل I9pFBZwn8Y"
                  value={manualId}
                  onChange={(e) => {
                    setManualId(e.target.value);
                    setErrorMsg(null);
                    setNotFoundId(null);
                  }}
                  className="w-full px-4 py-3 bg-black/80 border-2 border-amber-500/40 rounded-2xl text-amber-300 text-base font-mono font-black placeholder-slate-500 focus:bg-black focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-400/20 shadow-inner transition text-center sm:text-left selection:bg-amber-400 selection:text-black"
                  dir="ltr"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !manualId.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-black text-xs font-black rounded-2xl shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-95 flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Search className="w-4 h-4 text-black" />
                )}
                <span>بحث وجلب الكارت</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-right">
              بمجرد النقر على "بحث وجلب الكارت" سيتم فتح نافذة التعديل مباشرة لتجديد الاشتراك، تعديل الرابط، أو تغيير المنصة.
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}
