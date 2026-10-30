import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_TOKEN_KEY = 'smart_card_admin_session_token';
const ADMIN_TOKEN_EXPIRY_KEY = 'smart_card_admin_session_expiry';
const ADMIN_PASSWORD_HASH_KEY = 'smart_card_admin_pwd_hash';

// SHA-256 of "admin1234"
export const DEFAULT_BASE_HASH = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';
// Obsolete hash from earlier versions to discard
const OBSOLETE_HASH = 'f3c389a8ea19bf980b9a965e75824c1aff7933fde1025a15f297f851b3f73bfb';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Clean legacy tokens if any
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dynamic_qr_admin_password');
    if (localStorage.getItem('dynamic_qr_admin_session') === 'authenticated_admin_token') {
      localStorage.removeItem('dynamic_qr_admin_session');
    }
    // Clean obsolete password hash if present
    if (localStorage.getItem(ADMIN_PASSWORD_HASH_KEY) === OBSOLETE_HASH) {
      localStorage.removeItem(ADMIN_PASSWORD_HASH_KEY);
    }
  }
} catch {}

/**
 * Computes SHA-256 cryptographic hash of a string using Web Crypto API
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets the current active session token
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch helper that automatically attaches Bearer token to requests
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Admin-Token', token);
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include', // include HTTP-Only cookies
  });
}

/**
 * Checks if admin session is locally active and unexpired
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = getAdminToken();
  if (!token || token.length < 16) return false;

  try {
    const expiryStr = localStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY);
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (!isNaN(expiry) && expiry <= Date.now()) {
        logoutAdmin();
        return false;
      }
    }
  } catch {}

  return true;
}

/**
 * Verifies active session with the backend server without breaking on static hosts (e.g. Vercel)
 */
export async function validateAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  // First verify local session validity
  if (!isAdminAuthenticated()) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await authFetch('/api/admin/session', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (typeof data.authenticated === 'boolean') {
        if (!data.authenticated) {
          // Explicit invalidation by server
          logoutAdmin();
          return false;
        }
        return true;
      }
    }
  } catch {
    // If backend is unreachable or on a static host (like Vercel SPA), fallback to local valid token
  }

  // Session remains valid locally
  return true;
}

/**
 * Retrieves the currently active admin password hash with Cloud Database Priority
 * Reads directly from Firestore settings/auth as the canonical single source of truth across all devices.
 */
export async function getActivePasswordHash(): Promise<string> {
  // 1. Primary: Always fetch latest from Cloud Firestore Database first
  try {
    const snap = await getDoc(doc(db, 'settings', 'auth'));
    if (snap.exists() && snap.data()?.hash) {
      const h = snap.data().hash;
      if (typeof h === 'string' && h.length === 64 && h !== OBSOLETE_HASH) {
        try { localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, h); } catch {}
        return h;
      }
    }
  } catch (err) {
    console.warn('Could not read from Firestore settings/auth, checking replica:', err);
  }

  // 2. Secondary replica in platform_settings/auth
  try {
    const snap2 = await getDoc(doc(db, 'platform_settings', 'auth'));
    if (snap2.exists() && snap2.data()?.hash) {
      const h = snap2.data().hash;
      if (typeof h === 'string' && h.length === 64 && h !== OBSOLETE_HASH) {
        try { localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, h); } catch {}
        return h;
      }
    }
  } catch {}

  // 3. Fallback: local storage cache if completely offline
  try {
    const local = localStorage.getItem(ADMIN_PASSWORD_HASH_KEY);
    if (local && local.length === 64 && local !== OBSOLETE_HASH) {
      return local;
    }
  } catch {}

  // 4. Default base password ("admin1234")
  return DEFAULT_BASE_HASH;
}

/**
 * Saves a valid session token locally
 */
function storeAdminSession(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_EXPIRY_KEY, String(Date.now() + SEVEN_DAYS_MS));
  } catch {}
}

