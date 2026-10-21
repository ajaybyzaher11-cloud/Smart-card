import { useState, useEffect } from 'react';
import { isAdminAuthenticated, logoutAdmin } from './lib/auth';
import { getQrCode, generateBulkQrCodes, fetchPlatformSettings } from './lib/qrService';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { CustomerActivationView } from './views/CustomerActivationView';
import { SmartRedirectView } from './views/SmartRedirectView';
import { HomeLandingView } from './views/HomeLandingView';
import { QrCodeRecord, PlatformSettings } from './types/qr';
import { AlertCircle, ArrowLeft, RefreshCw, Smartphone, QrCode as QrIcon, Sparkles } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const isQrScanPath = currentPath.startsWith('/q/');
  const qrIdFromPath = isQrScanPath ? currentPath.replace('/q/', '').split('?')[0].split('/')[0] : null;

  const [activeRecord, setActiveRecord] = useState<QrCodeRecord | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [domainUrl, setDomainUrl] = useState<string>(() => window.location.origin);
  const [settings, setSettings] = useState<PlatformSettings>({
    developer_whatsapp: '01550523365',
    developer_contact_url: 'https://wa.me/201550523365',
    developer_title: 'تواصل مع المطور',
    support_message: 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
  });

  // Sync domainUrl and fetch platform settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomainUrl(window.location.origin);
      fetchPlatformSettings().then((s) => setSettings(s));
    }
  }, []);

  // Listen to popstate for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const isAdminPath = currentPath.startsWith('/admin') && currentPath !== '/admin/login';
  const isLoginPath = currentPath === '/admin/login';

  // Middleware simulation: If accessing /admin and not authenticated, redirect to /admin/login
  useEffect(() => {
    if (isAdminPath) {
      if (!isAdminAuthenticated()) {
        navigate('/admin/login');
      }
    }
  }, [currentPath, isAdminPath]);

  // Load QR record when accessing /q/:id
  useEffect(() => {
    if (qrIdFromPath) {
      setQrLoading(true);
      setQrError(null);
      getQrCode(qrIdFromPath)
        .then((record) => {
          if (record) {
            setActiveRecord(record);
          } else {
            // Never expose raw ID to the customer!
            setQrError('تم مسح هذا الرمز من قاعدة البيانات أو لم يعد نشطاً.');
          }
        })
        .catch(() => {
          setQrError('تعذر جلب بيانات الرمز الذكي.');
        })
        .finally(() => {
          setQrLoading(false);
        });
    } else {
      setActiveRecord(null);
    }
  }, [qrIdFromPath]);

  // Compute effective domain URL (custom production domain if configured, else window.location.origin)
  const effectiveDomainUrl = (settings.public_domain_url && settings.public_domain_url.trim()) 
    ? settings.public_domain_url.trim() 
    : domainUrl;

  // Direct Scan Simulation: opens real /q/:id URL to trigger instant 302 redirection
  const handleSimulateScan = (id: string) => {
    window.open(`${effectiveDomainUrl}/q/${id}`, '_blank');
  };

  // Compute WhatsApp redirect url
  const getWhatsAppUrl = () => {
    if (settings.developer_contact_url && settings.developer_contact_url.trim()) {
      return settings.developer_contact_url.trim();
    }
    const cleanPhone = (settings.developer_whatsapp || '01550523365').replace(/[^\d]/g, '');
    const num = cleanPhone.startsWith('01') ? '2' + cleanPhone : cleanPhone;
    return `https://wa.me/${num}`;
  };

  // Route 1: QR Scan path /q/:id
  if (isQrScanPath && qrIdFromPath) {
    // If already active, direct to smart redirection
    if (activeRecord && activeRecord.is_active) {
      return <SmartRedirectView record={activeRecord} />;
    }

    // Only if confirmed deleted or invalid
    if (qrError) {
      const waUrl = getWhatsAppUrl();
      const displayPhone = settings.developer_whatsapp || '01550523365';
      const buttonTitle = settings.developer_title || 'تواصل مع المطور';

      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4 text-center selection:bg-amber-500 selection:text-black">
          <div className="max-w-md w-full bg-gradient-to-b from-[#141418] via-[#0e0e11] to-[#09090b] border border-amber-400/30 rounded-3xl p-8 sm:p-10 space-y-6 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent border border-amber-400/40 flex items-center justify-center mx-auto shadow-inner relative">
              <Sparkles className="w-9 h-9 text-amber-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
            </div>

            <div className="space-y-3">
              <span className="px-3.5 py-1.5 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-black inline-flex items-center gap-1.5 tracking-wide">
                <span>✦</span>
                <span>البطاقات الذكية الفاخرة</span>
                <span>✦</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                الرمز غير صالح أو تم حذفه
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {qrError || 'تم مسح هذا الرمز من قاعدة البيانات أو لم يعد نشطاً. لأي استفسار أو لطلب بطاقة جديدة تواصل مع المطور مباشرة.'}
              </p>
            </div>

            {/* Direct WhatsApp Contact Button */}
            <div className="pt-2 space-y-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm rounded-2xl shadow-[0_8px_30px_rgba(234,179,8,0.35)] transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>{buttonTitle}</span>
              </a>

              <p className="text-[11px] text-amber-200/60 font-mono tracking-wider pt-1">
                رقم الواتساب: {displayPhone}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Direct First Scan Customer Activation (NO LOADING SCREEN AT ALL!)
    return (
      <CustomerActivationView
        qrId={qrIdFromPath}
        onActivated={(updated) => {
          setActiveRecord(updated);
        }}
      />
    );
  }

  // Route 2: Admin Login
  if (isLoginPath) {
    return (
      <AdminLoginView
        onLoginSuccess={() => navigate('/admin')}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // Route 3: Admin Dashboard (Protected)
  if (isAdminPath) {
    return (
      <AdminDashboardView
        onLogout={() => {
          logoutAdmin();
          navigate('/admin/login');
        }}
        domainUrl={effectiveDomainUrl}
        onSimulateScan={handleSimulateScan}
      />
    );
  }

  // Route 4: Home Landing View
  return (
    <HomeLandingView
      onGoToAdmin={() => {
        if (isAdminAuthenticated()) {
          navigate('/admin');
        } else {
          navigate('/admin/login');
        }
      }}
      onSimulateScan={handleSimulateScan}
      domainUrl={effectiveDomainUrl}
    />
  );
}
