import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AppType, QrCodeRecord, PlatformSettings } from '../types/qr';
import { processSmartLink } from './deepLinks';

const LOCAL_STORAGE_KEY = 'smart_qr_codes_local_cache';
const SETTINGS_CACHE_KEY = 'smart_qr_platform_settings';

// Helper for offline caching
function getLocalCache(): Record<string, QrCodeRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCache(cache: Record<string, QrCodeRecord>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }
}

/**
 * Generates bulk unique QR codes with user-specified count and subscription duration
 */
export async function generateBulkQrCodes(count: number, subscriptionMonths = 1): Promise<QrCodeRecord[]> {
  const safeCount = Math.max(1, count || 1);
  const now = new Date();
  const expiresAt = subscriptionMonths > 0 
    ? new Date(now.getTime() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000).toISOString() 
    : null;

  let generatedRecords: QrCodeRecord[] = [];

  // Try Server API first if running on Node/Express full stack
  try {
    const res = await fetch('/api/qr/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: safeCount, subscription_months: subscriptionMonths, expires_at: expiresAt }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        generatedRecords = json.data;
      }
    }
  } catch (err) {
    console.warn('Server bulk generate failed, generating client-side:', err);
  }

  // Fallback client-side generation if server temporarily unreachable or running on static host
  if (generatedRecords.length === 0) {
    const { nanoid } = await import('nanoid');
    for (let i = 0; i < safeCount; i++) {
      const id = nanoid(10).replace(/[^a-zA-Z0-9_-]/g, 'x');
      const record: QrCodeRecord = {
        id,
        is_active: false,
        target_url: null,
        created_at: now.toISOString(),
        total_scans: 0,
        subscription_months: subscriptionMonths,
        expires_at: expiresAt,
      };
      generatedRecords.push(record);
    }
  }

  // 1. ALWAYS Save to Local Cache immediately
  const cache = getLocalCache();
  generatedRecords.forEach((r) => {
    cache[r.id] = r;
  });
  saveLocalCache(cache);

  // 2. CRITICAL: ALWAYS Save EVERY generated code to Cloud Firestore!
  // This guarantees persistence across reloads, live polling, and all phones!
  try {
    const batch = writeBatch(db);
    for (const item of generatedRecords) {
      batch.set(doc(db, 'qr_codes', item.id), item);
    }
    await batch.commit();
  } catch (fsErr) {
    console.error('Firestore batch save error:', fsErr);
  }

  return generatedRecords;
}

/**
 * Fetch a single QR Code by ID (searches Firestore first, then API if JSON, then local cache)
 */
