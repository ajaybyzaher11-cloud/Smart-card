import { useState, useEffect } from 'react';
import { Printer, X, Download, Sliders, Sparkles, Filter } from 'lucide-react';
import { generateQrDataUrl } from '../lib/qrService';
import { QrCodeRecord } from '../types/qr';

interface PrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: QrCodeRecord[];
  domainUrl: string;
}

export function PrintSheetModal({ isOpen, onClose, records, domainUrl }: PrintSheetModalProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState<number>(3);
  const [filterType, setFilterType] = useState<'all' | 'inactive' | 'active'>('all');

  const filtered = records.filter((r) => {
    if (filterType === 'inactive') return !r.is_active;
    if (filterType === 'active') return r.is_active;
    return true;
  });

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generateAll = async () => {
      const map: Record<string, string> = {};
      for (const record of filtered) {
        const fullScanUrl = `${domainUrl}/q/${record.id}`;
        map[record.id] = await generateQrDataUrl(fullScanUrl, 400);
      }
      if (isMounted) setQrMap(map);
    };

    generateAll();
    return () => {
      isMounted = false;
    };
  }, [isOpen, filterType, filtered.length, domainUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-amber-500/35 overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* Ambient Gold Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header - Not printed */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Printer className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                تجهيز وطباعة رموز الـ QR للبطاقات والملصقات
              </h2>
              <p className="text-xs text-slate-400">مخرجات مجهزة لورق الطباعة A4 بدقة عالية وتنسيق جاهز للقص المباشر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar - Not printed */}
        <div className="no-print px-6 py-3 bg-[#121216] border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-200/90">تصفية:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-black/60 border border-amber-500/30 rounded-xl px-3 py-1.5 text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="all">جميع الأكواد ({records.length})</option>
                <option value="inactive">غير المفعلة فقط (جاهزة للعملاء)</option>
                <option value="active">المفعلة فقط</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-200/90">أعمدة الورقة:</span>
              <button
                type="button"
                onClick={() => setColumns(2)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  columns === 2 
                    ? 'bg-amber-400 text-black border-amber-300 font-black shadow-md' 
                    : 'bg-black/40 text-slate-300 border-amber-500/20 hover:border-amber-400/40'
                }`}
              >
                عمودين (كروت كبيرة)
              </button>
              <button
                type="button"
                onClick={() => setColumns(3)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  columns === 3 
                    ? 'bg-amber-400 text-black border-amber-300 font-black shadow-md' 
                    : 'bg-black/40 text-slate-300 border-amber-500/20 hover:border-amber-400/40'
                }`}
              >
                3 أعمدة (مقاس قياسي)
              </button>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-black" />
            طباعة الورقة (Print A4)
          </button>
        </div>

        {/* Printable Sheet Area */}
        <div className="p-6 overflow-y-auto bg-black/40 flex-1">
          <div className="bg-white p-8 rounded-2xl shadow-xl min-h-[600px] border border-amber-500/20 text-black">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-bold">
                لا توجد أكواد مطابقة للتصفية المحددة.
              </div>
            ) : (
              <div
                className={`grid gap-4 print-grid ${
                  columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}
              >
                {filtered.map((r, i) => (
                  <div
                    key={r.id}
                    className="print-card p-4 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center text-center relative"
                  >
                    {/* Header of sticker */}
                    <div className="w-full flex items-center justify-between text-[10px] text-slate-500 font-bold pb-2 border-b border-slate-200">
                      <span className="flex items-center gap-1 text-black font-black">
                        <span>✦</span>
                        <span>بطاقة ذكية فاخرة</span>
                      </span>
                      <span>#{i + 1}</span>
                    </div>

                    {/* Classic crisp black & white QR */}
                    <div className="my-3 p-1 bg-white">
                      {qrMap[r.id] ? (
                        <img
                          src={qrMap[r.id]}
                          alt={`QR ${r.id}`}
                          className="w-32 h-32 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-slate-100 animate-pulse rounded" />
                      )}
                    </div>

                    {/* Instructions and ID */}
                    <div className="w-full space-y-1">
                      <p className="text-[11px] font-black text-slate-900">
                        امسح الكود بكاميرا هاتفك
                      </p>
                      <p className="text-[10px] text-slate-600 font-semibold">
                        {r.is_active ? 'فتح الرابط المباشر' : 'تفعيل الكارت الذكي'}
                      </p>
                      <div className="pt-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded tracking-widest inline-block border border-slate-300">
                          {r.id}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
