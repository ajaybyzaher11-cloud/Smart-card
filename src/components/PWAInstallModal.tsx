import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, X, Sparkles, Share2, PlusSquare, ShieldCheck, ArrowRight, Layers } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-[#121216] border border-amber-500/35 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(212,175,55,0.2)] text-white space-y-5 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/60 border border-amber-500/30 p-1 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <img src="/logo.png" alt="Smart Card App" className="w-10 h-10 object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  تطبيق Smart Card
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  تطبيق هاتف رسمي
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">تثبيت فوري على شاشة الموبايل الرئيسية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Direct Phone App (PWA) vs Native APK Info */}
        <div className="flex items-center gap-1 p-1 bg-black/60 border border-amber-500/20 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>التثبيت الفوري (PWA)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>حزمة أندرويد (APK)</span>
          </button>
        </div>

        {activeTab === 'pwa' ? (
          <div className="space-y-4">
            {/* Features */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-black/50 border border-amber-500/20 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>يعمل كتطبيق كامل</span>
                </div>
                <p className="text-[11px] text-slate-400">بدون شريط المتصفح (Standalone) مع لوجو وأيقونة مستقلة.</p>
              </div>
              <div className="p-3 bg-black/50 border border-amber-500/20 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>سرعة فائقة وذاكرة</span>
                </div>
                <p className="text-[11px] text-slate-400">تخزين مؤقت وسرعة استجابة فورية 0.0 ثانية.</p>
              </div>
            </div>

            {/* Install Button & Status */}
            {isInstalled ? (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-black text-emerald-300">التطبيق مثبت بالفعل على جهازك! 🎉</p>
                <p className="text-xs text-slate-300">يمكنك فتحه مباشرة من الشاشة الرئيسية لهاتفك في أي وقت.</p>
              </div>
            ) : installSuccess ? (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center space-y-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <p className="text-sm font-black text-emerald-300">تم تثبيت التطبيق بنجاح! 🚀</p>
                <p className="text-xs text-slate-300">أيقونة Smart Card موجودة الآن على شاشة هاتفك.</p>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Download className="w-5 h-5 text-black" />
                <span>تثبيت التطبيق على الهاتف الآن بنقرة واحدة</span>
              </button>
            ) : isIOS ? (
              <div className="p-4 bg-black/60 border border-amber-500/20 rounded-2xl space-y-3 text-right">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>طريقة التثبيت على آيفون (iPhone / Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                  <li>
                    اضغط على زر <strong>المشاركة (Share)</strong> <Share2 className="w-3.5 h-3.5 inline text-amber-400" /> في أسفل شاشة سفاري.
                  </li>
                  <li>
                    مرر لأسفل واختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-400" />.
                  </li>
                  <li>
                    اضغط <strong>إضافة (Add)</strong> بالأعلى ليظهر التطبيق في شاشتك الرئيسية فوراً.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-4 bg-black/60 border border-amber-500/20 rounded-2xl space-y-2 text-center text-xs">
                <p className="font-bold text-amber-300">لتثبيت التطبيق من متصفحك (Brave / Chrome):</p>
                <p className="text-slate-300">
                  اضغط على <strong>القائمة (⋮)</strong> في متصفحك ثم اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Native APK Tab */
          <div className="space-y-3.5 text-xs">
            <div className="p-4 bg-black/60 border border-amber-500/20 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>تحويل الموقع إلى ملف APK حقيقي لأندرويد:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                تم تجهيز الموقع بملف <strong>Web App Manifest</strong> متكامل وخدمة <strong>Service Worker</strong> مطابقة 100% لمعايير Google Play و TWA (Trusted Web Activity).
              </p>
              <div className="p-2.5 bg-black/80 rounded-xl border border-white/10 space-y-1.5 font-mono text-[10px] text-amber-200">
                <p className="text-slate-400 font-sans font-bold">رابط الموقع الرسمي لتوليد APK:</p>
                <p className="select-all bg-black/90 p-1.5 rounded border border-amber-500/30">https://smart-card-inky.vercel.app</p>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                💡 يمكنك تحويله إلى ملف <strong className="text-amber-300">.APK</strong> قابل للتثبيت أو النشر على متجر Google Play في دقيقة واحدة مجاناً عبر أداة <strong>PWABuilder</strong> الرسمية من مايكروسوفت أو <strong>Bubblewrap</strong> من جوجل.
              </p>
            </div>

            <a
              href="https://www.pwabuilder.com/?url=https://smart-card-inky.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 rounded-xl text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <span>فتح مولد الـ APK المباشر (PWABuilder)</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
