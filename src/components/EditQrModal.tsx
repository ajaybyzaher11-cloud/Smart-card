import { useState, useEffect } from 'react';
import { 
  Lock, 
  Globe, 
  ExternalLink, 
  Check, 
  Save, 
  Download, 
  QrCode as QrIcon, 
  X, 
  Smartphone,
  Eye,
  MessageSquare,
  Instagram,
  Facebook,
  CreditCard,
  Phone,
  Send,
  Video,
  Trash2,
  Building2,
  Wallet,
  Copy,
  Info,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { adminUpdateQrCode, generateQrDataUrl, resetQrScanCount } from '../lib/qrService';
import { processSmartLink, encodeBankDetails, decodeBankDetails } from '../lib/deepLinks';
import { AppType, QrCodeRecord, BankDetails } from '../types/qr';
import { PlatformBrandIcon } from './BrandIcons';

interface EditQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: QrCodeRecord | null;
  domainUrl: string;
  onSaved: (updatedRecord: QrCodeRecord) => void;
  onDelete?: (id: string) => void;
}

const EGYPTIAN_BANKS = [
  'البنك الأهلي المصري (NBE)',
  'بنك مصر (Banque Misr)',
  'البنك التجاري الدولي (CIB)',
  'بنك قطر الوطني (QNB)',
  'بنك القاهرة (Banque du Caire)',
  'بنك الإسكندرية (AlexBank)',
  'بنك فيصل الإسلامي',
  'مصرف أبوظبي الإسلامي (ADIB)',
  'بنك البركة مصر',
  'البنك العربي الأفريقي الدولي (AAIB)',
  'بنك كريدي أجريكول مصر',
  'بنك HSBC مصر',
  'بنك آخر / حساب دولي'
];

