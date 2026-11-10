import { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  Wallet, 
  ArrowRight, 
  Check,
  User,
  Phone,
  ShieldCheck,
  X
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
import { AppType, QrCodeRecord, WalletItem, WalletProvider } from '../types/qr';
import { PlatformBrandIcon, WalletProviderIcon } from '../components/BrandIcons';

interface CustomerActivationViewProps {
  qrId: string;
  onActivated: (updatedRecord: QrCodeRecord) => void;
}

const WALLET_PROVIDERS: Array<{ id: WalletProvider; nameAr: string; nameEn: string; prefix: string; color: string }> = [
  { id: 'vodafone', nameAr: 'فودافون كاش', nameEn: 'Vodafone Cash', prefix: '010', color: 'border-red-500/40 text-red-400 bg-red-500/10' },
  { id: 'orange', nameAr: 'أورانج كاش', nameEn: 'Orange Cash', prefix: '012', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
  { id: 'etisalat', nameAr: 'اتصالات كاش', nameEn: 'Etisalat Cash', prefix: '011', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { id: 'we', nameAr: 'وي باي (WE Pay)', nameEn: 'WE Pay', prefix: '015', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
];

export function CustomerActivationView({ qrId, onActivated }: CustomerActivationViewProps) {
  const [selectedType, setSelectedType] = useState<AppType>('whatsapp');
  const [rawInput, setRawInput] = useState('');
  const [bankName, setBankName] = useState('البنك الأهلي المصري (NBE)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activatedRecord, setActivatedRecord] = useState<QrCodeRecord | null>(null);

  // Multi-wallet state (1 to 4 wallets)
  const [walletCount, setWalletCount] = useState<number>(1);
  const [wallets, setWallets] = useState<Array<{ phone: string; provider: WalletProvider; ownerName: string }>>([
    { phone: '', provider: 'vodafone', ownerName: '' },
    { phone: '', provider: 'orange', ownerName: '' },
    { phone: '', provider: 'etisalat', ownerName: '' },
    { phone: '', provider: 'we', ownerName: '' },
  ]);

  const handleWalletPhoneChange = (index: number, val: string) => {
    setWallets((prev) => {
      const next = [...prev];
      const detected = detectWalletInfo(val);
      const newProvider = (detected.provider !== 'generic' ? detected.provider : next[index].provider) as WalletProvider;
      next[index] = {
        ...next[index],
        phone: val,
        provider: newProvider,
      };
      return next;
    });
  };

  const handleWalletOwnerChange = (index: number, val: string) => {
    setWallets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ownerName: val };
      return next;
    });
  };

  const handleWalletProviderChange = (index: number, prov: WalletProvider) => {
    setWallets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], provider: prov };
      return next;
    });
  };

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
      example: 'أدخل رقم هاتف المحفظة (فودافون، أورانج، اتصالات، وي) مع إمكانية إضافة حتى 4 محافظ واسم صاحب كل محفظة.' 
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
    let activeWalletsToSave: WalletItem[] | undefined = undefined;

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
    } else if (selectedType === 'wallet') {
      const activeList: WalletItem[] = [];
      for (let i = 0; i < walletCount; i++) {
        const item = wallets[i];
        const trimmedPhone = item.phone.trim();
        if (!trimmedPhone) {
          setErrorMsg(walletCount === 1 ? 'يرجى إدخال رقم هاتف المحفظة.' : `يرجى إدخال رقم المحفظة رقم ${i + 1}.`);
          return;
        }

        // Check if quick pay url
        if (isQuickPayUrl(trimmedPhone)) {
          activeList.push({
            phone: trimmedPhone,
            provider: item.provider || 'generic',
            ownerName: item.ownerName?.trim() || '',
          });
        } else {
          const detected = detectWalletInfo(trimmedPhone);
          activeList.push({
            phone: detected.cleanPhone || trimmedPhone,
            provider: item.provider || detected.provider,
            ownerName: item.ownerName?.trim() || '',
          });
        }
      }

      activeWalletsToSave = activeList;
      valueToSave = activeList[0].phone;
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
      const res = await activateQrCode(qrId, valueToSave, selectedType, activeWalletsToSave);

      // 1. If bank or wallet phone number: open dedicated card view
      if (selectedType === 'bank' || selectedType === 'wallet') {
        if (res.record) {
          setActivatedRecord(res.record);
          onActivated(res.record);
        }
        setTimeout(() => {
          window.location.href = `/?view=${qrId}`;
        }, 500);
        return;
      }

      // 2. For direct redirect (WhatsApp, InstaPay Quick Pay Link, Instagram, etc.):
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

  // Determine if submit button is disabled
  const isSubmitDisabled = loading || (
    selectedType === 'bank' 
      ? !accountNumber.trim() 
      : selectedType === 'wallet'
        ? wallets.slice(0, walletCount).some((w) => !w.phone.trim())
        : !rawInput.trim()
  );

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
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-200">1. اختر منصة أو تطبيق الربط (واحد فقط):</span>
                  <span className="text-[11px] text-amber-400/80 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    محدد: {currentPlatformInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {platforms.map((p) => {
                     const isSelected = selectedType === p.type;
                     return (
                       <button
                         key={p.type}
                         type="button"
                         onClick={() => {
                           setSelectedType(p.type);
                           setErrorMsg(null);
                         }}
                         className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-2 cursor-pointer text-center relative ${
                           isSelected
                             ? 'bg-gradient-to-b from-amber-500/20 to-black border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-amber-400/50'
                             : 'bg-[#18181b]/70 border-white/10 hover:border-amber-400/40 hover:bg-[#18181b]'
                         }`}
                       >
                         {isSelected && (
                           <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center shadow">
                             <Check className="w-2.5 h-2.5 stroke-[3]" />
                           </div>
                         )}
                         <PlatformBrandIcon type={p.type} className="w-8 h-8" />
                         <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
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
                /* MULTI-WALLET ACTIVATION SECTION */
                <div className="space-y-4">
                  {/* Step 2A: Wallet Count Selector */}
                  <div className="p-4 bg-black/60 border border-amber-500/25 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                        <Wallet className="w-4 h-4 text-amber-400" />
                        <span>2. كم عدد المحافظ التي ترغب بربطها بالكارت؟</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        حتى 4 شركات
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      إذا كان لديك أكثر من رقم محفظة كاش (فودافون، أورانج، اتصالات، وي)، اختر العدد لعرض لوجو كل شركة واسم صاحب المحفظة بشكل منفصل:
                    </p>

                    {/* 4 Segmented Count Buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[1, 2, 3, 4].map((count) => {
                        const isCountSelected = walletCount === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setWalletCount(count)}
                            className={`py-2.5 px-1.5 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                              isCountSelected
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-300 shadow-lg shadow-amber-500/25 font-black scale-[1.02]'
                                : 'bg-[#18181b] text-slate-300 border-white/10 hover:border-amber-400/40 hover:text-white'
                            }`}
                          >
                            <span className="text-sm font-mono font-black">{count}</span>
                            <span className="text-[10px] opacity-90">
                              {count === 1 ? 'محفظة واحدة' : count === 2 ? 'محفظتان' : `${count} محافظ`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2B: Wallet Input Cards */}
                  <div className="space-y-3.5">
                    {Array.from({ length: walletCount }).map((_, index) => {
                      const item = wallets[index];
                      const detected = detectWalletInfo(item.phone);
                      const activeProvider = item.provider || (detected.provider !== 'generic' ? detected.provider : 'vodafone');
                      const activeMeta = WALLET_PROVIDERS.find(p => p.id === activeProvider) || WALLET_PROVIDERS[0];

                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-2xl border transition-all space-y-3 bg-black/50 ${
                            activeProvider === 'vodafone' ? 'border-red-500/35 shadow-[0_0_20px_rgba(230,0,0,0.1)]' :
                            activeProvider === 'orange' ? 'border-orange-500/35 shadow-[0_0_20px_rgba(255,121,0,0.1)]' :
                            activeProvider === 'etisalat' ? 'border-emerald-500/35 shadow-[0_0_20px_rgba(113,158,25,0.1)]' :
                            'border-purple-500/35 shadow-[0_0_20px_rgba(102,45,145,0.15)]'
                          }`}
                        >
                          {/* Card Header with Provider Logo & Title */}
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-black/80 border border-white/15 p-1 flex items-center justify-center flex-shrink-0 shadow">
                                <WalletProviderIcon provider={activeProvider} size={28} className="w-full h-full object-contain" />
                              </div>
                              <div>
                                <span className="text-xs font-black text-white block">
                                  {walletCount > 1 ? `المحفظة رقم ${index + 1}` : 'بيانات محفظة الكاش'}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border inline-block mt-0.5 ${activeMeta.color}`}>
                                  {activeMeta.nameAr}
                                </span>
                              </div>
                            </div>

                            {/* Provider Quick Switcher */}
                            <select
                              value={activeProvider}
                              onChange={(e) => handleWalletProviderChange(index, e.target.value as WalletProvider)}
                              className="px-2 py-1 bg-[#09090b] border border-white/15 rounded-lg text-[10px] font-bold text-slate-200 focus:outline-none focus:border-amber-400"
                            >
                              <option value="vodafone">فودافون كاش (010)</option>
                              <option value="orange">أورانج كاش (012)</option>
                              <option value="etisalat">اتصالات كاش (011)</option>
                              <option value="we">وي باي (015)</option>
                            </select>
                          </div>

                          {/* Field 1: Phone Number */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                              <span className="flex items-center gap-1.5 text-amber-200">
                                <Phone className="w-3.5 h-3.5 text-amber-400" />
                                <span>رقم هاتف المحفظة (إلزامي):</span>
                                <span className="text-amber-400 font-mono font-black">({activeMeta.prefix})</span>
                              </span>
                              {item.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleWalletPhoneChange(index, '')}
                                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  <span>مسح</span>
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="tel"
                                value={item.phone}
                                onChange={(e) => handleWalletPhoneChange(index, e.target.value)}
                                placeholder={`مثال: ${activeMeta.prefix}xxxxxxx`}
                                className="w-full pr-3.5 pl-10 py-2.5 bg-black/70 border border-amber-500/30 rounded-xl text-xs font-mono font-black text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                                dir="ltr"
                                required
                              />
                              {item.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleWalletPhoneChange(index, '')}
                                  className="absolute left-3 top-2.5 text-slate-400 hover:text-amber-300 transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Quick Prefix buttons */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-slate-400 font-bold">بادئات سريعة:</span>
                              {['010', '011', '012', '015'].map((pfx) => (
                                <button
                                  key={pfx}
                                  type="button"
                                  onClick={() => {
                                    const currentDigits = item.phone.replace(/^(010|011|012|015)/, '');
                                    handleWalletPhoneChange(index, `${pfx}${currentDigits}`);
                                  }}
                                  className="px-2 py-0.5 bg-white/5 hover:bg-amber-400 hover:text-black rounded text-[10px] font-mono font-bold text-slate-300 border border-white/10 transition"
                                >
                                  {pfx}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Field 2: Owner Name (Works for 1, 2, 3, or 4 wallets!) */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                              <span className="flex items-center gap-1.5 text-amber-200/90">
                                <User className="w-3.5 h-3.5 text-amber-400" />
                                <span>اسم صاحب المحفظة / المستفيد (يظهر للعميل عند التحويل):</span>
                              </span>
                              <span className="text-[10px] text-amber-300/80">اختياري</span>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                value={item.ownerName}
                                onChange={(e) => handleWalletOwnerChange(index, e.target.value)}
                                placeholder={index === 0 ? 'مثال: أحمد محمد علي (فودافون كاش)' : `مثال: اسم صاحب محفظة ${activeMeta.nameAr}`}
                                className="w-full pr-3.5 pl-8 py-2.5 bg-black/70 border border-amber-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                              />
                              {item.ownerName && (
                                <button
                                  type="button"
                                  onClick={() => handleWalletOwnerChange(index, '')}
                                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-amber-300"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Operator Visual Confirmation */}
                          {item.phone.trim() && (
                            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">الشركة المحددة:</span>
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                {activeMeta.nameAr} ({activeMeta.nameEn})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                disabled={isSubmitDisabled}
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
                    <span>
                      {selectedType === 'wallet' && walletCount > 1
                        ? `تأكيد وتفعيل الكارت بـ (${walletCount} محافظ كاش) 🚀`
                        : `تأكيد وتفعيل كارت (${currentPlatformInfo.label}) الآن 🚀`}
                    </span>
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
