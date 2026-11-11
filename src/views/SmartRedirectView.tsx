import { useEffect, useState } from 'react';
import { 
  Zap, 
  ExternalLink, 
  Smartphone, 
  RefreshCw,
  MessageSquare,
  Instagram,
  Facebook,
  CreditCard,
  Phone,
  Send,
  Video,
  Globe,
  Building2,
  Copy,
  Check,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  User
} from 'lucide-react';
import { processSmartLink, triggerSmartRedirect, isRunningInIframe, detectWalletInfo, isQuickPayUrl, sanitizeQuickPayUrl } from '../lib/deepLinks';
import { QrCodeRecord, WalletItem, WalletProvider } from '../types/qr';
import { PlatformBrandIcon, WalletProviderIcon } from '../components/BrandIcons';

interface SmartRedirectViewProps {
  record: QrCodeRecord;
}

export function SmartRedirectView({ record }: SmartRedirectViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  const linkInfo = processSmartLink(record.target_url || '', record.app_type);

  useEffect(() => {
    const isIframe = isRunningInIframe();
    setInIframe(isIframe);

    // If it is NOT a bank card, wallet card, or instapay card: instant auto-redirect!
    if (!linkInfo.isBankCard && linkInfo.appType !== 'bank' && !linkInfo.isWalletCard && !linkInfo.isInstaPayCard) {
      if (!isIframe) {
        triggerSmartRedirect(linkInfo);
        setHasAttemptedRedirect(true);
      } else {
        setHasAttemptedRedirect(true);
      }
    }
  }, [record.id]);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDirectLaunch = () => {
    const target = linkInfo.schemeUrl || linkInfo.fallbackUrl;
    if (!target) return;

    if (inIframe) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      triggerSmartRedirect(linkInfo);
    }
  };

  // 1. BANK CARD VIEW: If the QR code is configured for Bank Transfer
  if (linkInfo.isBankCard || record.app_type === 'bank') {
    const bank = linkInfo.bankDetails || {
      bankName: 'حساب بنكي',
      accountNumber: record.target_url || '',
    };

    return (
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
        <div className="w-full max-w-md bg-[#121216] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] space-y-6 animate-in zoom-in-95">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 font-black">
              <Building2 className="w-8 h-8 text-black" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 border border-amber-400/30 rounded-full text-[11px] font-black text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              بيانات التحويل البنكي المعتمدة
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              {bank.bankName || 'حساب بنكي'}
            </h1>
          </div>

          {/* Bank Account Info Card */}
          <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Account Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-amber-200/80 font-semibold">
                <span>رقم الحساب البنكي:</span>
                <span className="text-[10px] text-slate-400">اضغط للنسخ الفوري</span>
              </div>
              <div className="flex items-center justify-between bg-black/60 border border-amber-500/30 rounded-xl p-3">
                <span className="font-mono text-base sm:text-lg font-black text-amber-300 tracking-wider select-all" dir="ltr">
                  {bank.accountNumber || '—'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(bank.accountNumber || '', 'acc')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-lg shadow-md transition"
                >
                  {copiedField === 'acc' ? (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-black" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Account Name */}
            {bank.accountName && (
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-xs text-slate-400">اسم المستفيد / صاحب الحساب:</span>
                <p className="font-bold text-sm text-white">{bank.accountName}</p>
              </div>
            )}

            {/* IBAN */}
            {bank.iban && (
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>الآيبان الدولي (IBAN):</span>
                </div>
                <div className="flex items-center justify-between bg-black/60 border border-amber-500/20 rounded-xl p-2.5">
                  <span className="font-mono text-xs text-amber-200 select-all truncate" dir="ltr">
                    {bank.iban}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(bank.iban || '', 'iban')}
                    className="p-1.5 text-amber-400 hover:text-white transition"
                    title="نسخ الآيبان"
                  >
                    {copiedField === 'iban' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Payment Apps Launchers */}
          <div className="space-y-2">
            <p className="text-xs text-center text-slate-400 font-medium">التحويل المباشر عبر التطبيقات:</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://ipn.eg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-xl text-xs font-bold text-amber-300 transition"
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>فتح InstaPay</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopy(bank.accountNumber || '', 'acc')}
                className="flex items-center justify-center gap-1.5 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>نسخ لتطبيق البنك</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. WALLET VIEW (Vodafone Cash, Etisalat Cash, Orange Cash, WE Pay - Single or Multiple Wallets)
  if (linkInfo.isWalletCard || (record.app_type === 'wallet' && linkInfo.isWalletCard !== false)) {
    const rawPhone = linkInfo.walletPhone || linkInfo.displayUrl || record.target_url || '';
    
    // Normalize wallets list (fallback to single wallet from target_url if wallets array not present)
    const activeWallets: WalletItem[] = (record.wallets && record.wallets.length > 0)
      ? record.wallets
      : [{
          phone: rawPhone,
          provider: (linkInfo.walletProvider || detectWalletInfo(rawPhone).provider || 'vodafone') as WalletProvider,
          ownerName: '',
        }];

    const isMultiWallet = activeWallets.length > 1;

    // Helper to get color/style meta per provider
    const getProviderStyle = (provider: WalletProvider) => {
      switch (provider) {
        case 'orange':
          return {
            border: 'border-orange-500/40 shadow-[0_0_40px_rgba(255,121,0,0.2)]',
            badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
            gradient: 'from-orange-200 via-orange-400 to-amber-500',
            ring: 'ring-orange-400/30',
          };
        case 'etisalat':
          return {
            border: 'border-emerald-500/40 shadow-[0_0_40px_rgba(113,158,25,0.2)]',
            badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            gradient: 'from-emerald-200 via-emerald-400 to-green-500',
            ring: 'ring-emerald-400/30',
          };
        case 'we':
          return {
            border: 'border-purple-500/40 shadow-[0_0_40px_rgba(102,45,145,0.25)]',
            badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
            gradient: 'from-purple-200 via-purple-400 to-indigo-400',
            ring: 'ring-purple-400/30',
          };
        case 'vodafone':
        default:
          return {
            border: 'border-red-500/40 shadow-[0_0_40px_rgba(230,0,0,0.2)]',
            badge: 'bg-red-500/15 text-red-300 border-red-500/30',
            gradient: 'from-red-200 via-red-400 to-rose-500',
            ring: 'ring-red-400/30',
          };
      }
    };

    // --- CASE A: MULTI-WALLET VIEW (2, 3, or 4 Wallets) ---
    if (isMultiWallet) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
          <div className="w-full max-w-lg bg-[#121216] border border-amber-500/30 rounded-3xl p-5 sm:p-7 space-y-5 text-center animate-in zoom-in-95 backdrop-blur-2xl shadow-[0_0_50px_rgba(212,175,55,0.12)]">
            
            {/* Header with Smart Card Logo */}
            <div className="space-y-2">
              <img src="/logo.png" alt="Smart Card" className="w-14 h-14 object-contain mx-auto mb-1 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400/15 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>متاح {activeWallets.length} محافظ كاش للدفع الفوري ⚡</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                محافظ الكاش المتاحة للتحويل
              </h1>
              <p className="text-xs text-slate-300">
                اختر المحفظة التابعة لشبكتك وانسخ الرقم لإتمام عملية التحويل الفوري:
              </p>
            </div>

            {/* List of Luxury Wallet Cards */}
            <div className="space-y-4 text-right">
              {activeWallets.map((walletItem, idx) => {
                const isUrl = isQuickPayUrl(walletItem.phone);
                const detected = isUrl ? null : detectWalletInfo(walletItem.phone);
                const prov = walletItem.provider || (detected ? detected.provider : 'vodafone');
                const style = getProviderStyle(prov);
                const isCopied = copiedField === `wallet_${idx}`;
                const formatted = detected?.formattedPhone || walletItem.phone;
                const companyTitle = detected?.companyNameAr || (
                  prov === 'vodafone' ? 'فودافون مصر - Vodafone Egypt' :
                  prov === 'orange' ? 'أورانج مصر - Orange Egypt' :
                  prov === 'etisalat' ? 'إي آند مصر (اتصالات) - e& Egypt' :
                  prov === 'we' ? 'المصرية للاتصالات (WE Pay)' : 'محفظة كاش'
                );
                const providerNameAr = detected?.nameAr || (
                  prov === 'vodafone' ? 'ڨودافون كاش' :
                  prov === 'orange' ? 'أورانج كاش' :
                  prov === 'etisalat' ? 'اتصالات كاش' :
                  prov === 'we' ? 'وي باي (WE Pay)' : 'محفظة كاش'
                );
                const providerNameEn = detected?.nameEn || (
                  prov === 'vodafone' ? 'Vodafone Cash' :
                  prov === 'orange' ? 'Orange Cash' :
                  prov === 'etisalat' ? 'Etisalat Cash' :
                  prov === 'we' ? 'WE Pay' : 'Cash Wallet'
                );
                const cleanTargetUrl = isUrl ? sanitizeQuickPayUrl(walletItem.phone, prov) : walletItem.phone.trim();

                return (
                  <div
                    key={idx}
                    className={`bg-black/70 border rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all relative overflow-hidden ${style.border}`}
                  >
                    {/* Top Row: Brand Logo + Operator Title */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-black/80 border border-white/15 p-1.5 flex items-center justify-center flex-shrink-0 shadow-md">
                          <WalletProviderIcon provider={prov} size={42} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border mb-0.5 ${style.badge}`}>
                            <span>{companyTitle}</span>
                          </div>
                          <h2 className={`text-base font-black text-transparent bg-clip-text bg-gradient-to-r ${style.gradient}`}>
                            {providerNameAr}
                          </h2>
                          <p className="text-[11px] font-mono font-bold text-slate-400">
                            {providerNameEn}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-slate-400 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Owner Name Badge (if set) */}
                    {walletItem.ownerName && (
                      <div className="flex items-center gap-2 p-2 px-3 bg-amber-400/10 border border-amber-400/25 rounded-xl text-xs text-amber-300">
                        <User className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="font-medium text-slate-300">اسم صاحب المحفظة:</span>
                        <span className="font-black text-white">{walletItem.ownerName}</span>
                      </div>
                    )}

                    {isUrl ? (
                      /* Quick Pay Link Case */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-black/80 border border-amber-500/25 rounded-xl p-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1 pl-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                            <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 truncate" dir="ltr">
                              {cleanTargetUrl.replace(/^https?:\/\//, '').replace(/^intent:\/\/[^#]*#Intent;/, 'دفع سريع ')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(cleanTargetUrl, `wallet_${idx}`)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-black rounded-lg transition shadow-md cursor-pointer flex-shrink-0 mr-2 ${
                              isCopied
                                ? 'bg-emerald-500 text-black'
                                : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{isCopied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                          </button>
                        </div>

                        {/* Big Action Button to Open Payment Link */}
                        <a
                          href={cleanTargetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (cleanTargetUrl.startsWith('intent://')) {
                              window.location.href = cleanTargetUrl;
                              e.preventDefault();
                            }
                          }}
                          className="w-full py-3.5 px-4 text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-amber-500/20"
                        >
                          <ExternalLink className="w-4 h-4 text-black" />
                          <span>الانتقال للدفع السريع الآن بـ ({providerNameAr}) ⚡</span>
                        </a>
                      </div>
                    ) : (
                      /* Phone Number Case */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-black/80 border border-amber-500/25 rounded-xl p-3">
                          <span className="font-mono text-lg sm:text-xl font-black text-amber-300 tracking-wider select-all" dir="ltr">
                            {formatted}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(walletItem.phone, `wallet_${idx}`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition shadow-md cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500 text-black'
                                : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-amber-400'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                            <span>{isCopied ? 'تم النسخ!' : 'نسخ'}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(walletItem.phone, `wallet_${idx}`)}
                          className={`w-full py-3 px-4 text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black ring-2 ring-emerald-300'
                              : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-4 h-4 text-black animate-bounce" />
                              <span>تم نسخ رقم ({providerNameAr}) بنجاح ✓ (جاهز للصق)</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-black" />
                              <span>نسخ رقم محفظة ({providerNameAr})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Clear Transfer Instructions */}
            <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 text-right space-y-1.5 text-xs text-slate-400 leading-relaxed">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>💡</span>
                <span>طريقة التحويل والدفع:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 pr-1 text-slate-300">
                <li>اختر المحفظة التابعة لشبكة خطك أعلاه.</li>
                <li>إذا كانت رابط دفع سريع: اضغط على زر <strong>الانتقال للدفع السريع</strong> ليفتح لك صفحة الدفع فوراً.</li>
                <li>إذا كانت رقم هاتف: اضغط على <strong>نسخ الرقم</strong> ثم افتح تطبيق المحفظة وأتم التحويل.</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    // --- CASE B: SINGLE WALLET VIEW (1 Wallet) ---
    const singleWallet = activeWallets[0];
    const isUrl = isQuickPayUrl(singleWallet.phone);
    const detected = isUrl ? null : detectWalletInfo(singleWallet.phone);
    const phone = detected?.cleanPhone || singleWallet.phone;
    const formattedPhone = detected?.formattedPhone || phone;
    const provider = singleWallet.provider || (detected?.provider !== 'generic' ? detected?.provider : 'vodafone');
    const providerNameAr = detected?.nameAr || (
      provider === 'vodafone' ? 'ڨودافون كاش' :
      provider === 'orange' ? 'أورانج كاش' :
      provider === 'etisalat' ? 'اتصالات كاش' :
      provider === 'we' ? 'وي باي (WE Pay)' : 'محفظة كاش'
    );
    const providerNameEn = detected?.nameEn || (
      provider === 'vodafone' ? 'Vodafone Cash' :
      provider === 'orange' ? 'Orange Cash' :
      provider === 'etisalat' ? 'Etisalat Cash' :
      provider === 'we' ? 'WE Pay' : 'Cash Wallet'
    );
    const companyName = detected?.companyNameAr || (
      provider === 'vodafone' ? 'فودافون مصر - Vodafone Egypt' :
      provider === 'orange' ? 'أورانج مصر - Orange Egypt' :
      provider === 'etisalat' ? 'إي آند مصر (اتصالات) - e& Egypt' :
      provider === 'we' ? 'المصرية للاتصالات (WE Pay)' : 'محفظة كاش'
    );
    const style = getProviderStyle(provider);
    const isCopied = copiedField === 'wallet';
    const cleanTargetUrl = isUrl ? sanitizeQuickPayUrl(singleWallet.phone, provider) : singleWallet.phone.trim();

    return (
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
        <div className={`w-full max-w-md bg-[#121216] border rounded-3xl p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95 backdrop-blur-2xl ${style.border}`}>
          
          {/* Official Company Logo */}
          <div className="relative inline-block mx-auto">
            <div className="w-48 h-24 sm:w-56 sm:h-28 rounded-2xl bg-black/60 border border-white/15 p-3 flex items-center justify-center mx-auto shadow-2xl transition hover:scale-105 backdrop-blur-md">
              <WalletProviderIcon provider={provider} size={140} className="w-full h-full max-h-20 object-contain drop-shadow-lg" />
            </div>
          </div>

          {/* Provider and Company Titles */}
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${style.badge}`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{companyName}</span>
            </div>

            {/* Arabic Wallet Name */}
            <h1 className={`text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${style.gradient}`}>
              {providerNameAr}
            </h1>

            {/* English Wallet Name */}
            <p className="text-xs sm:text-sm font-bold text-slate-300 tracking-wider">
              {providerNameEn}
            </p>

            {/* Owner Name Badge (if set on single wallet) */}
            {singleWallet.ownerName && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-400/15 border border-amber-400/35 rounded-xl text-xs font-bold text-amber-300 mx-auto mt-2">
                <User className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">اسم صاحب المحفظة:</span>
                <span className="text-white font-black">{singleWallet.ownerName}</span>
              </div>
            )}
          </div>

          {isUrl ? (
            /* Quick Pay Link Case */
            <div className="space-y-4">
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>رابط الدفع السريع المباشر:</span>
                  <span className="text-[10px] text-amber-400/90 font-bold">تحويل فوري ⚡</span>
                </div>

                <div className="flex items-center justify-between bg-black/80 border border-amber-500/30 rounded-xl p-3 sm:p-3.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pl-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 truncate" dir="ltr">
                      {cleanTargetUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(cleanTargetUrl, 'wallet')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-lg transition shadow-md cursor-pointer flex-shrink-0 ${
                      isCopied
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                        : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                    <span>{isCopied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>

              {/* Big Action Button to Open Payment Link */}
              <a
                href={cleanTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (cleanTargetUrl.startsWith('intent://')) {
                    window.location.href = cleanTargetUrl;
                    e.preventDefault();
                  }
                }}
                className="w-full py-4 px-6 text-sm sm:text-base font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-amber-500/30"
              >
                <ExternalLink className="w-5 h-5 text-black" />
                <span>الانتقال للدفع السريع الآن بـ ({providerNameAr}) ⚡</span>
              </a>
            </div>
          ) : (
            /* Phone Number Display Box */
            <div className="space-y-4">
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>رقم المحفظة لتحويل الأموال:</span>
                  <span className="text-[10px] text-amber-400/90 font-bold">جاهز للتحويل الفوري</span>
                </div>

                <div className="flex items-center justify-between bg-black/80 border border-amber-500/30 rounded-xl p-3 sm:p-3.5">
                  <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider select-all" dir="ltr">
                    {formattedPhone}
                  </span>

                  {/* Compact Inline Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(phone, 'wallet')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-lg transition shadow-md cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black'
                    }`}
                    title="نسخ الرقم"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                    <span>{isCopied ? 'تم النسخ!' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              {/* Prominent Primary Copy Button */}
              <div className="space-y-4 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy(phone, 'wallet')}
                  className={`w-full py-4 px-6 text-sm sm:text-base font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25 ring-2 ring-emerald-300'
                      : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-amber-500/25'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-5 h-5 text-black animate-bounce" />
                      <span>تم نسخ رقم المحفظة بنجاح ✓ (جاهز للصق)</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 text-black" />
                      <span>نسخ رقم محفظة ({providerNameAr})</span>
                    </>
                  )}
                </button>

                {/* Clear, simple instructions */}
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 text-right space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>طريقة التحويل:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pr-1 text-slate-300">
                    <li>اضغط على زر <strong>نسخ رقم المحفظة</strong> أعلاه.</li>
                    <li>افتح تطبيق محفظتك الخاصة ({providerNameAr}).</li>
                    <li>الصق الرقم وحدد المبلغ المطلوب وأكّد عملية التحويل.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. INSTAPAY IPA CARD VIEW
  if (linkInfo.isInstaPayCard) {
    const handle = linkInfo.instaPayHandle || record.target_url || '';
    return (
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
        <div className="w-full max-w-md bg-[#121216] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] space-y-6 text-center animate-in zoom-in-95 backdrop-blur-2xl">
          <div className="w-18 h-18 rounded-2xl bg-black/60 border border-amber-500/40 p-2 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <PlatformBrandIcon type="instapay" className="w-12 h-12" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 border border-amber-400/30 rounded-full text-[11px] font-black text-amber-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              عنوان الدفع اللحظي (IPA)
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              إنستاباي InstaPay
            </h1>
            <p className="text-xs text-amber-200/70 mt-1">انقر لنسخ عنوان الدفع والتحويل في ثوانٍ</p>
          </div>

          <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-4 space-y-2">
            <span className="text-xs text-slate-400">عنوان الدفع اللحظي الخاص بي:</span>
            <div className="flex items-center justify-between bg-black/60 border border-amber-500/30 rounded-xl p-3">
              <span className="font-mono text-base sm:text-lg font-black text-amber-300 tracking-wide truncate max-w-[210px]" dir="ltr">
                {handle}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(handle, 'instapay')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-lg transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {copiedField === 'instapay' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                <span>{copiedField === 'instapay' ? 'تم النسخ!' : 'نسخ'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <a
              href="https://ipn.eg"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-black" />
              <span>فتح رابط موقع إنستاباي InstaPay</span>
            </a>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 انسخ العنوان ثم افتح التطبيق واضغط على &quot;إرسال نقود&quot; والصق العنوان.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. INSTANT DIRECT REDIRECTION SPLASH (WhatsApp, Instagram, Facebook, TikTok, Website, YouTube, etc.)
  const targetLink = linkInfo.schemeUrl || linkInfo.fallbackUrl;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shadow-xl shadow-amber-500/20">
          <PlatformBrandIcon type={linkInfo.appType} className="w-12 h-12 animate-pulse" />
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
          جاري فتح {linkInfo.appTitleAr} مباشرة...
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          لحظة واحدة وسيتم تحويلك تلقائياً ⚡
        </p>
      </div>

      {targetLink && (
        <a
          href={targetLink}
          target={inIframe ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="text-xs text-amber-400/90 hover:text-amber-300 underline font-semibold transition py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
        >
          إذا لم يفتح التطبيق تلقائياً، اضغط هنا للمتابعة
        </a>
      )}
    </div>
  );
}