export function EditQrModal({ isOpen, onClose, record, domainUrl, onSaved, onDelete }: EditQrModalProps) {
  const [selectedType, setSelectedType] = useState<AppType>('website');
  const [targetUrl, setTargetUrl] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Bank Specific fields
  const [bankName, setBankName] = useState(EGYPTIAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [bankNotes, setBankNotes] = useState('');

  // Wallet specific
  const [walletPhone, setWalletPhone] = useState('');
  const [currentScans, setCurrentScans] = useState<number>(record?.total_scans || 0);

  useEffect(() => {
    if (record) {
      const type = record.app_type || 'website';
      setSelectedType(type);
      setLabel(record.label || '');
      setSavedSuccess(false);
      setCurrentScans(record.total_scans || 0);

      const rawUrl = record.target_url || '';
      setTargetUrl(rawUrl);

      // If bank type, load details
      if (type === 'bank' || rawUrl.startsWith('bank://')) {
        const decoded = decodeBankDetails(rawUrl);
        if (decoded) {
          setBankName(decoded.bankName || EGYPTIAN_BANKS[0]);
          setAccountNumber(decoded.accountNumber || '');
          setAccountName(decoded.accountName || '');
          setIban(decoded.iban || '');
          setBankNotes(decoded.notes || '');
        } else {
          setAccountNumber(rawUrl.replace(/^https?:\/\//, ''));
        }
      } else if (type === 'wallet') {
        const cleanNumber = rawUrl.replace(/[^\d+]/g, '').replace(/^20/, '0');
        setWalletPhone(cleanNumber);
      }

      const fullScanUrl = `${domainUrl}/q/${record.id}`;
      generateQrDataUrl(fullScanUrl, 400).then((url) => setQrDataUrl(url));
    }
  }, [record, domainUrl]);

  if (!isOpen || !record) return null;

  const handleResetScans = async () => {
    if (!record) return;
    const ok = await resetQrScanCount(record.id, 0);
    if (ok) {
      setCurrentScans(0);
      record.total_scans = 0;
      onSaved({ ...record, total_scans: 0 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    let finalRawInput = targetUrl.trim();

    // Custom formatting based on selected platform
    if (selectedType === 'bank') {
      const bankDetails: BankDetails = {
        bankName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        iban: iban.trim(),
        notes: bankNotes.trim(),
      };
      finalRawInput = encodeBankDetails(bankDetails);
    } else if (selectedType === 'wallet') {
      let clean = walletPhone.trim().replace(/[^\d]/g, '');
      if (clean.startsWith('01')) clean = '2' + clean;
      finalRawInput = clean;
    }

    try {
      const result = await adminUpdateQrCode(record.id, finalRawInput, selectedType, label.trim());
      if (result.success && result.record) {
        setSavedSuccess(true);
        onSaved(result.record);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${record.id}.png`;
    link.click();
  };

  // Preview current computed URL
  let currentPreviewInput = targetUrl.trim();
  if (selectedType === 'bank') {
    currentPreviewInput = encodeBankDetails({
      bankName,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      iban: iban.trim(),
    });
  } else if (selectedType === 'wallet') {
    let clean = walletPhone.trim().replace(/[^\d]/g, '');
    if (clean.startsWith('01')) clean = '2' + clean;
    currentPreviewInput = clean;
  }
  const currentLinkInfo = processSmartLink(currentPreviewInput, selectedType);

  // Platform Buttons: STRICT SINGLE SELECTION
  const paymentPlatforms: Array<{ type: AppType; label: string; icon: any; hint: string }> = [
    { type: 'bank', label: 'حساب بنكي رسمي', icon: Building2, hint: 'عرض كارت حساب وتحويل فوري' },
    { type: 'instapay', label: 'إنستاباي InstaPay', icon: CreditCard, hint: 'تحويل مباشر ipn.eg' },
    { type: 'wallet', label: 'محفظة كاش (فودافون/اتصالات)', icon: Wallet, hint: 'كود تحويل فوري ومباشر' },
  ];

  const socialPlatforms: Array<{ type: AppType; label: string; icon: any }> = [
    { type: 'whatsapp', label: 'واتساب', icon: MessageSquare },
    { type: 'instagram', label: 'إنستغرام', icon: Instagram },
    { type: 'facebook', label: 'فيسبوك', icon: Facebook },
    { type: 'telegram', label: 'تيليجرام', icon: Send },
    { type: 'tiktok', label: 'تيك توك', icon: Video },
    { type: 'phone', label: 'اتصال هاتفي', icon: Phone },
    { type: 'website', label: 'موقع ويب', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-amber-500/35 overflow-hidden flex flex-col max-h-[94vh] text-white">
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
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  تعديل الرمز والمنصة المستهدفة
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  record.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                }`}>
                  {record.is_active ? 'مفعل نشط' : 'في انتظار التفعيل'}
                </span>
              </div>
              <p className="text-xs text-slate-400">اختر المنصة أو البنك المطلوب ربطه بهذا الكود (اختيار واحد فقط)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Top Info: Immutable ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  معرّف الكود الفريد (ID - Primary Key)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400/10 text-amber-300 rounded-md border border-amber-400/20">
                  ثابت ومحمي (ممنوع التعديل)
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={record.id}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl font-mono text-sm font-bold text-amber-300 select-all cursor-not-allowed shadow-inner"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-amber-400/50 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200/90">مرات المسح والزيارات</label>
                {record.is_active && currentScans > 0 && (
                  <button
                    type="button"
                    onClick={handleResetScans}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1 cursor-pointer"
                    title="تصفير العداد والبدء من 0"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>تصفير العداد</span>
                  </button>
                )}
              </div>
              <div className="px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl text-sm font-bold text-amber-400 flex items-center justify-between">
                <span>{currentScans}</span>
                <span className="text-xs text-slate-400 font-normal">
                  {record.is_active ? 'زيارة حقيقية بعد التفعيل' : 'العد يبدأ بعد التفعيل فقط'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Bank & Financial Options (Single Select) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-200/90 flex items-center justify-between">
              <span>🏦 خيارات البنوك والمدفوعات الإلكترونية:</span>
              <span className="text-[11px] text-amber-400/80 font-normal">اختيار واحد فقط</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {paymentPlatforms.map((p) => {
                const isSelected = selectedType === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(p.type);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1c12] text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.25)] ring-2 ring-amber-400 font-black'
                        : 'bg-black/40 text-slate-300 border-amber-500/20 hover:border-amber-400/40 hover:bg-black/60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/40 p-1">
                      <PlatformBrandIcon type={p.type} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{p.label}</p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>
                        {p.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Social & Messaging Platforms (Single Select) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-200/90 flex items-center justify-between">
              <span>📱 منصات التواصل والتطبيقات الأخرى:</span>
              <span className="text-[11px] text-amber-400/80 font-normal">اختيار واحد فقط</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {socialPlatforms.map((p) => {
                const isSelected = selectedType === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(p.type);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-semibold transition gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1c12] text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.25)] ring-2 ring-amber-400 font-black'
                        : 'bg-black/40 text-slate-300 border-amber-500/20 hover:border-amber-400/40 hover:bg-black/60'
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <PlatformBrandIcon type={p.type} className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] truncate w-full text-center">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Dynamic Input fields based on selected platform */}

          {/* A. If BANK selected */}
          {selectedType === 'bank' && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>إدخال بيانات الحساب البنكي (للتحويل الفوري):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bank Name Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">اسم البنك:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {EGYPTIAN_BANKS.map((b) => (
                      <option key={b} value={b} className="bg-[#121216] text-white">{b}</option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">رقم الحساب البنكي (إلزامي):</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="مثال: 12345678901234"
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    dir="ltr"
                    required
                  />
                </div>

                {/* Account Holder Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">اسم صاحب الحساب (اختياري):</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* IBAN */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">الآيبان الدولي IBAN (اختياري):</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="EG0000000000000000000000000"
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-mono text-amber-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-200/80">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  عند مسح هذا الرمز، ستظهر للعميل بطاقة بنكية أوبسيديان وذهب فاخرة تعرض اسم البنك ورقم الحساب وزر لنسخ الرقم بضغطة واحدة لتحويل الأموال دون أي أخطاء.
                </span>
              </div>
            </div>
          )}

          {/* B. If WALLET selected */}
          {selectedType === 'wallet' && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>رقم المحفظة الإلكترونية (فودافون كاش / اتصالات كاش / أورنج كاش / وي باي):</span>
              </div>
              <input
                type="text"
                value={walletPhone}
                onChange={(e) => setWalletPhone(e.target.value)}
                placeholder="أدخل رقم الهاتف: 01012345678"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/30 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                dir="ltr"
                required
              />
              <p className="text-[11px] text-amber-200/70">
                💡 سيتم تمكين العميل من نسخ الرقم بلمسة واحدة أو فتح كود التحويل السريع.
              </p>
            </div>
          )}

          {/* C. If INSTAPAY selected */}
          {selectedType === 'instapay' && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>رابط أو معرّف إنستاباي InstaPay:</span>
              </div>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="مثال: username@instapay أو رابط https://ipn.eg/S/..."
                className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/30 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                dir="ltr"
                required
              />
              <p className="text-[11px] text-amber-200/70">
                💡 يدعم الروابط الرسمية (ipn.eg) ومعرّفات الدفع، ويقوم بالفتح المباشر في تطبيق InstaPay.
              </p>
            </div>
          )}

          {/* D. Standard Target URL for other platforms */}
          {selectedType !== 'bank' && selectedType !== 'wallet' && selectedType !== 'instapay' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200/90">
                  الرابط المستهدف أو الحساب ({currentLinkInfo.appTitleAr}):
                </label>
                <span className="text-xs text-amber-400 font-bold">
                  {currentLinkInfo.appTitleAr}
                </span>
              </div>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={
                  selectedType === 'whatsapp' ? 'رقم الواتساب: 01012345678 أو رابط wa.me/2010...' :
                  selectedType === 'instagram' ? '@username أو رابط الحساب instagram.com/...' :
                  selectedType === 'facebook' ? 'facebook.com/yourpage أو رابط البروفايل' :
                  selectedType === 'telegram' ? 't.me/username أو @channel' :
                  selectedType === 'tiktok' ? 'tiktok.com/@username' :
                  selectedType === 'phone' ? 'رقم الاتصال: 01012345678' :
                  'https://yourwebsite.com'
                }
                className="w-full px-3.5 py-3 bg-black/60 border border-amber-500/30 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner transition font-mono"
                dir="ltr"
                required
              />
            </div>
          )}

          {/* Label / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-200/90">
              تسمية الكارت / وصف داخلي للأدمن (اختياري):
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: كارت تحويل بنكي للمتجر - الحساب الرئيسي"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-4 bg-black/60 border border-amber-500/20 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-400" />
                معاينة نتيجة المسح المباشر:
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-400/15 border border-amber-400/30 text-amber-300 rounded-full font-bold">
                جاهز للعمل بنسبة 100%
              </span>
            </div>

            {selectedType === 'bank' ? (
              <div className="p-3 bg-[#141418] rounded-xl border border-amber-500/30 space-y-1.5 text-xs">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  {bankName}
                </p>
                <div className="flex items-center justify-between bg-black/50 p-2 rounded-lg font-mono" dir="ltr">
                  <span className="text-amber-200 font-bold">{accountNumber || 'رقم الحساب'}</span>
                  <span className="text-[11px] text-slate-400">Account #</span>
                </div>
                {accountName && <p className="text-slate-300 text-[11px]">الاسم: {accountName}</p>}
                {iban && <p className="text-amber-200/60 text-[10px] font-mono" dir="ltr">IBAN: {iban}</p>}
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px] w-24">الرابط المباشر:</span>
                  <code className="text-amber-300 bg-black/80 px-2 py-1 rounded border border-amber-500/20 truncate flex-1 font-mono text-[11px]" dir="ltr">
                    {currentLinkInfo.schemeUrl || '—'}
                  </code>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <a
                href={`${domainUrl}/q/${record.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                تجربة مسح الكود ومحاكاة التوجيه في تبويب جديد
              </a>
            </div>
          </div>

          {/* QR Image Box */}
          <div className="p-4 bg-[#141418] rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {qrDataUrl && (
                <div className="p-1.5 bg-white border border-amber-500/30 rounded-xl shadow-md">
                  <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-amber-200">رمز الـ QR الكلاسيكي عالي الدقة</p>
                <p className="text-[11px] text-amber-400/80 font-mono" dir="ltr">{domainUrl}/q/{record.id}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              تنزيل الصورة (PNG)
            </button>
          </div>

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-3 bg-amber-400/20 border border-amber-400/30 rounded-2xl text-xs text-amber-300 font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
              تم حفظ التعديلات وتحديث المنصة والرابط بنجاح!
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-500/20">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(record.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-rose-300 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الكود نهائياً
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-black text-xs rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] transition cursor-pointer"
              >
                <Save className="w-4 h-4 text-black" />
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
