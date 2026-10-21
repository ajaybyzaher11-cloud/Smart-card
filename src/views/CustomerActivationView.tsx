import { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  Instagram, 
  Facebook, 
  CreditCard, 
  Phone, 
  Send, 
  Video, 
  Globe, 
  AlertTriangle,
  Loader2, 
  Building2, 
  Wallet 
} from 'lucide-react';
import { activateQrCode } from '../lib/qrService';
import { encodeBankDetails, processSmartLink } from '../lib/deepLinks';
import { AppType, QrCodeRecord } from '../types/qr';

interface CustomerActivationViewProps {
  qrId: string;
  onActivated: (updatedRecord: QrCodeRecord) => void;
}

export function CustomerActivationView({ qrId, onActivated }: CustomerActivationViewProps) {
  const [selectedType, setSelectedType] = useState<AppType>('whatsapp');
  const [rawInput, setRawInput] = useState('');
  const [bankName, setBankName] = useState('البنك الأهلي المصري (NBE)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activatedRecord, setActivatedRecord] = useState<QrCodeRecord | null>(null);

  const platforms: Array<{ type: AppType; label: string; icon: any; placeholder: string; example: string }> = [
    { 
      type: 'whatsapp', 
      label: 'واتساب', 
      icon: MessageSquare, 
      placeholder: '01012345678 أو 2010...', 
      example: 'أدخل رقم الواتساب، وسيفتح محادثتك فوراً عند مسح الكارت' 
    },
    { 
      type: 'bank', 
      label: 'حساب بنكي', 
      icon: Building2, 
      placeholder: 'رقم الحساب البنكي', 
      example: 'يعرض بطاقة بنكية رسمية للمسح مع زر لنسخ رقم الحساب فوراً' 
    },
    { 
      type: 'instapay', 
      label: 'إنستاباي', 
      icon: CreditCard, 
      placeholder: 'username@instapay أو رابط الدفع', 
      example: 'رابط التحويل السريع أو المعرّف الخاص بك في InstaPay' 
    },
    { 
      type: 'wallet', 
      label: 'محفظة كاش', 
      icon: Wallet, 
      placeholder: '01012345678', 
      example: 'رقم محفظة فودافون كاش أو اتصالات أو أورنج لتحويل الأموال' 
    },
    { 
      type: 'instagram', 
      label: 'إنستجرام', 
      icon: Instagram, 
      placeholder: '@your_username أو رابط الحساب', 
      example: 'اكتب اسم حسابك وسيتم فتح تطبيق إنستجرام على صفحتك مباشرة' 
    },
    { 
      type: 'facebook', 
      label: 'فيسبوك', 
      icon: Facebook, 
      placeholder: 'رابط صفحتك أو حسابك على فيسبوك', 
      example: 'مثال: https://facebook.com/yourpage' 
    },
    { 
      type: 'phone', 
      label: 'اتصال هاتفي', 
      icon: Phone, 
      placeholder: '01012345678 أو +20...', 
      example: 'يفتح شاشة الاتصال مباشرة على هاتف العميل برقمك' 
    },
    { 
      type: 'telegram', 
      label: 'تيليجرام', 
      icon: Send, 
      placeholder: '@username أو t.me/...', 
      example: 'يفتح تطبيق تيليجرام للتواصل المباشر' 
    },
    { 
      type: 'tiktok', 
      label: 'تيك توك', 
      icon: Video, 
      placeholder: '@username أو رابط تيك توك', 
      example: 'يفتح تطبيق تيك توك على ملفك الشخصي' 
    },
    { 
      type: 'website', 
      label: 'موقع ويب', 
      icon: Globe, 
      placeholder: 'https://yourwebsite.com', 
      example: 'أي رابط ويب ترغب في توجيه العملاء إليه (متجر، قائمة طعام، إلخ)' 
    },
  ];

  const currentPlatformInfo = platforms.find((p) => p.type === selectedType) || platforms[0];

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    let valueToSave = rawInput.trim();
    if (selectedType === 'bank') {
      if (!accountNumber.trim()) {
        setErrorMsg('يرجى كتابة رقم الحساب البنكي.');
        return;
      }
      valueToSave = encodeBankDetails({
        bankName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });
    } else {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال الرابط أو البيانات المطلوبة لتفعيل الكارت.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);

    const smartLink = processSmartLink(valueToSave, selectedType);
    const destinationUrl = smartLink.schemeUrl || smartLink.fallbackUrl;

    try {
      const res = await activateQrCode(qrId, valueToSave, selectedType);

      // 1. If bank or wallet: show the bank account / wallet details card
      if (selectedType === 'bank' || selectedType === 'wallet') {
        if (res.record) {
          setActivatedRecord(res.record);
          setTimeout(() => {
            onActivated(res.record!);
          }, 400);
        }
        return;
      }

      // 2. For WhatsApp, Instagram, Facebook, Phone, Website, Telegram, etc.:
      // Direct instant redirection!
      if (destinationUrl) {
        window.location.href = destinationUrl;
      } else if (res.record) {
        onActivated(res.record);
      }
    } catch (err) {
      console.error('Activation failed:', err);
      if (destinationUrl && selectedType !== 'bank' && selectedType !== 'wallet') {
        window.location.href = destinationUrl;
      } else {
        setErrorMsg('حدث خطأ أثناء تفعيل الكارت، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      <div className="w-full max-w-lg relative z-10">
        {!activatedRecord ? (
          <div className="bg-[#121216] border border-amber-500/30 rounded-3xl p-5 sm:p-8 shadow-[0_0_40px_rgba(212,175,55,0.12)] space-y-6">
            {/* Clean Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                تفعيل الكارت الذكي الفاخر لأول مرة
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                تفعيل كارتك الذكي
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                اختر التطبيق أو المنصة التي ترغب في ربطها بهذا الكارت (اختيار واحد فقط).
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleActivate} className="space-y-6">
              {/* Step 1: Platform Selection (Strict Single Select) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-amber-200/90">
                  1. اختر المنصة أو البنك:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {platforms.map((p) => {
                    const IconComponent = p.icon;
                    const isSelected = selectedType === p.type;
                    return (
                      <button
                        key={p.type}
                        type="button"
                        onClick={() => setSelectedType(p.type)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all gap-1.5 cursor-pointer relative ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black border-amber-300 shadow-lg shadow-amber-500/25 font-black ring-2 ring-amber-400/50'
                            : 'bg-[#181820] text-slate-300 border-amber-500/15 hover:bg-[#20202a] hover:border-amber-400/30 hover:text-white'
                        }`}
                      >
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        <span className="text-[11px] truncate w-full text-center">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Dynamic Input Field */}
              {selectedType === 'bank' ? (
                <div className="p-4 bg-black/50 border border-amber-500/20 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-200/90">اسم البنك:</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#09090b] border border-amber-500/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="البنك الأهلي المصري (NBE)">البنك الأهلي المصري (NBE)</option>
                      <option value="بنك مصر (Banque Misr)">بنك مصر (Banque Misr)</option>
                      <option value="البنك التجاري الدولي (CIB)">البنك التجاري الدولي (CIB)</option>
                      <option value="بنك قطر الوطني (QNB)">بنك قطر الوطني (QNB)</option>
                      <option value="بنك القاهرة (Banque du Caire)">بنك القاهرة (Banque du Caire)</option>
                      <option value="بنك الإسكندرية (AlexBank)">بنك الإسكندرية (AlexBank)</option>
                      <option value="بنك فيصل الإسلامي">بنك فيصل الإسلامي</option>
                      <option value="بنك آخر">بنك آخر</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-200/90">رقم الحساب البنكي (إلزامي):</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="مثال: 12345678901234"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      dir="ltr"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-200/90">اسم صاحب الحساب (اختياري):</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="مثال: أحمد محمد علي"
                      className="w-full px-3.5 py-2 bg-black/60 border border-amber-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-amber-200/90">
                    2. أدخل بيانات {currentPlatformInfo.label}:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder={currentPlatformInfo.placeholder}
                      className="w-full px-4 py-3.5 bg-black/50 border border-amber-500/20 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                      dir="ltr"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    💡 {currentPlatformInfo.example}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (selectedType === 'bank' ? !accountNumber.trim() : !rawInput.trim())}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                    <span>جاري تفعيل الكارت...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-black" />
                    <span>تأكيد وتفعيل الكارت الآن 🚀</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Celebration View */
          <div className="bg-[#121216] border border-amber-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <CheckCircle2 className="w-8 h-8 animate-pulse text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                تم تفعيل كارتك بنجاح 🎉
              </h2>
              <p className="text-xs text-slate-300">
                جاري نقلك إلى شاشة الكارت المباشرة الآن...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
