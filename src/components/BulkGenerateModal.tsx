import { useState } from 'react';
import { Sparkles, Download, CheckCircle2, QrCode as QrIcon, Loader2, X, Hash } from 'lucide-react';
import { generateBulkQrCodes, generateQrDataUrl } from '../lib/qrService';
import { QrCodeRecord } from '../types/qr';

interface BulkGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (codes: QrCodeRecord[]) => void;
  domainUrl: string;
}

export function BulkGenerateModal({ isOpen, onClose, onGenerated, domainUrl }: BulkGenerateModalProps) {
  // Direct editable number input (defaults to 10 or empty for easy typing)
  const [countInput, setCountInput] = useState<string>('10');
  const [monthsInput, setMonthsInput] = useState<string>('1');
  const [isPermanent, setIsPermanent] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ record: QrCodeRecord; qrDataUrl: string }>>([]);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const parsedCount = parseInt(countInput, 10);
  const parsedMonths = isPermanent ? 0 : parseInt(monthsInput, 10);

  const handleGenerate = async () => {
    if (isNaN(parsedCount) || parsedCount < 1) {
      setErrorMsg('يرجى كتابة عدد صحيح للأكواد أكبر من صفر.');
      return;
    }

    if (parsedCount > 500) {
      setErrorMsg('الحد الأقصى للتوليد في الدفعة الواحدة هو 500 كود لضمان كفاءة السيرفر والذاكرة.');
      return;
    }

    if (!isPermanent && (isNaN(parsedMonths) || parsedMonths < 1)) {
      setErrorMsg('يرجى كتابة عدد شهور صحيح أكبر من صفر، أو اختيار "دائم".');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const durationMonths = isPermanent ? 0 : Math.max(1, parsedMonths);
      const records = await generateBulkQrCodes(parsedCount, durationMonths);
      const withDataUrls = await Promise.all(
        records.map(async (record) => {
          const fullScanUrl = `${domainUrl}/q/${record.id}`;
          const qrDataUrl = await generateQrDataUrl(fullScanUrl, 600);
          return { record, qrDataUrl };
        })
      );
      setGeneratedCodes(withDataUrls);
      setCompleted(true);
      onGenerated(records);
    } catch (e) {
      console.error('Bulk generation error:', e);
      setErrorMsg('حدث خطأ أثناء توليد الأكواد.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = (dataUrl: string, id: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${id}.png`;
    link.click();
  };

  const handleDownloadAll = () => {
    generatedCodes.forEach((item, idx) => {
      setTimeout(() => {
        handleDownloadSingle(item.qrDataUrl, item.record.id);
      }, idx * 120);
    });
  };

  const reset = () => {
    setGeneratedCodes([]);
    setCompleted(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-amber-500/35 overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Ambient Gold Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <QrIcon className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                توليد أكواد الـ QR بالعدد المطلوب
              </h2>
              <p className="text-xs text-slate-400">اكتب أي عدد ترغب في إنشائه دفعة واحدة مع معرّف nanoid فريد</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!completed ? (
            <div className="space-y-6">
              {/* Direct Count Input Box (As Requested by User) */}
              <div className="p-6 bg-gradient-to-br from-[#16161c] via-[#121216] to-[#0e0e12] border border-amber-500/30 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-amber-200/90 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-amber-400" />
                    اكتب عدد الرموز التي تريد توليدها مباشرة:
                  </label>
                  <span className="text-[11px] font-black text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    حقل كتابة حر
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={countInput}
                    onChange={(e) => {
                      setCountInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="اكتب العدد هنا مثلاً: 15"
                    className="w-full text-center text-3xl font-black text-amber-400 bg-black/60 border-2 border-amber-500/30 focus:border-amber-400 rounded-2xl py-4 px-6 shadow-inner focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition"
                    autoFocus
                  />
                  <span className="absolute left-6 text-sm font-bold text-slate-500 pointer-events-none">
                    كود QR
                  </span>
                </div>

                {/* Quick Add Buttons for Convenience */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-semibold">إضافة سريعة للعدد:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 5, 10, 20, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCountInput(num.toString())}
                        className="px-3 py-1.5 text-xs font-bold bg-black/40 hover:bg-amber-400 hover:text-black text-amber-200 border border-amber-500/25 rounded-xl transition shadow-inner"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subscription Duration Selector with Free Typing Number Input */}
              <div className="space-y-3 p-4 bg-black/40 border-2 border-amber-500/25 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>مدة تفعيل الرمز (كم شهر):</span>
                  </label>
                  <span className="text-[11px] font-black text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    حقل كتابة حر للشهور
                  </span>
                </div>

                {/* Free Typing Input Box */}
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={isPermanent ? '' : monthsInput}
                    disabled={isPermanent}
                    onChange={(e) => {
                      setIsPermanent(false);
                      setMonthsInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={isPermanent ? 'تم ضبطه: دائم / غير محدود' : 'اكتب عدد الشهور هنا مثلاً: 1'}
                    className={`w-full text-center text-3xl font-black rounded-2xl py-3.5 px-6 shadow-inner focus:outline-none transition border-2 ${
                      isPermanent
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 cursor-not-allowed'
                        : 'text-amber-400 bg-black/60 border-amber-500/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10'
                    }`}
                  />
                  <span className="absolute left-6 text-sm font-bold text-slate-400 pointer-events-none">
                    {isPermanent ? '✦ دائم' : 'شهر تفعيل'}
                  </span>
                </div>

                {/* Quick Add Buttons for Duration */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-semibold">تحديد سريع للشهر:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '1 شهر', val: '1' },
                      { label: '2 شهر', val: '2' },
                      { label: '3 شهور', val: '3' },
                      { label: '6 شهور', val: '6' },
                      { label: '12 شهر (سنة)', val: '12' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setIsPermanent(false);
                          setMonthsInput(item.val);
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition shadow-inner border ${
                          !isPermanent && monthsInput === item.val
                            ? 'bg-amber-400 text-black border-amber-300 shadow-amber-400/20'
                            : 'bg-black/40 hover:bg-amber-400/20 text-amber-200 border-amber-500/25'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    {/* Permanent Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPermanent(true);
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shadow-inner border ${
                        isPermanent
                          ? 'bg-cyan-500 text-black border-cyan-300 font-black'
                          : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      دائم (بدون انتهاء)
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-black/50 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">النتيجة بعد التوليد:</span>
                  <span className="font-bold text-amber-300">
                    {isPermanent ? (
                      <span className="text-cyan-300">يعمل باستمرار بدون انتهاء صلاحية ✦</span>
                    ) : (
                      <span>
                        سيعمل لمدة <strong>{monthsInput || 1}</strong> شهر (ينتهي في {
                          new Date(Date.now() + (parseInt(monthsInput || '1', 10) || 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        })
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs font-bold text-rose-300 animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {/* Info guidelines */}
              <div className="bg-[#121216] border border-amber-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  قواعد التوليد التلقائي:
                </p>
                <p>• سيقوم النظام بإنشاء <strong>{isNaN(parsedCount) || parsedCount < 1 ? '—' : parsedCount}</strong> معرّف ID فريد ومستقل لكل كود باستخدام nanoid(10).</p>
                <p>• جميع الأكواد تُحفظ فورياً في قاعدة البيانات المركزية وتكون جاهزة للمسح أو التعديل.</p>
                <p>• الرابط الثابت داخل كل كود هو: <span className="font-mono text-amber-400 font-bold" dir="ltr">{domainUrl}/q/[id]</span></p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-black text-sm text-amber-300">تم توليد {generatedCodes.length} كود بنجاح!</h3>
                    <p className="text-xs text-slate-300">تم حفظ المعرفات الفريدة في قاعدة البيانات وهي جاهزة للطباعة والتوزيع الآن.</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadAll}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-black rounded-xl shadow-md transition"
                >
                  <Download className="w-4 h-4 text-black" />
                  تحميل الكل دفعة واحدة (PNG)
                </button>
              </div>

              {/* Grid of Generated QR Codes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto p-1">
                {generatedCodes.map(({ record, qrDataUrl }, idx) => (
                  <div
                    key={record.id}
                    className="p-3 bg-[#141418] rounded-2xl border border-amber-500/20 shadow-md hover:border-amber-400/40 transition flex flex-col items-center text-center group"
                  >
                    <div className="relative p-1.5 bg-white border border-amber-500/30 rounded-xl shadow-xs">
                      <img
                        src={qrDataUrl}
                        alt={`QR ${record.id}`}
                        className="w-28 h-28 object-contain"
                      />
                      <span className="absolute top-1 right-1 text-[10px] font-mono bg-black/80 text-amber-300 px-1.5 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                    </div>
                    <span className="mt-2 text-xs font-mono font-black text-amber-300 tracking-wider bg-black/60 px-2 py-0.5 rounded-lg border border-amber-500/20" dir="ltr">
                      {record.id}
                    </span>
                    <button
                      onClick={() => handleDownloadSingle(qrDataUrl, record.id)}
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-white/5 hover:bg-amber-400 hover:text-black text-amber-300 text-xs font-bold rounded-lg transition border border-amber-500/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تنزيل الكود
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-amber-500/20 bg-black/60">
          {!completed ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !countInput || parsedCount < 1}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>جاري التوليد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>توليد {parsedCount || ''} كود الآن</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-xs rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              تم والعودة للوحة التحكم
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
