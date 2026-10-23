import { useState, useEffect, useRef } from 'react';
import { isAdminAuthenticated, logoutAdmin } from './lib/auth';
import { getQrCode, fetchPlatformSettings, recordQrScan } from './lib/qrService';
import { processSmartLink, triggerSmartRedirect } from './lib/deepLinks';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { CustomerActivationView } from './views/CustomerActivationView';
import { SmartRedirectView } from './views/SmartRedirectView';
import { CardExpiredView } from './views/CardExpiredView';
import { HomeLandingView } from './views/HomeLandingView';
import { QrCodeRecord, PlatformSettings } from './types/qr';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const isQrScanPath = currentPath.startsWith('/q/');
  const qrIdFromPath = isQrScanPath ? currentPath.replace('/q/', '').split('?')[0].split('/')[0] : null;

  const [activeRecord, setActiveRecord] = useState<QrCodeRecord | null>(null);
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

  const [isResolvingQr, setIsResolvingQr] = useState<boolean>(Boolean(isQrScanPath && qrIdFromPath));
  const hasRecordedScanRef = useRef<boolean>(false);

  // Load QR record when accessing /q/:id, record scan count LIVE, and instant redirect
  useEffect(() => {
    if (qrIdFromPath) {
      setIsResolvingQr(true);
      getQrCode(qrIdFromPath)
        .then((record) => {
          if (record) {
            setActiveRecord(record);

            // If active: increment scan count LIVE in Firestore!
            if (record.is_active && !hasRecordedScanRef.current) {
              hasRecordedScanRef.current = true;
              recordQrScan(record.id);

              // Check if not expired and not bank/wallet/instapay card: instant redirect to destination!
              const isExpired = record.expires_at && new Date(record.expires_at).getTime() < Date.now();
              if (!isExpired && record.app_type !== 'bank' && record.app_type !== 'wallet' && record.target_url) {
                const linkInfo = processSmartLink(record.target_url, record.app_type);
                if (!linkInfo.isInstaPayCard) {
                  triggerSmartRedirect(linkInfo);
                }
              }
            }
          }
        })
        .catch((err) => {
          console.warn('QR resolution error:', err);
        })
        .finally(() => {
          setIsResolvingQr(false);
        });
    } else {
      setActiveRecord(null);
      setIsResolvingQr(false);
    }
  }, [qrIdFromPath]);

  // Compute effective domain URL (custom production domain if configured, else window.location.origin)
  const effectiveDomainUrl = (settings.public_domain_url && settings.public_domain_url.trim()) 
    ? settings.public_domain_url.trim() 
    : domainUrl;

  // Direct Scan Simulation: opens real /q/:id URL to trigger instant redirection
  const handleSimulateScan = (id: string) => {
    window.open(`${effectiveDomainUrl}/q/${id}`, '_blank');
  };

  // Route 1: QR Scan path /q/:id
  if (isQrScanPath && qrIdFromPath) {
    // 1. While loading from Firestore: show sleek instant loader
    if (isResolvingQr && !activeRecord) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 mb-1">
            جاري قراءة الكارت والتوجيه المباشر...
          </h2>
          <p className="text-xs text-slate-400 font-medium">لحظات قليلة وسيتم فتح التطبيق المطلوب ⚡</p>
        </div>
      );
    }

    // 2. If already active, check expiration
    if (activeRecord && activeRecord.is_active) {
      const isExpired = activeRecord.expires_at && new Date(activeRecord.expires_at).getTime() < Date.now();
      if (isExpired) {
        return <CardExpiredView record={activeRecord} settings={settings} />;
      }
      return <SmartRedirectView record={activeRecord} />;
    }

    // 3. Direct First Scan Customer Activation (Always static, fast, and ready!)
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
