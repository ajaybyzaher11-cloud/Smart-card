import React, { useState, useEffect } from 'react';
import { X, Check, ExternalLink, Sparkles, Phone, MessageSquare, Link, Globe } from 'lucide-react';
import { PlatformSettings } from '../types/qr';

interface DeveloperSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlatformSettings;
  onSave: (updated: PlatformSettings) => Promise<void>;
}

export function DeveloperSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: DeveloperSettingsModalProps) {
  const [phone, setPhone] = useState(settings.developer_whatsapp || '01550523365');
  const [contactUrl, setContactUrl] = useState(settings.developer_contact_url || 'https://wa.me/201550523365');
  const [title, setTitle] = useState(settings.developer_title || 'تواصل مع المطور');
  const [message, setMessage] = useState(settings.support_message || 'مرحباً، أود التواصل بخصوص البطاقة الذكية');
  const [publicDomain, setPublicDomain] = useState(settings.public_domain_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhone(settings.developer_whatsapp || '01550523365');
      setContactUrl(settings.developer_contact_url || 'https://wa.me/201550523365');
      setTitle(settings.developer_title || 'تواصل مع المطور');
      setMessage(settings.support_message || 'مرحباً، أود التواصل بخصوص البطاقة الذكية');
      setPublicDomain(settings.public_domain_url || '');
      setSuccess(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Auto update direct contact URL when phone changes if using default wa.me scheme
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const clean = val.replace(/[^\d]/g, '');
    if (clean) {
      const num = clean.startsWith('01') ? '2' + clean : clean;
      setContactUrl(`https://wa.me/${num}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalUrl = contactUrl.trim();
      let cleanPhone = phone.trim();

      if (!finalUrl && cleanPhone) {
        let num = cleanPhone.replace(/[^\d]/g, '');
        if (num.startsWith('01')) num = '2' + num;
        finalUrl = `https://wa.me/${num}`;
      }

      let cleanDomain = publicDomain.trim();
      if (cleanDomain.endsWith('/')) {
        cleanDomain = cleanDomain.slice(0, -1);
      }

      await onSave({
        developer_whatsapp: cleanPhone || '01550523365',
        developer_contact_url: finalUrl || 'https://wa.me/201550523365',
        developer_title: title.trim() || 'تواصل مع المطور',
        support_message: message.trim(),
        public_domain_url: cleanDomain,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLink = () => {
    let url = contactUrl.trim();
    if (!url && phone.trim()) {
      let num = phone.replace(/[^\d]/g, '');
      if (num.startsWith('01')) num = '2' + num;
      url = `https://wa.me/${num}`;
    }
    if (!url) url = 'https://wa.me/201550523365';
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0e0e12] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)] text-white space-y-6 relative overflow-hidden">
        {/* Ambient gold glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-600/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  إعدادات التواصل مع المطور والتحويل
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل رابط ورقم الواتساب الخاص بالتحويل عند حدوث مشكلة أو حذف الرمز
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success && (
          <div className="p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-xs text-amber-300 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>تم حفظ إعدادات التواصل بنجاح! تم التحديث في السيرفر والروابط فوراً.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* WhatsApp Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>رقم واتساب المطور (الأدمن):</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="01550523365"
              className="w-full px-4 py-2.5 bg-black/50 border border-amber-500/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              dir="ltr"
              required
            />
            <p className="text-[11px] text-slate-400">
              الرقم الحالي المعتمد: <span className="font-mono text-amber-300 font-bold" dir="ltr">01550523365</span>
            </p>
          </div>

          {/* Custom Link / URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-amber-400" />
              <span>الرابط المباشر للتحويل (URL):</span>
            </label>
            <input
              type="text"
              value={contactUrl}
              onChange={(e) => setContactUrl(e.target.value)}
              placeholder="https://wa.me/201550523365"
              className="w-full px-4 py-2.5 bg-black/50 border border-amber-500/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              dir="ltr"
              required
            />
            <p className="text-[11px] text-slate-400">
              يمكنك كتابة رابط واتساب مباشر أو أي رابط مخصص تفضله للتحويل.
            </p>
          </div>

          {/* Button Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>نص زر التواصل الظاهر للعميل:</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="تواصل مع المطور"
              className="w-full px-4 py-2.5 bg-black/50 border border-amber-500/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              required
            />
          </div>

          {/* Public Production Domain (For printing & live cards scanning) */}
          <div className="space-y-2 p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>رابط الدومين الأونلاين للموقع (Public Production Domain):</span>
              </label>
              <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                مهم للطباعة وهواتف العملاء
              </span>
            </div>
            <input
              type="url"
              value={publicDomain}
              onChange={(e) => setPublicDomain(e.target.value)}
              placeholder="مثال: https://cards.mybrand.com أو رابط السيرفر الأونلاين"
              className="w-full px-4 py-2.5 bg-black/70 border border-amber-500/30 rounded-xl text-sm text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              💡 <strong>حل مشكلة المسح من هاتف آخر:</strong> إذا قمت بتوليد أو طباعة الرمز وأنت على السيرفر المحلي (localhost)، فلن يفتح في هاتف العميل الخارجي. اكتب رابط موقعك المرفوع أونلاين هنا وسيتم تضمينه تلقائياً داخل كل كود QR وكل كارت مطبوع!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 border-t border-amber-500/20">
            <button
              type="button"
              onClick={handleTestLink}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              اختبار الرابط فوراً
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto sm:mr-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] transition transform active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
