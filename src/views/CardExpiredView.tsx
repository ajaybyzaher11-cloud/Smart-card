import { RefreshCw, MessageSquare, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { QrCodeRecord, PlatformSettings } from '../types/qr';
import { PlatformBrandIcon } from '../components/BrandIcons';

interface CardExpiredViewProps {
  record: QrCodeRecord;
  settings: PlatformSettings;
}

export function CardExpiredView({ record, settings }: CardExpiredViewProps) {
  const formattedExpiry = record.expires_at
    ? new Date(record.expires_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'غير محدد';

  // Format WhatsApp Link
  let cleanPhone = (settings.developer_whatsapp || '01550523365').trim();
  let contactUrl = settings.developer_contact_url || '';
  if (!contactUrl && cleanPhone) {
    let num = cleanPhone.replace(/[^\d]/g, '');
    if (num.startsWith('01')) num = '2' + num;
    contactUrl = `https://wa.me/${num}`;
  }

  const renewalMessage = encodeURIComponent(
    `مرحباً، أود تجديد اشتراك الكارت الذكي رقم: (${record.id})`
  );
  const whatsappRenewalUrl = `${contactUrl}${contactUrl.includes('?') ? '&' : '?'}text=${renewalMessage}`;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between items-center p-4 sm:p-6 select-none font-sans relative overflow-hidden" dir="rtl">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-md pt-4 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
            <span className="text-amber-400 font-black text-sm">✦</span>
          </div>
          <span className="text-xs font-black tracking-wider text-amber-200/80">SMART CARD VIP</span>
        </div>
        <span className="px-3 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-full text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>اشتراك منتهي</span>
        </span>
      </header>

      {/* Central Content Card */}
      <main className="w-full max-w-md my-auto py-6 z-10">
        <div className="bg-[#121216]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-[0_15px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

          {/* Expired / Clock Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500/20 via-amber-500/15 to-transparent border border-rose-400/30 flex items-center justify-center shadow-inner">
            <Clock className="w-12 h-12 text-amber-400 stroke-[1.5]" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#121216] flex items-center justify-center">
              <span className="text-[9px] text-white font-black">!</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
              انتهت فترة اشتراك الكارت
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              لقد انتهت فترة الاشتراك المحددة لهذه البطاقة الذكية. لتجديد الاشتراك وإعادة تفعيل الرابط فوراً، يرجى التواصل مع الإدارة.
            </p>
          </div>

          {/* Card Info Box */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-right space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
              <span className="text-slate-400 font-medium">رقم البطاقة الذكية:</span>
              <span className="font-mono font-black text-amber-400 text-sm tracking-wider">
                {record.id}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
              <span className="text-slate-400 font-medium">تاريخ انتهاء الصلاحية:</span>
              <span className="font-semibold text-rose-300">{formattedExpiry}</span>
            </div>

            {record.app_type && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">الوجهة المرتبطة:</span>
                <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
                  <PlatformBrandIcon type={record.app_type} className="w-4 h-4" />
                  <span>{record.app_type}</span>
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Primary WhatsApp Renewal Button */}
            <a
              href={whatsappRenewalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_8px_25px_rgba(234,179,8,0.35)] hover:shadow-[0_12px_35px_rgba(234,179,8,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <MessageSquare className="w-5 h-5 fill-black" />
              <span>تجديد اشتراك الكارت عبر واتساب</span>
            </a>

            {/* Check Renewal / Reload */}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إذا تم التجديد اضغط للتحقق وإعادة التوجيه</span>
            </button>
          </div>

          {/* Contact Details Footnote */}
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <span>للدعم السريع:</span>
            <span className="text-amber-300 font-mono font-bold" dir="ltr">
              {settings.developer_whatsapp || '01550523365'}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md py-4 text-center text-[10px] text-slate-500 z-10">
        نظام إدارة الكروت الذكية الفاخرة © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
