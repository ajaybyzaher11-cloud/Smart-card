import React, { useState } from 'react';
import { Smartphone, Download, Sparkles, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, isStandalone } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If running as standalone app, do not display install banners
  if (isInstalled || isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Action Banner on Mobile */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 animate-in slide-in-from-bottom-5 duration-300 select-none">
        <div className="bg-[#121216]/95 border border-amber-500/40 rounded-2xl p-3 sm:py-3 sm:px-4 shadow-[0_4px_30px_rgba(212,175,55,0.25)] backdrop-blur-xl flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-black/60 border border-amber-500/30 p-1 flex items-center justify-center flex-shrink-0 shadow-md">
              <img src="/logo.png" alt="Smart Card" className="w-8 h-8 object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-300">تطبيق Smart Card</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-300 truncate">تثبيت التطبيق على هاتفك للوصول السريع</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>تثبيت التطبيق</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="إخفاء"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export const PWAHeaderButton: React.FC = () => {
  const { isInstalled, isStandalone } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isInstalled || isStandalone) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-bold text-xs transition cursor-pointer shadow-sm shadow-amber-500/10"
        title="تثبيت التطبيق على هاتفك"
      >
        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">تطبيق الهاتف 📲</span>
        <span className="sm:hidden">التطبيق</span>
      </button>

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
