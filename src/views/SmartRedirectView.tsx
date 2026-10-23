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
  Sparkles
} from 'lucide-react';
import { processSmartLink, triggerSmartRedirect, isRunningInIframe } from '../lib/deepLinks';
import { recordQrScan } from '../lib/qrService';
import { QrCodeRecord } from '../types/qr';
import { PlatformBrandIcon } from '../components/BrandIcons';

interface SmartRedirectViewProps {
  record: QrCodeRecord;
}

export function SmartRedirectView({ record }: SmartRedirectViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  const linkInfo = processSmartLink(record.target_url || '', record.app_type);

  useEffect(() => {
    // Record scan count authoritatively in Firestore & local cache
    recordQrScan(record.id);

    const isIframe = isRunningInIframe();
    setInIframe(isIframe);

    // If it is NOT a bank card or wallet screen: instant auto-redirect!
    if (!linkInfo.isBankCard && linkInfo.appType !== 'bank' && linkInfo.appType !== 'wallet') {
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

  // 2. WALLET VIEW (Vodafone Cash, etc.)
  if (linkInfo.appType === 'wallet') {
    const phone = linkInfo.displayUrl;
    return (
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
        <div className="w-full max-w-md bg-[#121216] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] space-y-6 text-center animate-in zoom-in-95 backdrop-blur-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 font-black">
            <Wallet className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              محفظة إلكترونية (كاش)
            </h1>
            <p className="text-xs text-amber-200/70 mt-1">فودافون كاش / اتصالات / أورنج / وي باي</p>
          </div>

          <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-4 space-y-2">
            <span className="text-xs text-slate-400">رقم المحفظة للتحويل:</span>
            <div className="flex items-center justify-between bg-black/60 border border-amber-500/30 rounded-xl p-3">
              <span className="font-mono text-xl font-black text-amber-300 tracking-wider" dir="ltr">
                {phone}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(phone, 'wallet')}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-lg transition"
              >
                {copiedField === 'wallet' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>نسخ</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={`tel:*9*7*${phone}#`}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-black" />
              <span>كود تحويل فودافون كاش (*9*7*)</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. SMART DEEP LINK REDIRECT VIEW (WhatsApp, Instagram, Facebook, InstaPay, TikTok, Website)
  const getPlatformIcon = () => {
    return <PlatformBrandIcon type={linkInfo.appType} className="w-12 h-12" />;
  };

  const targetLink = linkInfo.schemeUrl || linkInfo.fallbackUrl;

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Pulse Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full border border-amber-500/10 animate-ping duration-1000" />
        <div className="w-64 h-64 rounded-full border border-yellow-500/20 animate-pulse duration-700" />
      </div>

      <div className="w-full max-w-sm bg-[#121216] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] text-center space-y-6 relative z-10 animate-in zoom-in-95">
        {/* Animated App Icon */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-black/60 border border-amber-500/30 flex items-center justify-center shadow-2xl">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-500 opacity-60 blur-sm animate-pulse" />
          <div className="relative z-10">
            {getPlatformIcon()}
          </div>
        </div>

        {/* Text Status */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 border border-amber-400/30 rounded-full text-[11px] font-black text-amber-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            توجيه ذكي فائق السرعة
          </div>
          <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
            {linkInfo.appTitleAr}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-mono truncate px-2" dir="ltr">
            {linkInfo.displayUrl || targetLink}
          </p>
        </div>

        {/* Progress Bar Animation */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full animate-pulse w-full" />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Main Direct Open Button */}
          <button
            type="button"
            onClick={handleDirectLaunch}
            className="w-full py-4 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-5 h-5 text-black" />
            <span>فتح التطبيق مباشرة الآن 🚀</span>
          </button>

          {/* Browser Fallback Link */}
          {targetLink && (
            <a
              href={targetLink}
              target={inIframe ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>أو الفتح في المتصفح الخارجي</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
