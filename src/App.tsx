import { useState, useEffect, useRef } from 'react';
import { isAdminAuthenticated, logoutAdmin, validateAdminSession } from './lib/auth';
import { getQrCode, fetchPlatformSettings, recordQrScan, subscribeToSingleQrCode } from './lib/qrService';
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
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const activateIdFromQuery = searchParams.get('activate');
  const viewIdFromQuery = searchParams.get('view');
  const expiredIdFromQuery = searchParams.get('expired');
  const scanIdFromQuery = searchParams.get('scan');

  const isQrScanPath = currentPath.startsWith('/q/') || Boolean(scanIdFromQuery || viewIdFromQuery || expiredIdFromQuery || activateIdFromQuery);
  const qrIdFromPath = isQrScanPath 
    ? (scanIdFromQuery || viewIdFromQuery || expiredIdFromQuery || activateIdFromQuery || currentPath.replace('/q/', '').split('?')[0].split('/')[0]) 
    : null;

  const [activeRecord, setActiveRecord] = useState<QrCodeRecord | null>(null);
  const [domainUrl, setDomainUrl] = useState<string>(() => window.location.origin);
  const [settings, setSettings] = useState<PlatformSettings>({
    developer_whatsapp: '01550523365',
    developer_contact_url: 'https://wa.me/201550523365',
    developer_title: 'تواصل مع المطور',
    support_message: 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
    public_domain_url: 'https://smart-card-inky.vercel.app',
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

  // Middleware: If accessing /admin and not authenticated, redirect to /admin/login
  useEffect(() => {
    if (isAdminPath) {
      if (!isAdminAuthenticated()) {
        navigate('/admin/login');
      } else {
        validateAdminSession().then((isValid) => {
          if (!isValid) {
            navigate('/admin/login');
          }
        });
      }
    } else if (isLoginPath && isAdminAuthenticated()) {
      navigate('/admin');
    }
  }, [currentPath, isAdminPath, isLoginPath]);

  const [isResolvingQr, setIsResolvingQr] = useState<boolean>(Boolean(isQrScanPath && qrIdFromPath));
  const hasRecordedScanRef = useRef<boolean>(false);

  // Load QR record when accessing /q/:id, record scan count LIVE, and instant redirect
  useEffect(() => {
    if (qrIdFromPath) {
      let isMounted = true;
      setIsResolvingQr(true);

      const fetchPromise = getQrCode(qrIdFromPath);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

      Promise.race([fetchPromise, timeoutPromise])
        .then(async (record) => {
          if (!isMounted) return;

          if (record) {
            setActiveRecord(record);

            // If active: increment scan count LIVE in Firestore!
            if (record.is_active && !hasRecordedScanRef.current) {
              hasRecordedScanRef.current = true;

              // Check if not expired and direct link:
              const isExpired = record.expires_at && new Date(record.expires_at).getTime() < Date.now();
              if (!isExpired && record.target_url) {
                const linkInfo = processSmartLink(record.target_url, record.app_type);
                const isDirectRedirect = !linkInfo.isBankCard && !linkInfo.isInstaPayCard && !linkInfo.isWalletCard;
                if (isDirectRedirect) {
                  const target = linkInfo.schemeUrl || linkInfo.fallbackUrl;
                  if (target && target !== '#' && !target.startsWith('intent:')) {
                    try {
                      await Promise.race([
                        recordQrScan(record.id),
                        new Promise((resolve) => setTimeout(resolve, 150)),
                      ]);
                    } catch {}

                    // DIRECT INSTANT NAVIGATION - zero extra pages!
                    try {
                      window.location.replace(target);
                    } catch {
                      window.location.href = target;
                    }
                    return;
                  }
                }
              }

              // Otherwise record scan normally (for bank card, wallet, or expired)
              recordQrScan(record.id);
            }
          }
        })
        .catch((err) => {
          console.warn('QR resolution error:', err);
        })
        .finally(() => {
          if (isMounted) setIsResolvingQr(false);
        });

      // Real-time Firestore snapshot listener: instantly updates the UI if the admin edits the wallet number!
      const unsubLive = subscribeToSingleQrCode(qrIdFromPath, (liveRecord) => {
        if (!isMounted) return;
        if (liveRecord) {
          setActiveRecord(liveRecord);
          setIsResolvingQr(false);
        }
      });

      return () => {
        isMounted = false;
        unsubLive();
      };
    } else {
      setActiveRecord(null);
      setIsResolvingQr(false);
    }
  }, [qrIdFromPath]);

  // Compute effective domain URL (custom production domain if configured, else Vercel live domain)
  const effectiveDomainUrl = (settings.public_domain_url && settings.public_domain_url.trim()) 
    ? settings.public_domain_url.trim() 
    : 'https://smart-card-inky.vercel.app';

  // Direct Scan Simulation: opens real /q/:id URL to trigger instant redirection
  const handleSimulateScan = (id: string) => {
    window.open(`${effectiveDomainUrl}/q/${id}`, '_blank');
  };

  // Route 1: QR Scan path /q/:id or direct action query
  if (isQrScanPath && qrIdFromPath) {
    // 1. While resolving: show sleek branded loader instead of blank black screen
    if (isResolvingQr && !activeRecord) {
      return (
        <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
          <p className="text-xs text-amber-200/80 font-bold">جاري فتح البطاقة الذكية...</p>
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
