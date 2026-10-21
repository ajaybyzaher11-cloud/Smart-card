import { useState, useEffect } from 'react';
import { isAdminAuthenticated, logoutAdmin } from './lib/auth';
import { getQrCode, fetchPlatformSettings } from './lib/qrService';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { CustomerActivationView } from './views/CustomerActivationView';
import { SmartRedirectView } from './views/SmartRedirectView';
import { HomeLandingView } from './views/HomeLandingView';
import { QrCodeRecord, PlatformSettings } from './types/qr';

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

  // Load QR record when accessing /q/:id
  useEffect(() => {
    if (qrIdFromPath) {
      getQrCode(qrIdFromPath)
        .then((record) => {
          if (record) {
            setActiveRecord(record);
          }
        })
        .catch(() => {
          // Never block customer with errors
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

  // Route 1: QR Scan path /q/:id
  if (isQrScanPath && qrIdFromPath) {
    // If already active, direct to smart redirection
    if (activeRecord && activeRecord.is_active) {
      return <SmartRedirectView record={activeRecord} />;
    }

    // Direct First Scan Customer Activation (Always static, fast, and ready!)
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