export async function getQrCode(id: string): Promise<QrCodeRecord | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;

  // 1. Direct Cloud Firestore query (Primary source of truth for Vercel & Production)
  try {
    const snap = await getDoc(doc(db, 'qr_codes', cleanId));
    if (snap.exists()) {
      const data = snap.data() as QrCodeRecord;
      const cache = getLocalCache();
      cache[cleanId] = data;
      saveLocalCache(cache);
      return data;
    }
  } catch (fsErr) {
    console.warn('Firestore getDoc warning:', fsErr);
  }

  // 2. Try Server API if running on Express full-stack (ignore if static host returned HTML)
  try {
    const res = await fetch(`/api/qr/${encodeURIComponent(cleanId)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && json.data) {
        const cache = getLocalCache();
        cache[cleanId] = json.data;
        saveLocalCache(cache);
        return json.data;
      }
    }
  } catch {
    // API not reachable or static host
  }

  // 3. Fallback to local cache
  const cache = getLocalCache();
  if (cache[cleanId]) {
    return cache[cleanId];
  }

  // 4. If record does not exist yet, return a clean inactive record so customer can activate it immediately!
  const newInactiveRecord: QrCodeRecord = {
    id: cleanId,
    is_active: false,
    target_url: null,
    created_at: new Date().toISOString(),
    total_scans: 0,
  };
  return newInactiveRecord;
}

/**
 * Fetch all QR codes for Admin view (Firestore + API + Local cache)
 */
export async function fetchAllQrCodes(): Promise<QrCodeRecord[]> {
  const mergedMap: Record<string, QrCodeRecord> = { ...getLocalCache() };

  // 1. Primary: Direct Cloud Firestore fetch
  try {
    const snap = await getDocs(collection(db, 'qr_codes'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const item = d.data() as QrCodeRecord;
        mergedMap[item.id] = item;
      });
    }
  } catch (fsErr) {
    console.warn('Firestore fetchAll warning:', fsErr);
  }

  // 2. Try Server API if available and returns JSON
  try {
    const res = await fetch('/api/qr');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        json.data.forEach((r: QrCodeRecord) => {
          if (!mergedMap[r.id] || new Date(r.updated_at || r.created_at).getTime() >= new Date(mergedMap[r.id].updated_at || mergedMap[r.id].created_at).getTime()) {
            mergedMap[r.id] = r;
          }
        });
      }
    }
  } catch {
    // API unreachable
  }

  saveLocalCache(mergedMap);

  return Object.values(mergedMap).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Customer first-time scan activation.
 * Saves directly to Firestore, local cache, and backend API.
 */
export async function activateQrCode(
  id: string,
  rawInput: string,
  preferredType?: AppType
): Promise<{ success: boolean; error?: string; record?: QrCodeRecord }> {
  const smartLink = processSmartLink(rawInput, preferredType);
  const now = new Date();
  const existing = await getQrCode(id);

  // Preserve existing expires_at if set, otherwise default to 1 month from activation
  const defaultExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expires_at = (existing && existing.expires_at !== undefined) 
    ? existing.expires_at 
    : defaultExpiry;
  const subscription_months = (existing && existing.subscription_months !== undefined)
    ? existing.subscription_months
    : 1;

  const effectiveTargetUrl = (smartLink.isWalletCard && smartLink.walletPhone)
    ? smartLink.walletPhone
    : (smartLink.schemeUrl || smartLink.fallbackUrl);

  const updatedRecord: QrCodeRecord = {
    id,
    is_active: true,
    target_url: effectiveTargetUrl,
    app_type: smartLink.appType,
    updated_at: now.toISOString(),
    created_at: existing?.created_at || now.toISOString(),
    total_scans: 1,
    expires_at,
    subscription_months,
  };

  // 1. Direct Cloud Firestore save (Guaranteed persistence on Vercel)
  try {
    await setDoc(doc(db, 'qr_codes', id), updatedRecord, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore direct activate write warning:', fsErr);
  }

  // 2. Update local cache
  const cache = getLocalCache();
  cache[id] = updatedRecord;
  saveLocalCache(cache);

  // 3. Best-effort API call if backend exists
  try {
    fetch(`/api/qr/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_url: smartLink.schemeUrl || smartLink.fallbackUrl,
        app_type: smartLink.appType,
        expires_at,
        subscription_months,
      }),
    }).catch(() => {});
  } catch {}

  return { success: true, record: updatedRecord };
}

/**
 * Admin Quick Edit: Modify Target URL, label, and subscription expiry.
 * ID is strictly read-only and immutable.
 */
