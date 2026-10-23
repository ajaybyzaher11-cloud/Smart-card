import { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Camera, 
  Printer, 
  Search, 
  Filter, 
  QrCode as QrIcon, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  LogOut, 
  Lock, 
  RefreshCw, 
  Smartphone, 
  Eye, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  KeyRound,
  Grid,
  List,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Phone,
  Settings,
  Globe,
  Edit3,
  Calendar
} from 'lucide-react';
import { fetchAllQrCodes, generateQrDataUrl, deleteQrCode, getQrCode, fetchPlatformSettings, updatePlatformSettings, renewQrSubscription, subscribeToQrCodes } from '../lib/qrService';
import { logoutAdmin, getAdminPassword, setAdminPassword } from '../lib/auth';
import { BulkGenerateModal } from '../components/BulkGenerateModal';
import { UploadQrModal } from '../components/UploadQrModal';
import { EditQrModal } from '../components/EditQrModal';
import { PrintSheetModal } from '../components/PrintSheetModal';
import { QrScannerModal } from '../components/QrScannerModal';
import { DeveloperSettingsModal } from '../components/DeveloperSettingsModal';
import { QrCodeRecord, PlatformSettings } from '../types/qr';
import { PlatformBrandIcon } from '../components/BrandIcons';

interface AdminDashboardViewProps {
  onLogout: () => void;
  domainUrl: string;
  onSimulateScan: (id: string) => void;
}

