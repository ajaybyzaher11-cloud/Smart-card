import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch, increment } from 'firebase/firestore';
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
 * Generates bulk unique QR codes with user-specified count (any number typed by the user)
 */
export async function generateBulkQrCodes(count: number): Promise<QrCodeRecord[]> {
  const safeCount = Math.max(1, count || 1);

  try {
    const res = await fetch('/api/qr/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: safeCount }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cache = getLocalCache();
        json.data.forEach((r: QrCodeRecord) => {
          cache[r.id] = r;
        });
        saveLocalCache(cache);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Server bulk generate failed, using local generation:', err);
  }

  // Fallback client-side generation if server temporarily unreachable
  const { nanoid } = await import('nanoid');
  const fallbackList: QrCodeRecord[] = [];
  const cache = getLocalCache();

  for (let i = 0; i < safeCount; i++) {
    const id = nanoid(10).replace(/[^a-zA-Z0-9_-]/g, 'x');
    const record: QrCodeRecord = {
      id,
      is_active: false,
      target_url: null,
      created_at: new Date().toISOString(),
      total_scans: 0,
    };
    fallbackList.push(record);
    cache[record.id] = record;
  }
  saveLocalCache(cache);

  // Sync to Firestore Cloud DB
  try {
    const batch = writeBatch(db);
    for (const item of fallbackList) {
      batch.set(doc(db, 'qr_codes', item.id), item);
    }
    await batch.commit();
  } catch (fsErr) {
    console.warn('Firestore batch save warning:', fsErr);
  }

  return fallbackList;
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
  // 1. Primary: Direct Cloud Firestore fetch
  try {
    const snap = await getDocs(collection(db, 'qr_codes'));
    if (!snap.empty) {
      const list: QrCodeRecord[] = [];
      const syncedCache: Record<string, QrCodeRecord> = {};
      snap.forEach((d) => {
        const item = d.data() as QrCodeRecord;
        list.push(item);
        syncedCache[item.id] = item;
      });
      saveLocalCache(syncedCache);
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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
        const syncedCache: Record<string, QrCodeRecord> = {};
        json.data.forEach((r: QrCodeRecord) => {
          syncedCache[r.id] = r;
        });
        saveLocalCache(syncedCache);
        return json.data;
      }
    }
  } catch {
    // API unreachable
  }

  const cache = getLocalCache();
  return Object.values(cache).sort(
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
  const now = new Date().toISOString();

  const updatedRecord: QrCodeRecord = {
    id,
    is_active: true,
    target_url: smartLink.schemeUrl || smartLink.fallbackUrl,
    app_type: smartLink.appType,
    updated_at: now,
    created_at: now,
    total_scans: 1,
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
      }),
    }).catch(() => {});
  } catch {}

  return { success: true, record: updatedRecord };
}

/**
 * Admin Quick Edit: Modify Target URL exclusively.
 * ID is strictly read-only and immutable.
 */
export async function adminUpdateQrCode(
  id: string,
  rawTargetUrl: string,
  preferredType?: AppType,
  label?: string
): Promise<{ success: boolean; record?: QrCodeRecord }> {
  const smartLink = processSmartLink(rawTargetUrl, preferredType);

  try {
    const res = await fetch(`/api/qr/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_url: smartLink.schemeUrl,
        app_type: smartLink.appType,
        label,
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
    target_url: smartLink.schemeUrl,
    app_type: smartLink.appType,
    is_active: true,
    label: label !== undefined ? label : current.label,
    updated_at: new Date().toISOString(),
  };

  try {
    const updateData: any = {
      target_url: smartLink.schemeUrl,
      app_type: smartLink.appType,
      is_active: true,
      updated_at: updatedRecord.updated_at,
    };
    if (label !== undefined) updateData.label = label;
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
 * Record a scan count
 */
export async function recordQrScan(id: string): Promise<void> {
  try {
    await fetch(`/api/qr/${encodeURIComponent(id)}/scan`, { method: 'POST' });
  } catch {
    // Non-blocking
  }

  try {
    await updateDoc(doc(db, 'qr_codes', id), {
      total_scans: increment(1),
    });
  } catch {}

  const cache = getLocalCache();
  if (cache[id]) {
    cache[id].total_scans = (cache[id].total_scans || 0) + 1;
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
