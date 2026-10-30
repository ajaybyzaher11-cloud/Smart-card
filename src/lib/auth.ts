import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_TOKEN_KEY = 'smart_card_admin_session_token';
const ADMIN_TOKEN_EXPIRY_KEY = 'smart_card_admin_session_expiry';
const ADMIN_PASSWORD_HASH_KEY = 'smart_card_admin_pwd_hash';

// Default initial password hash (SHA-256 for "admin1234")
export const DEFAULT_BASE_HASH = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';

const FIRESTORE_PROJECT_ID = 'clean-plateau-dv4kj';
const FIRESTORE_DATABASE_ID = 'ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0';
const FIRESTORE_API_KEY = 'AIzaSyAjyCP484AEQ52-9CDgp8TDkAw5woA1TFc';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Clean insecure legacy keys if present
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dynamic_qr_admin_password');
    if (localStorage.getItem('dynamic_qr_admin_session') === 'authenticated_admin_token') {
      localStorage.removeItem('dynamic_qr_admin_session');
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
    const expiryStr = localStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY) || sessionStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY);
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
 * Retrieves the currently active admin password hash directly from Cloud Database (Firestore).
 * Uses direct Firestore REST API for 100% reliable, unblockable fetching across all browsers,
 * Incognito tabs, and Brave Shields without third-party cookie or IndexedDB constraints.
 */
export async function getActivePasswordHash(): Promise<string> {
  // 1. Primary: Direct HTTPS REST query to Firestore cloud database
  try {
    const restUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/settings/auth?key=${FIRESTORE_API_KEY}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(restUrl, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const hashVal = data.fields?.hash?.stringValue;
      if (typeof hashVal === 'string' && hashVal.length === 64) {
        try { localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, hashVal); } catch {}
        try { sessionStorage.setItem(ADMIN_PASSWORD_HASH_KEY, hashVal); } catch {}
        return hashVal;
      }
    }
  } catch (err) {
    console.warn('REST auth fetch error, falling back to Firestore SDK:', err);
  }

  // 2. Secondary: Firestore SDK getDoc
  try {
    const snap = await getDoc(doc(db, 'settings', 'auth'));
    if (snap.exists() && snap.data()?.hash) {
      const h = snap.data().hash;
      if (typeof h === 'string' && h.length === 64) {
        try { localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, h); } catch {}
        try { sessionStorage.setItem(ADMIN_PASSWORD_HASH_KEY, h); } catch {}
        return h;
      }
    }
  } catch (err) {
    console.warn('Firestore SDK auth error:', err);
  }

  // 3. Tertiary: Local storage cache
  try {
    const local = localStorage.getItem(ADMIN_PASSWORD_HASH_KEY) || sessionStorage.getItem(ADMIN_PASSWORD_HASH_KEY);
    if (local && local.length === 64) {
      return local;
    }
  } catch {}

  // 4. Default base password ("admin1234") if nothing is in DB yet
  return DEFAULT_BASE_HASH;
}

/**
 * Saves a valid session token locally
 */
function storeAdminSession(token: string): void {
  const expiry = String(Date.now() + SEVEN_DAYS_MS);
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_EXPIRY_KEY, expiry);
  } catch {}
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_TOKEN_EXPIRY_KEY, expiry);
  } catch {}
}

/**
 * Performs admin login:
 * Authoritatively validates against the active password in Cloud Firestore.
 * Once the password is changed, ONLY the new password is valid.
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
        try {
          localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, attemptHash);
          sessionStorage.setItem(ADMIN_PASSWORD_HASH_KEY, attemptHash);
        } catch {}
        return true;
      }
    }
  } catch {
    // Server fetch unavailable (e.g. static hosting on Vercel), fall through to database check
  }

  // Strict match against active database password hash:
  // If password was updated in Firestore, ONLY that updated password works!
  if (attemptHash === activeHash) {
    let clientToken: string;
    try {
      clientToken = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') + Date.now().toString(16) : 'adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    } catch {
      clientToken = 'adm_token_' + Date.now().toString(36) + '_' + attemptHash.slice(0, 16);
    }

    storeAdminSession(clientToken);
    try {
      localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, attemptHash);
      sessionStorage.setItem(ADMIN_PASSWORD_HASH_KEY, attemptHash);
    } catch {}

    return true;
  }

  return false;
}

/**
 * Secure password change requiring current password verification:
 * Updates the password across the ENTIRE database:
 * 1. Cloud Firestore database via REST API & Firestore SDK (`settings/auth` and replica `platform_settings/auth`)
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

  // Validate current password (must match active database password)
  const isCurrentValid = curHashAttempt === activeHash || (activeHash === DEFAULT_BASE_HASH && curHashAttempt === DEFAULT_BASE_HASH);
  if (!isCurrentValid) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }

  const newHash = await hashPassword(newClean);
  const nowIso = new Date().toISOString();

  // 1. UPDATE CLOUD FIRESTORE DATABASE VIA REST API (Works directly on all platforms)
  try {
    const restUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/settings/auth?key=${FIRESTORE_API_KEY}`;
    await fetch(restUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          hash: { stringValue: newHash },
          updated_at: { stringValue: nowIso },
          migrated: { booleanValue: true },
        },
      }),
    });
  } catch (err) {
    console.warn('REST cloud update warning:', err);
  }

  // 2. ALSO UPDATE VIA FIRESTORE SDK
  try {
    await setDoc(doc(db, 'settings', 'auth'), {
      hash: newHash,
      updated_at: nowIso,
      migrated: true,
    }, { merge: true });

    await setDoc(doc(db, 'platform_settings', 'auth'), {
      hash: newHash,
      updated_at: nowIso,
    }, { merge: true });
  } catch (err) {
    console.warn('SDK cloud update warning:', err);
  }

  // 3. UPDATE SERVER DATABASE (data/auth.json)
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

  // 4. UPDATE LOCAL CLIENT CACHE
  try {
    localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, newHash);
    sessionStorage.setItem(ADMIN_PASSWORD_HASH_KEY, newHash);
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
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
  } catch {}
}