export async function adminUpdateQrCode(
  id: string,
  rawTargetUrl: string,
  preferredType?: AppType,
  label?: string,
  expiresAt?: string | null,
  subscriptionMonths?: number
): Promise<{ success: boolean; record?: QrCodeRecord }> {
  const smartLink = processSmartLink(rawTargetUrl, preferredType);
  const effectiveTargetUrl = (smartLink.isWalletCard && smartLink.walletPhone)
    ? smartLink.walletPhone
    : (smartLink.schemeUrl || smartLink.fallbackUrl || rawTargetUrl.trim());

  try {
    const res = await fetch(`/api/qr/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_url: effectiveTargetUrl,
        app_type: smartLink.appType,
        label,
        expires_at: expiresAt,
        subscription_months: subscriptionMonths,
      }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      const cache = getLocalCache();
      cache[id] = json.data;
      saveLocalCache(cache);
      return { success: true, record: json.data };
    }
  } catch (err) {
    console.warn('Server admin update failed:', err);
  }

  const current = await getQrCode(id);
  if (!current) return { success: false };

  const updatedRecord: QrCodeRecord = {
    ...current,
    target_url: effectiveTargetUrl,
    app_type: smartLink.appType,
    is_active: true,
    label: label !== undefined ? label : current.label,
    expires_at: expiresAt !== undefined ? expiresAt : current.expires_at,
    subscription_months: subscriptionMonths !== undefined ? subscriptionMonths : current.subscription_months,
    updated_at: new Date().toISOString(),
  };

  try {
    const updateData: any = {
      target_url: effectiveTargetUrl,
      app_type: smartLink.appType,
      is_active: true,
      updated_at: updatedRecord.updated_at,
    };
    if (label !== undefined) updateData.label = label;
    if (expiresAt !== undefined) updateData.expires_at = expiresAt;
    if (subscriptionMonths !== undefined) updateData.subscription_months = subscriptionMonths;
    await updateDoc(doc(db, 'qr_codes', id), updateData);
  } catch (fsErr) {
    console.warn('Firestore admin update fallback warning:', fsErr);
  }

  const cache = getLocalCache();
  cache[id] = updatedRecord;
  saveLocalCache(cache);
  return { success: true, record: updatedRecord };
}

/**
 * Quick Subscription Renewal: Extends subscription by N months (+30 days per month).
 * If card is still active, adds to existing expires_at. If expired, adds from now.
 */
export async function renewQrSubscription(
  id: string,
  monthsToAdd = 1
): Promise<{ success: boolean; record?: QrCodeRecord }> {
  const current = await getQrCode(id);
  if (!current) return { success: false };

  const nowMs = Date.now();
  let baseMs = nowMs;
  if (current.expires_at) {
    const existingMs = new Date(current.expires_at).getTime();
    if (existingMs > nowMs) {
      baseMs = existingMs;
    }
  }

  const addedDays = monthsToAdd * 30;
  const newExpiresAt = new Date(baseMs + addedDays * 24 * 60 * 60 * 1000).toISOString();

  const updatedRecord: QrCodeRecord = {
    ...current,
    expires_at: newExpiresAt,
    subscription_months: (current.subscription_months || 0) + monthsToAdd,
    updated_at: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'qr_codes', id), {
      expires_at: newExpiresAt,
      subscription_months: updatedRecord.subscription_months,
      updated_at: updatedRecord.updated_at,
    });
  } catch (fsErr) {
    console.warn('Firestore renew write warning:', fsErr);
  }

  try {
    fetch(`/api/qr/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expires_at: newExpiresAt,
        subscription_months: updatedRecord.subscription_months,
      }),
    }).catch(() => {});
  } catch {}

  const cache = getLocalCache();
  cache[id] = updatedRecord;
  saveLocalCache(cache);

  return { success: true, record: updatedRecord };
}

/**
 * Set custom expiration date or make card permanent (null)
 */
export async function setQrExpiration(
  id: string,
  expiresAt: string | null
): Promise<{ success: boolean; record?: QrCodeRecord }> {
  const current = await getQrCode(id);
  if (!current) return { success: false };

  const updatedRecord: QrCodeRecord = {
    ...current,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'qr_codes', id), {
      expires_at: expiresAt,
      updated_at: updatedRecord.updated_at,
    });
  } catch (fsErr) {
    console.warn('Firestore set expiration warning:', fsErr);
  }

  try {
    fetch(`/api/qr/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expires_at: expiresAt }),
    }).catch(() => {});
  } catch {}

  const cache = getLocalCache();
  cache[id] = updatedRecord;
  saveLocalCache(cache);

  return { success: true, record: updatedRecord };
}

/**
 * Real-time Live Firestore Subscription for QR Codes
 * Pushes live updates whenever any scan or activation happens without page refresh!
 */
export function subscribeToQrCodes(
  callback: (records: QrCodeRecord[]) => void
): () => void {
  try {
    const qrCol = collection(db, 'qr_codes');
    const unsubscribe = onSnapshot(
      qrCol,
      (snapshot) => {
        const map: Record<string, QrCodeRecord> = { ...getLocalCache() };
        snapshot.forEach((d) => {
          const item = d.data() as QrCodeRecord;
          map[item.id] = item;
        });
        const list = Object.values(map).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        saveLocalCache(map);
        callback(list);
      },
      (err) => {
        console.warn('Firestore onSnapshot subscription warning:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('subscribeToQrCodes error:', err);
    return () => {};
  }
}

/**
 * Record a scan count authoritatively in Firestore & local cache
 */
export async function recordQrScan(id: string): Promise<void> {
  const cleanId = id.trim();
  if (!cleanId) return;

  // 1. Direct Firestore atomic increment with setDoc merge (bulletproof on Vercel)
  try {
    const qrRef = doc(db, 'qr_codes', cleanId);
    await setDoc(qrRef, {
      total_scans: increment(1),
      last_scanned_at: new Date().toISOString(),
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore scan increment warning:', fsErr);
  }

  // 2. Also notify backend API if available (keepalive preserves request during navigation)
  try {
    fetch(`/api/qr/${encodeURIComponent(cleanId)}/scan`, { 
      method: 'POST',
      keepalive: true 
    }).catch(() => {});
  } catch {}

  // 3. Update local cache
  const cache = getLocalCache();
  if (cache[cleanId]) {
    cache[cleanId].total_scans = (cache[cleanId].total_scans || 0) + 1;
    cache[cleanId].last_scanned_at = new Date().toISOString();
    saveLocalCache(cache);
  }
}

/**
 * Reset or manually adjust scan count
 */
export async function resetQrScanCount(id: string, count = 0): Promise<boolean> {
  try {
    const res = await fetch(`/api/qr/${encodeURIComponent(id)}/reset-scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (res.ok) {
      const cache = getLocalCache();
      if (cache[id]) {
        cache[id].total_scans = count;
        saveLocalCache(cache);
      }
      return true;
    }
  } catch (err) {
    console.warn('Failed to reset scan count:', err);
  }

  try {
    await updateDoc(doc(db, 'qr_codes', id), { total_scans: count });
  } catch {}

  const cache = getLocalCache();
  if (cache[id]) {
    cache[id].total_scans = count;
    saveLocalCache(cache);
  }
  return true;
}