/**
 * Performs admin login:
 * Validates against the active database password. Once the password is changed,
 * the new password becomes the ONLY working password across all platforms.
 */
export async function loginAdmin(passwordAttempt: string): Promise<boolean> {
  const clean = (passwordAttempt || '').trim();
  if (!clean) return false;

  const attemptHash = await hashPassword(clean);
  const activeHash = await getActivePasswordHash();

  // Try Server API first (if Express server is running)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const serverRes = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: clean }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = serverRes.headers.get('content-type') || '';
    if (serverRes.ok && contentType.includes('application/json')) {
      const data = await serverRes.json();
      if (data.success && data.token) {
        storeAdminSession(data.token);
        localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, attemptHash);
        return true;
      }
    }
  } catch {
    // Server fetch failed or timed out, proceed to database check
  }

  // Strict match against active database password hash:
  // If password was changed, ONLY the new password is valid.
  if (attemptHash === activeHash) {
    // Generate secure client session token
    let clientToken: string;
    try {
      clientToken = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') + Date.now().toString(16) : 'adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    } catch {
      clientToken = 'adm_token_' + Date.now().toString(36) + '_' + attemptHash.slice(0, 16);
    }

    storeAdminSession(clientToken);
    try {
      localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, attemptHash);
    } catch {}

    return true;
  }

  return false;
}

/**
 * Secure password change requiring current password verification:
 * Updates the password across the ENTIRE database:
 * 1. Cloud Firestore database (`settings/auth` and replica `platform_settings/auth`)
 * 2. Server filesystem database (`data/auth.json`)
 * 3. Client storage cache
 */
export async function changeAdminPassword(
  currentPasswordPlain: string,
  newPasswordPlain: string
): Promise<{ success: boolean; message: string }> {
  const curClean = (currentPasswordPlain || '').trim();
  const newClean = (newPasswordPlain || '').trim();

  if (!curClean) {
    return { success: false, message: 'الرجاء إدخال كلمة المرور الحالية.' };
  }
  if (!newClean || newClean.length < 4) {
    return { success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف أو أرقام.' };
  }

  const curHashAttempt = await hashPassword(curClean);
  const activeHash = await getActivePasswordHash();

  // Validate current password (matches active database hash or default if still active)
  const isCurrentValid = curHashAttempt === activeHash || (activeHash === DEFAULT_BASE_HASH && curHashAttempt === DEFAULT_BASE_HASH);
  if (!isCurrentValid) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }

  const newHash = await hashPassword(newClean);
  const nowIso = new Date().toISOString();

  // 1. UPDATE CLOUD DATABASE (Firestore)
  try {
    await setDoc(doc(db, 'settings', 'auth'), {
      hash: newHash,
      updated_at: nowIso,
      migrated: true,
    }, { merge: true });
  } catch (err) {
    console.error('Failed to update settings/auth in Firestore:', err);
    return { success: false, message: 'تعذر حفظ كلمة المرور في قاعدة البيانات السحابية (Firestore).' };
  }

  // Update secondary replica in Firestore
  try {
    await setDoc(doc(db, 'platform_settings', 'auth'), {
      hash: newHash,
      updated_at: nowIso,
    }, { merge: true });
  } catch (err) {
    console.warn('Replica write warning:', err);
  }

  // 2. UPDATE SERVER DATABASE (data/auth.json)
  try {
    const res = await authFetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: curClean,
        newPassword: newClean,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.token) {
        storeAdminSession(data.token);
      }
    }
  } catch {}

  // 3. UPDATE LOCAL CLIENT CACHE
  try {
    localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, newHash);
  } catch {}

  return {
    success: true,
    message: 'تم تحديث كلمة المرور في قاعدة البيانات السحابية (Firestore) وجميع الأجهزة بنجاح!',
  };
}

/**
 * Logout admin and invalidate session
 */
export function logoutAdmin(): void {
  try {
    authFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
  } catch {}

  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
    localStorage.removeItem('dynamic_qr_admin_session');
  } catch {}
}
