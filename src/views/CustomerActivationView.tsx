import { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Loader2, 
  Building2, 
  Wallet,
  ArrowRight,
  Check
} from 'lucide-react';
import { activateQrCode } from '../lib/qrService';
import { 
  encodeBankDetails, 
  processSmartLink, 
  triggerSmartRedirect, 
  detectWalletInfo, 
  isQuickPayUrl,
  formatTikTokTargetUrl,
  formatInstagramTargetUrl,
  formatTelegramTargetUrl,
  formatSnapchatTargetUrl
} from '../lib/deepLinks';
import { AppType, QrCodeRecord } from '../types/qr';
import { PlatformBrandIcon, WalletProviderIcon } from '../components/BrandIcons';

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

  const platforms: Array<{ type: AppType; label: string; placeholder: string; example: string }> = [
    { 
      type: 'whatsapp', 
      label: 'واتساب', 
      placeholder: '01012345678 أو 2010...', 
      example: 'أدخل رقم الواتساب، وسيفتح محادثتك فوراً عند مسح الكارت' 
    },
    { 
      type: 'instapay', 
      label: 'إنستاباي', 
      placeholder: 'https://ipn.eg/S/... (رابط الدفع السريع فقط)', 
      example: 'انسخ رابط الدفع السريع من تطبيق إنستاباي (اطلب دفع > مشاركة الرابط) والصقه هنا ليفتح للعميل صفحة الدفع في التطبيق فوراً.' 
    },
    { 
      type: 'wallet', 
      label: 'محفظة كاش', 
      placeholder: '010... أو 012... أو رابط الدفع السريع https://...', 
      example: 'أدخل رابط الدفع السريع للتحويل الفوري، أو رقم هاتف المحفظة (فودافون، أورانج، اتصالات، وي) لعرض بطاقة التحويل الفاخرة مع اللوجو وزر النسخ.' 
    },
    { 
      type: 'bank', 
      label: 'حساب بنكي', 
      placeholder: 'رقم الحساب البنكي', 
      example: 'يعرض بطاقة بنكية رسمية للمسح مع زر لنسخ رقم الحساب فوراً' 
    },
    { 
      type: 'instagram', 
      label: 'إنستجرام', 
      placeholder: '@your_username أو رابط الحساب', 
      example: 'اكتب اسم حسابك وسيتم فتح تطبيق إنستجرام على صفحتك مباشرة' 
    },
    { 
      type: 'facebook', 
      label: 'فيسبوك', 
      placeholder: 'رابط صفحتك أو حسابك على فيسبوك', 
      example: 'مثال: https://facebook.com/yourpage' 
    },
    { 
      type: 'phone', 
      label: 'اتصال هاتفي', 
      placeholder: '01012345678 أو +20...', 
      example: 'يفتح شاشة الاتصال مباشرة على هاتف العميل برقمك' 
    },
    { 
      type: 'telegram', 
      label: 'تيليجرام', 
      placeholder: '@username أو t.me/...', 
      example: 'يفتح تطبيق تيليجرام للتواصل المباشر' 
    },
    { 
      type: 'tiktok', 
      label: 'تيك توك', 
      placeholder: '@username أو رابط تيك توك', 
      example: 'يفتح تطبيق تيك توك على ملفك الشخصي' 
    },
    { 
      type: 'website', 
      label: 'موقع ويب', 
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
    } else if (selectedType === 'instapay') {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال رابط الدفع السريع من تطبيق إنستاباي.');
        return;
      }
      const hasLink = valueToSave.includes('ipn.eg') || valueToSave.startsWith('http://') || valueToSave.startsWith('https://');
      if (!hasLink) {
        setErrorMsg('تطبيق إنستاباي يتطلب وضع رابط الدفع السريع المباشر (مثل: https://ipn.eg/S/...) وليس اسم المستخدم أو العنوان، حتى يتم فتح صفحة الدفع في التطبيق للعميل فوراً وبدون أي أخطاء.');
        return;
      }
      if (valueToSave.startsWith('ipn.eg/')) {
        valueToSave = `https://${valueToSave}`;
      } else if (!valueToSave.startsWith('http://') && !valueToSave.startsWith('https://')) {
        valueToSave = `https://${valueToSave}`;
      }
    } else if (selectedType === 'wallet') {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال رقم هاتف المحفظة أو رابط الدفع السريع.');
        return;
      }
      if (!isQuickPayUrl(valueToSave)) {
        const detected = detectWalletInfo(valueToSave);
        valueToSave = detected.cleanPhone;
      }
    } else if (selectedType === 'tiktok') {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال اسم المستخدم أو رابط حساب تيك توك.');
        return;
      }
      valueToSave = formatTikTokTargetUrl(valueToSave);
    } else if (selectedType === 'instagram') {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال اسم المستخدم أو رابط حساب إنستجرام.');
        return;
      }
      valueToSave = formatInstagramTargetUrl(valueToSave);
    } else if (selectedType === 'telegram') {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال اسم المستخدم أو رابط تيليجرام.');
        return;
      }
      valueToSave = formatTelegramTargetUrl(valueToSave);
    } else if (selectedType === 'snapchat') {
      if (!valueToSave) {
        setErrorMsg('يرجى إدخال اسم المستخدم أو رابط حساب سناب شات.');
        return;
      }
      valueToSave = formatSnapchatTargetUrl(valueToSave);
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

      // 1. If bank or wallet phone number: open dedicated card view
      if (selectedType === 'bank' || (selectedType === 'wallet' && smartLink.isWalletCard)) {
        if (res.record) {
          setActivatedRecord(res.record);
          onActivated(res.record);
        }
        setTimeout(() => {
          window.location.href = `/q/${qrId}`;
        }, 500);
        return;
      }

      // 2. For direct redirect (WhatsApp, InstaPay Quick Pay Link, Wallet Payment Link, Instagram, etc.):
      // Direct instant redirection with zero intermediate screens!
      if (destinationUrl) {
        try {
          window.location.replace(destinationUrl);
        } catch {
          window.location.href = destinationUrl;
        }
        return;
      } else if (res.record) {
        setActivatedRecord(res.record);
        onActivated(res.record);
        setTimeout(() => {
          window.location.href = `/q/${qrId}`;
        }, 500);
      }
    } catch (err) {
      console.error('Activation failed:', err);
      if (destinationUrl && selectedType !== 'bank' && selectedType !== 'wallet') {
        try {
          window.location.replace(destinationUrl);
        } catch {
          window.location.href = destinationUrl;
        }
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
            {/* Clean Header with Logo */}
            <div className="text-center space-y-2">
              <img src="/logo.png" alt="Smart Card" className="w-16 h-16 object-contain mx-auto mb-2 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                تفعيل بطاقة Smart Card لأول مرة
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-mono">
                Smart Card
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
              <div className="space-y-3">
                <label className="text-xs font-black text-amber-200 block">
                  1. اختر المنصة أو البنك:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {platforms.map((p) => {
                     const isSelected = selectedType === p.type;
                     return (
                       <button
                         key={p.type}
                         type="button"
                         onClick={() => setSelectedType(p.type)}
                         className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all duration-200 gap-2 cursor-pointer select-none ${
                           isSelected
                             ? 'bg-[#181822] border-amber-500/30'
                             : 'bg-[#14141a] text-slate-300 border-white/10 hover:bg-[#1a1a24] hover:border-white/20'
                         }`}
                       >
                         {/* 3D Animated Icon (Movement applied strictly to logo) */}
                         <div
                           className={`w-11 h-11 flex items-center justify-center rounded-xl p-1 transition-all duration-300 ${
                             isSelected
                               ? 'animate-icon-alive'
                               : 'bg-black/40 hover:scale-105'
                           }`}
                         >
                           <PlatformBrandIcon
                             type={p.type}
                             className="w-9 h-9"
                           />
                         </div>

                         {/* 3D Animated Platform Label (Movement applied strictly to name) */}
                         <span
                           className={`text-[11px] font-black truncate w-full text-center transition-all ${
                             isSelected
                               ? 'animate-name-alive text-amber-300 drop-shadow-[0_1px_4px_rgba(250,204,21,0.5)]'
                               : 'text-slate-300'
                           }`}
                         >
                           {p.label}
                         </span>
                       </button>
                     );
                  })}
                </div>
              </div>

              {/* Step 2: Dynamic Input Field */}
              {selectedType === 'bank' ? (
                <div className="p-4 bg-black/50 border border-amber-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                    <PlatformBrandIcon type="bank" className="w-5 h-5" />
                    <span>2. بيانات الحساب البنكي:</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">اسم البنك:</label>
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
                    <label className="text-xs font-bold text-slate-300">رقم الحساب البنكي (إلزامي):</label>
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
                    <label className="text-xs font-bold text-slate-300">اسم صاحب الحساب (اختياري):</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="مثال: أحمد محمد علي"
                      className="w-full px-3.5 py-2 bg-black/60 border border-amber-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              ) : selectedType === 'wallet' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                    <PlatformBrandIcon type="wallet" className="w-5 h-5" />
                    <span>2. أدخل رقم المحفظة أو رابط الدفع السريع:</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="010... أو 012... أو رابط الدفع https://..."
                      className="w-full px-4 py-3.5 bg-black/50 border border-amber-500/20 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition font-mono"
                      dir="ltr"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Real-time detection card for wallet */}
                  {rawInput.trim() ? (
                    isQuickPayUrl(rawInput) ? (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 animate-in fade-in">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-300">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold text-amber-300">رابط دفع سريع للمحفظة ⚡</p>
                          <p className="text-[11px] text-slate-300">سيتم تحويل العميل تلقائياً وفورياً إلى هذا الرابط بمجرد مسح الكارت دون أي توقف.</p>
                        </div>
                      </div>
                    ) : (() => {
                      const detected = detectWalletInfo(rawInput);
                      return (
                        <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl flex items-center gap-3 animate-in fade-in">
                          <div className="w-18 h-12 rounded-xl bg-black/60 border border-white/10 p-1 flex items-center justify-center flex-shrink-0">
                            <WalletProviderIcon provider={detected.provider} size={48} className="w-full h-full object-contain max-h-9" />
                          </div>
                          <div className="text-right text-xs min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-amber-300 text-sm">{detected.nameAr}</span>
                              <span className="text-[11px] font-bold text-slate-300">({detected.nameEn})</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              سيتم عرض صفحة فاخرة مخصصة بشعار <strong>{detected.companyNameAr}</strong> مع رقمك ({detected.formattedPhone}) وزر لنسخ الرقم بنقرة واحدة.
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-amber-200/70 leading-relaxed">
                      💡 <strong>خيارات المحفظة:</strong>
                      <br />• لو حطيت <strong>رابط دفع سريع</strong> للمحفظة (https://...) هيحول العميل عليه فوراً.
                      <br />• لو حطيت <strong>رقم الموبايل</strong> (010 فودافون كاش / 012 أورانج كاش / 011 اتصالات كاش / 015 وي باي)، هتظهر صفحة فاخرة فيها اسم المحفظة واللوجو وزرار لنسخ الرقم.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                    <PlatformBrandIcon type={selectedType} className="w-5 h-5" />
                    <span>2. أدخل بيانات {currentPlatformInfo.label}:</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder={currentPlatformInfo.placeholder}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full px-4 py-3.5 bg-black/50 border border-amber-500/20 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition font-sans"
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
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                    <span>جاري تفعيل الكارت...</span>
                  </>
                ) : (
                  <>
                    <PlatformBrandIcon type={selectedType} className="w-6 h-6" />
                    <span>تأكيد وتفعيل كارت ({currentPlatformInfo.label}) الآن 🚀</span>
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
