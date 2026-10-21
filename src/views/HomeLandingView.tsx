import { useState, useRef, useEffect } from 'react';
import { 
  QrCode as QrIcon, 
  Smartphone, 
  Camera, 
  Upload, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Lock,
  Building2,
  Wallet,
  MessageSquare,
  AlertCircle,
  Loader2,
  Phone
} from 'lucide-react';
import { decodeQrFromImageFile, extractQrIdFromUrl, getQrCode, fetchPlatformSettings } from '../lib/qrService';
import { QrScannerModal } from '../components/QrScannerModal';
import { PlatformSettings } from '../types/qr';

interface HomeLandingViewProps {
  onGoToAdmin: () => void;
  onSimulateScan: (id: string) => void;
  domainUrl: string;
}

export function HomeLandingView({ onGoToAdmin, onSimulateScan }: HomeLandingViewProps) {
  const [manualCode, setManualCode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>({
    developer_whatsapp: '01550523365',
    developer_contact_url: 'https://wa.me/201550523365',
    developer_title: 'تواصل مع المطور',
    support_message: 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlatformSettings().then((s) => {
      if (s) setSettings(s);
    });
  }, []);

  // Submit manual card ID
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualCode.trim();
    if (!cleanId) {
      setFeedbackMsg({ type: 'error', text: 'يرجى كتابة كود البطاقة أولاً' });
      return;
    }

    setFeedbackMsg(null);
    try {
      const record = await getQrCode(cleanId);
      if (record) {
        window.location.href = `/q/${record.id}`;
      } else {
        setFeedbackMsg({ type: 'error', text: `كود البطاقة "${cleanId}" غير موجود أو غير صحيح.` });
      }
    } catch {
      window.location.href = `/q/${cleanId}`;
    }
  };

  // Upload card/QR photo
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFeedbackMsg({ type: 'error', text: 'يرجى اختيار ملف صورة صالح (PNG أو JPG).' });
      return;
    }

    setIsUploading(true);
    setFeedbackMsg(null);

    try {
      const decodedText = await decodeQrFromImageFile(file);
      if (!decodedText) {
        setFeedbackMsg({ type: 'error', text: 'تعذر قراءة رمز QR من الصورة المرفوعة. تأكد من وضوح الصورة وتوسط الرمز.' });
        setIsUploading(false);
        return;
      }

      const extractedId = extractQrIdFromUrl(decodedText);
      if (!extractedId) {
        setFeedbackMsg({ type: 'error', text: 'تم فحص الرمز ولكن لم يتم العثور على كود بطاقة صحيح.' });
        setIsUploading(false);
        return;
      }

      window.location.href = `/q/${extractedId}`;
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: 'حدث خطأ أثناء فحص الصورة. جرب إدخال الكود يدويًا.' });
      setIsUploading(false);
    }
  };

  const getWaLink = () => {
    if (settings.developer_contact_url?.trim()) {
      return settings.developer_contact_url.trim();
    }
    const clean = (settings.developer_whatsapp || '01550523365').replace(/[^\d]/g, '');
    const num = clean.startsWith('01') ? '2' + clean : clean;
    return `https://wa.me/${num}`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col justify-between">
      {/* Top Customer Header */}
      <header className="border-b border-amber-500/20 bg-black/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 font-black">
              <QrIcon className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wide text-white block">
                بوابة البطاقات الذكية الفاخرة
              </span>
              <span className="text-[11px] text-amber-300/80 font-medium font-mono">
                Luxury Smart Card Gateway
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold rounded-xl transition"
              title="تواصل مع المطور"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">تواصل مع المطور</span>
            </a>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-xl transition shadow-md shadow-amber-500/20"
            >
              <Camera className="w-4 h-4 text-black" />
              <span>مسح البطاقة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Customer Portal Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full space-y-10">
        {/* Welcome & Instructions */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            بوابة الفحص والتوجيه الفوري للبطاقات الفاخرة
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            أهلاً بك في بوابة
            <span className="bg-gradient-to-l from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent block mt-1.5">
              البطاقات والرموز الذكية الفاخرة
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            إذا قمت بمسح بطاقتك الذكية أو واجهتك أي مشكلة، يمكنك فحص البطاقة مباشرة بالكاميرا، أو رفع صورتها، أو كتابة كود البطاقة بالأسفل للوصول الفوري لبياناتك وتطبيقاتك.
          </p>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`p-4 rounded-2xl text-xs flex items-center gap-3 animate-in fade-in ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 font-semibold">{feedbackMsg.text}</span>
          </div>
        )}

        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoUpload(file);
          }}
        />

        {/* Quick Customer Action Cards */}
        <div className="bg-[#121216] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(212,175,55,0.08)] backdrop-blur-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Live Camera Scan */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="p-5 rounded-2xl bg-gradient-to-tr from-amber-400/10 via-yellow-500/5 to-transparent hover:from-amber-400/20 hover:to-yellow-500/10 border border-amber-500/30 hover:border-amber-400/60 transition group text-right flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                <Camera className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">مسح فوري بالكاميرا</h3>
                <p className="text-[11px] text-amber-200/70 mt-0.5">افتح كاميرا الهاتف واقرأ البطاقة مباشرة</p>
              </div>
            </button>

            {/* Option 2: Upload Photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 transition group text-right flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-amber-300" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {isUploading ? 'جاري فحص الصورة...' : 'رفع صورة البطاقة'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">من ألبوم الصور أو لقطات الشاشة</p>
              </div>
            </button>
          </div>

          {/* Divider with text */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-amber-500/20" />
            </div>
            <span className="relative bg-[#121216] px-3 text-xs font-semibold text-amber-300/80">
              أو اكتب كود البطاقة المطبوع عليها
            </span>
          </div>

          {/* Option 3: Manual Code Entry */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="اكتب كود البطاقة المطبوع (مثال: k9X2mQp7)"
                  className="w-full px-4 py-3 bg-black/50 border border-amber-500/20 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition text-center sm:text-right"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                فتح البطاقة
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-400">
              تجد الكود مطبوعاً بخط واضح على البطاقة الذكية أسفل رمز الـ QR
            </p>
          </form>
        </div>

        {/* Customer Guidance & Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-[#121216] border border-amber-500/20 rounded-2xl space-y-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">التحويل البنكي المباشر</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              نسخ فوري لرقم الحساب والآيبان IBAN مع إمكانية فتح تطبيق البنك أو InstaPay بضغطة واحدة.
            </p>
          </div>

          <div className="p-4 bg-[#121216] border border-amber-500/20 rounded-2xl space-y-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">محافظ الكاش الإلكترونية</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تحويل سريع عبر فودافون كاش، أورنج، اتصالات، وWE مع كود التحويل السريع المباشر.
            </p>
          </div>

          <div className="p-4 bg-[#121216] border border-amber-500/20 rounded-2xl space-y-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">التواصل المباشر والواتساب</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              فتح محادثات واتساب، صفحات السوشيال ميديا، أو الاتصال الهاتفي فوراً دون الحاجة لتسجيل الرقم.
            </p>
          </div>
        </div>

        {/* Customer FAQ / Help Section with Direct WhatsApp Support Button */}
        <div className="p-6 bg-[#121216] border border-amber-500/20 rounded-3xl text-right space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <HelpCircle className="w-4 h-4" />
              تواجه صعوبة في مسح البطاقة أو تم حذف الكود؟
            </div>

            <a
              href={getWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-black rounded-xl shadow-md hover:from-amber-300 hover:to-amber-400 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>تواصل مع المطور: {settings.developer_whatsapp || '01550523365'}</span>
            </a>
          </div>

          <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>تأكد من تسليط إضاءة كافية على البطاقة وعدم وجود انعكاسات قوية.</li>
            <li>إذا كنت تستخدم كاميرا الهاتف العادية، تأكد من وضوح التركيز (Focus) على رمز الـ QR.</li>
            <li>يمكنك دائماً كتابة الكود المطبوع على البطاقة في الخانة أعلاه للوصول المباشر.</li>
            <li>إذا تم مسح أو إلغاء تفعيل البطاقة، اضغط على زر تواصل مع المطور ليتم حل المشكلة فوراً.</li>
          </ul>
        </div>
      </main>

      {/* Discrete Footer with Subtle Admin Login */}
      <footer className="border-t border-white/5 bg-black/60 py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} بوابة البطاقات والرموز الذكية الفاخرة — جميع الحقوق محفوظة</p>
          
          <button
            onClick={onGoToAdmin}
            className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition text-[11px] py-1 px-2.5 rounded-lg hover:bg-white/5"
            title="تسجيل دخول الإدارة"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>دخول الإدارة</span>
          </button>
        </div>
      </footer>

      {/* Live Camera Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScannedId={(id) => {
          setIsScannerOpen(false);
          window.location.href = `/q/${id}`;
        }}
      />
    </div>
  );
}