export function AdminDashboardView({ onLogout, domainUrl, onSimulateScan }: AdminDashboardViewProps) {
  const [records, setRecords] = useState<QrCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [renewingId, setRenewingId] = useState<string | null>(null);

  // Modals state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Developer Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    developer_whatsapp: '01550523365',
    developer_contact_url: 'https://wa.me/201550523365',
    developer_title: 'تواصل مع المطور',
    support_message: 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
  });

  // Edit modal
  const [selectedEditRecord, setSelectedEditRecord] = useState<QrCodeRecord | null>(null);

  // Delete modal state
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // QR Thumbnails cache
  const [qrThumbs, setQrThumbs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!codeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteQrCode(codeToDelete);
      setRecords((prev) => prev.filter((r) => r.id !== codeToDelete));
      setCodeToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickRenew = async (id: string, months = 1) => {
    setRenewingId(id);
    try {
      const res = await renewQrSubscription(id, months);
      if (res.success && res.record) {
        setRecords((prev) => prev.map((r) => (r.id === id ? res.record! : r)));
      }
    } catch (err) {
      console.error('Quick renew failed:', err);
    } finally {
      setRenewingId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllQrCodes();
      setRecords(data);

      // Pre-generate thumbnails for first batch
      const thumbs: Record<string, string> = {};
      for (const item of data.slice(0, 30)) {
        thumbs[item.id] = await generateQrDataUrl(`${domainUrl}/q/${item.id}`, 200);
      }
      setQrThumbs(thumbs);
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchPlatformSettings().then((s) => {
      if (s) setPlatformSettings(s);
    });

    // Real-time Live Firestore onSnapshot: instant updates without refresh!
    const unsubscribe = subscribeToQrCodes((liveRecords) => {
      setRecords(liveRecords);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [domainUrl]);

  const handleCopyLink = (id: string) => {
    const fullUrl = `${domainUrl}/q/${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQr = async (record: QrCodeRecord) => {
    const fullUrl = `${domainUrl}/q/${record.id}`;
    const dataUrl = await generateQrDataUrl(fullUrl, 800);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${record.id}.png`;
    link.click();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setAdminPassword(newPassword.trim());
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setIsPasswordModalOpen(false);
      setNewPassword('');
    }, 1800);
  };

  const handleSaveDeveloperSettings = async (updated: PlatformSettings) => {
    const res = await updatePlatformSettings(updated);
    setPlatformSettings(res);
  };

  // Filtered records
  const filtered = records.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.target_url && r.target_url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.label && r.label.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'active') return r.is_active && (!r.expires_at || new Date(r.expires_at).getTime() >= Date.now());
    if (filterStatus === 'expired') return r.is_active && r.expires_at && new Date(r.expires_at).getTime() < Date.now();
    if (filterStatus === 'inactive') return !r.is_active;
    return true;
  });

  // KPI Calculations
  const totalCodes = records.length;
  const expiredCodes = records.filter((r) => r.is_active && r.expires_at && new Date(r.expires_at).getTime() < Date.now()).length;
  const activeCodes = records.filter((r) => r.is_active && (!r.expires_at || new Date(r.expires_at).getTime() >= Date.now())).length;
  const pendingCodes = records.filter((r) => !r.is_active).length;
  const totalScans = records.reduce((acc, curr) => acc + (curr.total_scans || 0), 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 pb-16 selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0e0e12]/95 backdrop-blur-md border-b border-amber-500/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0 font-black">
              <QrIcon className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  لوحة تحكم الأكواد الذكية الفاخرة
                </h1>
                <span className="text-[10px] bg-amber-400/15 text-amber-300 font-black px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  الأدمن الملكي
                </span>
              </div>
              <p className="text-[11px] text-amber-200/70 hidden sm:block">إدارة المعرّفات الفريدة والتوجيه الذكي المباشر</p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Developer Contact & WhatsApp Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-400/10 via-yellow-400/15 to-amber-500/10 hover:bg-amber-400/25 text-amber-300 hover:text-amber-200 border border-amber-400/40 rounded-xl transition text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.15)] cursor-pointer"
              title="إعدادات التواصل مع المطور والواتساب"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">تواصل مع المطور (الواتساب)</span>
            </button>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-2.5 py-1.5 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 border border-white/10"
              title="تغيير كلمة المرور"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">كلمة المرور</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-xl text-xs font-bold transition border border-rose-500/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px]">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Localhost / Online Domain Guidance Banner */}
        {(domainUrl.includes('localhost') || domainUrl.includes('127.0.0.1')) && !platformSettings.public_domain_url && (
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/35 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-right shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-200 flex items-center gap-2">
                  <span>تنبيه مهم لمسح وتفعيل الرموز من هواتف العملاء:</span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">بيئة محلية (Localhost)</span>
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  أنت تعمل حالياً على السيرفر المحلي. إذا قمت بعمل سكان للـ QR من هاتف خارجي، لن يفتح الهاتف لأن هاتف العميل لا يستطيع الاتصال بـ localhost بجهازك. لحل ذلك: اكتب رابط الدومين الأونلاين لموقعك في الإعدادات، أو ارفع الموقع مباشرة على الاستضافة (Render / Railway / VPS).
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-[0_4px_15px_rgba(234,179,8,0.25)] flex-shrink-0 transition active:scale-95"
            >
              <Settings className="w-3.5 h-3.5 text-black" />
              <span>ضبط رابط الموقع الأونلاين</span>
            </button>
          </div>
        )}

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 bg-[#121216] rounded-2xl border border-amber-500/20 hover:border-amber-400/40 shadow-lg flex items-center justify-between transition">
            <div>
              <p className="text-[11px] font-bold text-slate-400">إجمالي الرموز</p>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{totalCodes}</p>
              <p className="text-[10px] text-slate-500">معرّفات nanoid فريدة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
              <QrIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-[#121216] rounded-2xl border border-amber-500/20 hover:border-emerald-400/40 shadow-lg flex items-center justify-between transition">
            <div>
              <p className="text-[11px] font-bold text-slate-400">الاشتراكات النشطة</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{activeCodes}</p>
              <p className="text-[10px] text-slate-500">سارية وتعمل الآن</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-[#121216] rounded-2xl border border-rose-500/20 hover:border-rose-400/40 shadow-lg flex items-center justify-between transition">
            <div>
              <p className="text-[11px] font-bold text-slate-400">اشتراكات منتهية</p>
              <p className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5">{expiredCodes}</p>
              <p className="text-[10px] text-slate-500">تتطلب التجديد</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-[#121216] rounded-2xl border border-amber-500/20 hover:border-amber-400/40 shadow-lg flex items-center justify-between transition">
            <div>
              <p className="text-[11px] font-bold text-slate-400">بانتظار التفعيل</p>
              <p className="text-xl sm:text-2xl font-black text-yellow-400 mt-0.5">{pendingCodes}</p>
              <p className="text-[10px] text-slate-500">كروت جديدة غير معينة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-[#121216] rounded-2xl border border-amber-500/20 hover:border-amber-400/40 shadow-lg flex items-center justify-between transition col-span-2 md:col-span-1">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold text-slate-400">إجمالي المسح</p>
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مباشر
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{totalScans}</p>
              <p className="text-[10px] text-slate-500">توجيه فوري لحظي</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Primary Action Ribbon */}
        <div className="p-6 bg-gradient-to-r from-[#121216] via-[#191920] to-[#121216] rounded-3xl text-white shadow-xl shadow-amber-500/5 flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-500/30">
          <div className="space-y-1.5 text-center md:text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full text-xs font-bold text-amber-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              أمان ومطابقة: التعديل متاح فقط بعد مسح الرمز أو رفع صورته
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              أدوات الإدارة والمسح والتعديل الآمن
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              تم حجب أزرار التعديل اليدوي العشوائي؛ لتعديل أي كود يجب التحقق منه عبر مسحه بكاميرا الأدمن أو رفع صورته لضمان مطابقة البطاقة الفعلية.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto">
            {/* Live Camera Scanner to Edit */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Camera className="w-4 h-4 text-white" />
              مسح بالكاميرا للتعديل
            </button>

            {/* Upload QR Image to Edit */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-[#1e1e26] hover:bg-[#252530] text-amber-300 border border-amber-500/40 text-xs font-extrabold rounded-xl shadow-lg transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              رفع صورة كود للتعديل
            </button>

            {/* Bulk Generate */}
            <button
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              توليد أكواد مجمعة
            </button>

            {/* Print Sheet A4 */}
            <button
              onClick={() => setIsPrintOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-amber-500/20 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              طباعة كروت A4
            </button>
          </div>
        </div>

        {/* Search, Filters, and Table */}
        <div className="bg-[#121216] rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden">
          {/* Controls Header */}
          <div className="p-5 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالمعرّف ID أو الرابط المستهدف..."
                className="w-full pr-10 pl-4 py-2 bg-black/40 border border-amber-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>

            {/* Filters and View Switcher */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Category Tabs: Active, Pending, All */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl text-xs font-bold text-slate-400 border border-white/5">
                <button
                  type="button"
                  onClick={() => setFilterStatus('active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                    filterStatus === 'active'
                      ? 'bg-amber-400 text-black shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>النشطة</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === 'active' ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'
                  }`}>
                    {activeCodes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('expired')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                    filterStatus === 'expired'
                      ? 'bg-rose-500 text-white shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>منتهية الصلاحية</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === 'expired' ? 'bg-black/30 text-white' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {expiredCodes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('inactive')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                    filterStatus === 'inactive'
                      ? 'bg-yellow-500 text-black shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>في انتظار التفعيل</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === 'inactive' ? 'bg-black/20 text-black' : 'bg-yellow-400/20 text-yellow-300'
                  }`}>
                    {pendingCodes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                    filterStatus === 'all'
                      ? 'bg-white/20 text-white shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>الكل</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === 'all' ? 'bg-black/20 text-white' : 'bg-white/10 text-slate-300'
                  }`}>
                    {records.length}
                  </span>
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center border border-white/10 rounded-xl overflow-hidden p-0.5 bg-black/40">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-amber-400 text-black shadow-sm font-bold' : 'text-slate-500 hover:text-white'
                  }`}
                  title="عرض شبكي"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'table' ? 'bg-amber-400 text-black shadow-sm font-bold' : 'text-slate-500 hover:text-white'
                  }`}
                  title="عرض جدولي"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition border border-white/5"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* List Content */}
          {loading && records.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-amber-200/80 font-bold">جاري تحميل بيانات الأكواد الملكية...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/5 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <QrIcon className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white">لم يتم العثور على أي رموز مطابقة</p>
              <p className="text-xs text-slate-400">اضغط على زر "توليد أكواد مجمعة" لإنشاء أول مجموعة من الرموز الذكية</p>
              <button
                onClick={() => setIsBulkOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-xl transition mt-2 shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                توليد 10 أكواد الآن
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((record) => {
                const scanUrl = `${domainUrl}/q/${record.id}`;
                return (
                  <div
                    key={record.id}
                    className="p-4 bg-[#16161c] rounded-2xl border border-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(212,175,55,0.12)] transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header of card */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          {record.is_active && record.app_type && (
                            <PlatformBrandIcon type={record.app_type as any} className="w-5 h-5 flex-shrink-0" />
                          )}
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
                            record.is_active
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${record.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                            {record.is_active ? 'مفعل نشط' : 'في انتظار التفعيل'}
                          </span>
                        </div>

                        {/* Prominent Eye Badge for admin */}
                        <div 
                          className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full text-amber-300 font-extrabold text-xs shadow-inner"
                          title={`تم فتح ومسح هذا الرابط ${record.total_scans || 0} مرة بواسطة العملاء`}
                        >
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span>{record.total_scans || 0} مسحة</span>
                        </div>
                      </div>

                      {/* QR Thumbnail */}
                      <div className="my-3 flex justify-center">
                        <div className="p-2.5 bg-white rounded-2xl shadow-inner group-hover:scale-105 transition">
                          {qrThumbs[record.id] ? (
                            <img
                              src={qrThumbs[record.id]}
                              alt={`QR ${record.id}`}
                              className="w-28 h-28 object-contain"
                            />
                          ) : (
                            <div className="w-28 h-28 bg-slate-200 rounded animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* ID and info */}
                      <div className="space-y-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-black text-amber-300 bg-black/60 px-2.5 py-0.5 rounded-lg tracking-wider border border-amber-500/30" dir="ltr">
                            {record.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(record.id)}
                            className="p-1 text-slate-400 hover:text-amber-300 transition"
                            title="نسخ رابط المسح"
                          >
                            {copiedId === record.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {record.label && (
                          <p className="text-[11px] font-bold text-amber-200/90 truncate">
                            {record.label}
                          </p>
                        )}

                        <p className="text-[11px] text-slate-400 truncate" dir="ltr">
                          {record.target_url || '— (غير معين بعد)'}
                        </p>

                        {/* Prominent Eye details banner */}
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-1.5 text-xs text-amber-300 font-extrabold bg-amber-400/10 py-1.5 px-2.5 rounded-xl border border-amber-400/20">
                          <span className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {record.is_active 
                                ? `تم المسح: ${record.total_scans || 0} مرة`
                                : 'في انتظار التفعيل'}
                            </span>
                          </span>
                        </div>

                        {/* Subscription Expiry & Duration Management Box */}
                        <div className="mt-2.5 p-3 bg-black/60 border border-amber-500/25 rounded-xl space-y-2 text-right">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-200/90 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>صلاحية الكارت:</span>
                            </span>
                            {record.expires_at ? (
                              new Date(record.expires_at).getTime() < Date.now() ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/35 animate-pulse">
                                  منتهي الصلاحية ⚠️
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  باقي {Math.max(0, Math.ceil((new Date(record.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} يوم
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                دائم / غير محدود ✦
                              </span>
                            )}
                          </div>

                          {record.expires_at && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>تاريخ الانتهاء:</span>
                              <span className="font-mono text-amber-300 font-bold" dir="ltr">
                                {new Date(record.expires_at).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}

                          {/* Quick 1-Click Renewal Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              disabled={renewingId === record.id}
                              onClick={() => handleQuickRenew(record.id, 1)}
                              className="flex-1 py-1.5 px-2 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 hover:from-amber-400 hover:to-yellow-500 hover:text-black text-amber-300 border border-amber-400/35 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 disabled:opacity-50"
                              title="تجديد/تمديد شهر إضافي (30 يوماً)"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>+1 شهر</span>
                            </button>

                            <button
                              type="button"
                              disabled={renewingId === record.id}
                              onClick={() => handleQuickRenew(record.id, 3)}
                              className="py-1.5 px-2 bg-white/5 hover:bg-amber-400/20 text-slate-300 hover:text-amber-300 border border-white/10 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                              title="تجديد 3 أشهر"
                            >
                              <span>+3 شهور</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedEditRecord(record)}
                              className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                              title="تحديد الرابط وتاريخ الانتهاء"
                            >
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>تحديد</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <div className="grid grid-cols-4 gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedEditRecord(record)}
                          className="py-2 bg-amber-400/10 hover:bg-amber-400 hover:text-black text-amber-300 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1 border border-amber-400/30"
                          title="تعديل الرابط وتاريخ الصلاحية"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        {/* Download QR */}
                        <button
                          type="button"
                          onClick={() => handleDownloadQr(record)}
                          className="py-2 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 border border-white/10"
                          title="تحميل صورة الـ QR بدقة عالية"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>تحميل</span>
                        </button>

                        {/* Test Scan */}
                        <button
                          type="button"
                          onClick={() => onSimulateScan(record.id)}
                          className="py-2 bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 border border-amber-500/20"
                          title="فتح رابط المسح الحقيقي"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                          <span>مسح</span>
                        </button>

                        {/* Delete Code */}
                        <button
                          type="button"
                          onClick={() => setCodeToDelete(record.id)}
                          className="py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 border border-rose-500/30"
                          title="حذف هذا الكود نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-black/50 text-amber-300/90 border-b border-white/5 font-black">
                  <tr>
                    <th className="py-3 px-4">كود الـ QR</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">مدة التفعيل والاشتراك</th>
                    <th className="py-3 px-4">مرات المسح</th>
                    <th className="py-3 px-4">المنصة</th>
                    <th className="py-3 px-4">الرابط المستهدف</th>
                    <th className="py-3 px-4">تاريخ الإنشاء</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-amber-400/5 transition">
                      <td className="py-2.5 px-4 font-mono font-black text-amber-300" dir="ltr">
                        {record.id}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          record.is_active
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {record.is_active ? 'مفعل نشط' : 'في انتظار التفعيل'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {record.expires_at ? (
                            new Date(record.expires_at).getTime() < Date.now() ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                منتهي الصلاحية ⚠️
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                نشط (باقي {Math.max(0, Math.ceil((new Date(record.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} يوم)
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              دائم / غير محدود ✦
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              disabled={renewingId === record.id}
                              onClick={() => handleQuickRenew(record.id, 1)}
                              className="px-2 py-0.5 bg-amber-400/20 hover:bg-amber-400 hover:text-black text-amber-300 rounded text-[10px] font-black border border-amber-400/30 transition disabled:opacity-50"
                              title="تجديد +1 شهر"
                            >
                              +1 شهر
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedEditRecord(record)}
                              className="p-1 text-slate-400 hover:text-amber-300 transition"
                              title="تعديل الصلاحية"
                            >
                              <Calendar className="w-3 h-3 text-amber-400" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-extrabold text-amber-300">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400/10 border border-amber-400/30 rounded-full text-xs">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>{record.total_scans || 0}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {record.app_type && <PlatformBrandIcon type={record.app_type as any} className="w-4 h-4 flex-shrink-0" />}
                          <span className="capitalize">{record.app_type || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400 max-w-xs truncate" dir="ltr">
                        {record.target_url || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(record.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEditRecord(record)}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition"
                            title="تعديل الرابط وتاريخ الصلاحية"
                          >
                            <Edit3 className="w-4 h-4 text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadQr(record)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                            title="تحميل"
                          >
                            <Download className="w-4 h-4 text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSimulateScan(record.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded-lg transition"
                            title="مسح"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCodeToDelete(record.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <BulkGenerateModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        domainUrl={domainUrl}
        onGenerated={(newRecords) => {
          setRecords((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const fresh = newRecords.filter((r) => !existingIds.has(r.id));
            return [...fresh, ...prev];
          });
          newRecords.forEach((item) => {
            generateQrDataUrl(`${domainUrl}/q/${item.id}`, 200).then((url) => {
              setQrThumbs((prev) => ({ ...prev, [item.id]: url }));
            });
          });
        }}
      />

      <UploadQrModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onCodeFound={(rec: QrCodeRecord) => {
          setSelectedEditRecord(rec);
        }}
      />

      <EditQrModal
        isOpen={!!selectedEditRecord}
        record={selectedEditRecord}
        domainUrl={domainUrl}
        onClose={() => setSelectedEditRecord(null)}
        onSaved={(updated) => {
          setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setFilterStatus('active');
        }}
        onDelete={(id) => setCodeToDelete(id)}
      />

      <PrintSheetModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        records={records}
        domainUrl={domainUrl}
      />

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScannedId={async (id) => {
          setIsScannerOpen(false);
          let rec: QrCodeRecord | null | undefined = records.find((r) => r.id === id);
          if (!rec) {
            rec = await getQrCode(id);
          }
          if (rec) {
            setSelectedEditRecord(rec);
          } else {
            alert(`الرمز "${id}" غير موجود أو تم حذفه من قاعدة البيانات.`);
          }
        }}
      />

      {/* Developer & WhatsApp Settings Modal */}
      <DeveloperSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={platformSettings}
        onSave={handleSaveDeveloperSettings}
      />

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#121216] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              تغيير كلمة المرور الخاصة بالأدمن
            </h3>
            <p className="text-xs text-slate-400">
              كلمة المرور الحالية الافتراضية: <span className="font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-500/20" dir="ltr">admin123</span>
            </p>

            {passwordSuccess && (
              <div className="p-3 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400" />
                تم تغيير كلمة المرور بنجاح!
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-amber-200/90 mb-1">
                  كلمة المرور الجديدة:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية..."
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-500/20 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  dir="ltr"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black rounded-xl shadow-md transition"
                >
                  حفظ كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {codeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#121216] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">حذف الكود نهائياً؟</h3>
              <p className="text-xs text-slate-400 mt-1">
                هل أنت متأكد من حذف الكود <span className="font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-500/20" dir="ltr">{codeToDelete}</span> من لوحة الأدمن ومن قاعدة البيانات؟
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-300 text-right leading-relaxed font-semibold">
              ⚠️ تحذير: سيتم حذف هذا الكود نهائياً من قاعدة بيانات الموقع، وأي كارت مطبوع يحمل هذا الرمز سيتوقف عن العمل فوراً ويحول العميل لزر التواصل مع المطور.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCodeToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition border border-white/10"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