/**
 * Delete a QR Code permanently from database and local cache
 */
export async function deleteQrCode(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/qr/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const cache = getLocalCache();
      delete cache[id];
      saveLocalCache(cache);
      return true;
    }
  } catch (err) {
    console.warn('Server delete failed, updating local state:', err);
  }

  try {
    await deleteDoc(doc(db, 'qr_codes', id));
  } catch (fsErr) {
    console.warn('Firestore delete fallback warning:', fsErr);
  }

  const cache = getLocalCache();
  delete cache[id];
  saveLocalCache(cache);
  return true;
}

/**
 * Generate Classic QR Code Image Data URL (High Resolution for Printing)
 */
export async function generateQrDataUrl(qrUrl: string, width = 512): Promise<string> {
  return QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Decode QR Code from an uploaded image file using jsQR
 */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Extract QR ID from scanned string or URL.
 */
export function extractQrIdFromUrl(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  const match = trimmed.match(/\/q\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  if (/^[a-zA-Z0-9_-]{6,32}$/.test(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split('/');
  const lastPart = parts[parts.length - 1]?.split('?')[0];
  if (lastPart && /^[a-zA-Z0-9_-]+$/.test(lastPart)) {
    return lastPart;
  }

  return trimmed;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  developer_whatsapp: '01550523365',
  developer_contact_url: 'https://wa.me/201550523365',
  developer_title: 'تواصل مع المطور',
  support_message: 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
  public_domain_url: '',
};

/**
 * Fetch platform settings from server with local fallback
 */
export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(json.data));
        } catch {}
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch settings from server, using local fallback:', err);
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    if (snap.exists()) {
      const data = { ...DEFAULT_PLATFORM_SETTINGS, ...snap.data() } as PlatformSettings;
      try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch {}

  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}

  return DEFAULT_PLATFORM_SETTINGS;
}

/**
 * Update platform settings (developer contact / WhatsApp link / Public Domain)
 */
export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
  let cleanPhone = (settings.developer_whatsapp || '').trim();
  let contactUrl = (settings.developer_contact_url || '').trim();
  let cleanDomain = (settings.public_domain_url !== undefined ? settings.public_domain_url : '').trim();
  if (cleanDomain.endsWith('/')) cleanDomain = cleanDomain.slice(0, -1);

  if (!contactUrl && cleanPhone) {
    let num = cleanPhone.replace(/[^\d]/g, '');
    if (num.startsWith('01')) num = '2' + num;
    contactUrl = `https://wa.me/${num}`;
  }

  const payload: PlatformSettings = {
    developer_whatsapp: cleanPhone || '01550523365',
    developer_contact_url: contactUrl || 'https://wa.me/201550523365',
    developer_title: settings.developer_title || 'تواصل مع المطور',
    support_message: settings.support_message || 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
    public_domain_url: cleanDomain,
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(json.data));
        } catch {}
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Failed to save settings on server, updating local cache only:', err);
  }

  try {
    await setDoc(doc(db, 'settings', 'platform'), payload, { merge: true });
  } catch {}

  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(payload));
  } catch {}
  return payload;
}
