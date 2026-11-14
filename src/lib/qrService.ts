import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AppType, QrCodeRecord, PlatformSettings, WalletItem } from '../types/qr';
import { processSmartLink } from './deepLinks';
import { authFetch } from './auth';
import firebaseConfig from '../../firebase-applet-config.json';

const LOCAL_STORAGE_KEY = 'smart_qr_codes_local_cache';
const SETTINGS_CACHE_KEY = 'smart_qr_platform_settings';

// Helper for offline caching with defensive sanitization
function getLocalCache(): Record<string, QrCodeRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const clean: Record<string, QrCodeRecord> = {};
    if (parsed && typeof parsed === 'object') {
      Object.keys(parsed).forEach((k) => {
        if (k && k !== 'undefined' && k !== 'null' && parsed[k]) {
          const recId = parsed[k].id || k;
          if (recId && recId !== 'undefined' && recId !== 'null') {
            clean[recId] = { ...parsed[k], id: recId };
          }
        }
      });
    }
    return clean;
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
 * Recursively strips undefined values from objects/arrays so Firestore never rejects a write.
 */
function cleanForFirestore<T>(val: T): T {
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (val !== null && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = cleanForFirestore(v);
      }
    }
    return out as T;
  }
  return val;
}

function getFirestoreRestConfig() {
  const pId = firebaseConfig?.projectId || 'clean-plateau-dv4kj';
  const dbId = firebaseConfig?.firestoreDatabaseId || 'ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0';
  const apiKey = firebaseConfig?.apiKey || 'AIzaSyAjyCP484AEQ52-9CDgp8TDkAw5woA1TFc';
  return { pId, dbId, apiKey };
}

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const vals = val.arrayValue?.values || [];
    return vals.map(parseFirestoreValue).filter((v: any) => v !== undefined);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      const parsed = parseFirestoreValue(v);
      if (parsed !== undefined) obj[k] = parsed;
    }
    return obj;
  }
  return undefined;
}

function firestoreRestDocToQrRecord(id: string, docJson: any): QrCodeRecord | null {
  if (!docJson || !docJson.fields) return null;
  const parsed: Record<string, any> = {};
  for (const [k, v] of Object.entries(docJson.fields)) {
    const pv = parseFirestoreValue(v);
    if (pv !== undefined) parsed[k] = pv;
  }
  return {
    created_at: parsed.created_at || new Date().toISOString(),
    total_scans: typeof parsed.total_scans === 'number' ? parsed.total_scans : 0,
    is_active: Boolean(parsed.is_active),
    target_url: parsed.target_url ?? null,
    ...parsed,
    id: parsed.id || id,
  } as QrCodeRecord;
}

function toFirestoreValue(val: any): any {
  if (val === null) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map(toFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

async function fetchQrFromFirestoreRest(cleanId: string): Promise<QrCodeRecord | null> {
  try {
    const { pId, dbId, apiKey } = getFirestoreRestConfig();
    const url = `https://firestore.googleapis.com/v1/projects/${pId}/databases/${dbId}/documents/qr_codes/${encodeURIComponent(cleanId)}?key=${apiKey}&t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return firestoreRestDocToQrRecord(cleanId, json);
  } catch {
    return null;
  }
}

async function writeQrToFirestoreRest(cleanId: string, record: QrCodeRecord): Promise<boolean> {
  try {
    const { pId, dbId, apiKey } = getFirestoreRestConfig();
    const url = `https://firestore.googleapis.com/v1/projects/${pId}/databases/${dbId}/documents/qr_codes/${encodeURIComponent(cleanId)}?key=${apiKey}`;
    const clean = cleanForFirestore(record);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(clean)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
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
    const res = await authFetch('/api/qr/bulk', {
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
 * Fetch a single QR Code by ID (searches Firestore and Server API in parallel, with local cache fallback)
 */
export async function getQrCode(id: string): Promise<QrCodeRecord | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;

  // 0. Pre-injected server record for instantaneous 0ms resolution
  if (typeof window !== 'undefined' && (window as any).__INITIAL_QR_RECORD__) {
    const initialRec = (window as any).__INITIAL_QR_RECORD__;
    if (initialRec && initialRec.id === cleanId) {
      const cache = getLocalCache();
      cache[cleanId] = initialRec;
      saveLocalCache(cache);
      return initialRec;
    }
  }

  // 1. Fetch from Firestore Server, Firestore REST API, and Express Server API concurrently
  const docRef = doc(db, 'qr_codes', cleanId);
  const firestoreSdkFetch = getDocFromServer(docRef)
    .then((snap) => (snap.exists() ? (snap.data() as QrCodeRecord) : null))
    .catch(() =>
      getDoc(docRef)
        .then((snap) => (snap.exists() ? (snap.data() as QrCodeRecord) : null))
        .catch(() => null)
    );

  const firestoreRestFetch = fetchQrFromFirestoreRest(cleanId);

  const serverFetch = fetch(`/api/qr/${encodeURIComponent(cleanId)}?t=${Date.now()}`, { cache: 'no-store' })
    .then(async (res) => {
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        return (json.success && json.data) ? (json.data as QrCodeRecord) : null;
      }
      return null;
    })
    .catch(() => null);

  try {
    const results = await Promise.allSettled([firestoreRestFetch, firestoreSdkFetch, serverFetch]);
    const candidates = results
      .filter((r): r is PromiseFulfilledResult<QrCodeRecord | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((r): r is QrCodeRecord => Boolean(r && r.id));

    if (candidates.length > 0) {
      // Pick the candidate with the newest updated_at/created_at timestamp (REST listed first so ties favor REST)
      const bestRecord = candidates.reduce((best, curr) => {
        const bestTime = new Date(best.updated_at || best.created_at || 0).getTime();
        const currTime = new Date(curr.updated_at || curr.created_at || 0).getTime();
        return currTime > bestTime ? curr : best;
      });

      const cache = getLocalCache();
      cache[cleanId] = bestRecord;
      saveLocalCache(cache);
      return bestRecord;
    }
  } catch (err) {
    console.warn('Concurrent QR fetch warning:', err);
  }

  // 2. Fallback to local cache only if all network sources temporarily unreachable
  const cache = getLocalCache();
  if (cache[cleanId]) {
    return cache[cleanId];
  }

  // 3. Clean inactive record if completely new
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
 * Strict lookup for an existing QR card in the database or cache.
 * Returns null if the card was never created/registered.
 */
export async function lookupExistingQrCode(id: string): Promise<QrCodeRecord | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;

  // 1. Check local cache
  const cache = getLocalCache();
  if (cache[cleanId] && cache[cleanId].id) {
    return cache[cleanId];
  }

  // 2. Query Firestore and Server concurrently
  const firestoreFetch = getDoc(doc(db, 'qr_codes', cleanId))
    .then((snap) => (snap.exists() ? (snap.data() as QrCodeRecord) : null))
    .catch(() => null);

  const serverFetch = fetch(`/api/qr/${encodeURIComponent(cleanId)}`)
    .then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        return (json.success && json.data) ? (json.data as QrCodeRecord) : null;
      }
      return null;
    })
    .catch(() => null);

  try {
    const results = await Promise.allSettled([firestoreFetch, serverFetch]);
    const fsRecord = results[0].status === 'fulfilled' ? results[0].value : null;
    const srvRecord = results[1].status === 'fulfilled' ? results[1].value : null;

    const found = fsRecord || srvRecord;
    if (found) {
      cache[cleanId] = found;
      saveLocalCache(cache);
      return found;
    }
  } catch {}

  return null;
}

/**
 * Fetch all QR codes for Admin view (Firestore + API + Local cache)
 */
export async function fetchAllQrCodes(): Promise<QrCodeRecord[]> {
  const mergedMap: Record<string, QrCodeRecord> = {};

  // 1. Primary: Direct Cloud Firestore fetch (Source of Truth)
  try {
    const snap = await getDocs(collection(db, 'qr_codes'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data();
        const id = data?.id || d.id;
        if (id && id !== 'undefined' && id !== 'null') {
          const item: QrCodeRecord = {
            created_at: data.created_at || new Date().toISOString(),
            total_scans: data.total_scans || 0,
            is_active: Boolean(data.is_active),
            target_url: data.target_url || null,
            ...data,
            id,
          };
          mergedMap[id] = item;
        }
      });
      // Authoritatively update cache to exclude any deleted codes
      saveLocalCache(mergedMap);
      return Object.values(mergedMap)
        .filter((r): r is QrCodeRecord => Boolean(r && r.id && r.id !== 'undefined' && r.id !== 'null'))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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

  return Object.values(mergedMap)
    .filter((r): r is QrCodeRecord => Boolean(r && r.id && r.id !== 'undefined' && r.id !== 'null'))
    .sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
}

/**
 * Customer first-time scan activation.
 * Saves directly to Firestore, local cache, and backend API.
 */
export async function activateQrCode(
  id: string,
  rawInput: string,
  preferredType?: AppType,
  wallets?: WalletItem[]
): Promise<{ success: boolean; error?: string; record?: QrCodeRecord }> {
  const cleanId = id.trim();
  const isWallet = preferredType === 'wallet' || (Array.isArray(wallets) && wallets.length > 0);
  const effectiveAppType = isWallet ? 'wallet' : (preferredType || 'website');
  const effectiveRawInput = (isWallet && Array.isArray(wallets) && wallets.length > 0)
    ? wallets[0].phone
    : rawInput;
  const smartLink = processSmartLink(effectiveRawInput, effectiveAppType);
  const now = new Date();
  const existing = await getQrCode(cleanId);

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
    : (smartLink.schemeUrl || smartLink.fallbackUrl || effectiveRawInput.trim());

  const cleanWallets = (isWallet && Array.isArray(wallets) && wallets.length > 0)
    ? wallets.map((w) => ({
        phone: (w.phone || '').trim(),
        provider: w.provider || 'vodafone',
        ownerName: (w.ownerName || '').trim(),
      }))
    : [];

  const updatedRecord: QrCodeRecord = cleanForFirestore({
    id: cleanId,
    is_active: true,
    target_url: effectiveTargetUrl,
    app_type: effectiveAppType,
    updated_at: now.toISOString(),
    created_at: existing?.created_at || now.toISOString(),
    total_scans: (existing && existing.is_active && existing.total_scans !== undefined) 
      ? existing.total_scans 
      : 0,
    expires_at,
    subscription_months,
    wallets: cleanWallets,
  });

  // 1. Write to Cloud Firestore via SDK (full replace) + REST API concurrently
  const sdkWrite = setDoc(doc(db, 'qr_codes', cleanId), updatedRecord).catch((fsErr) => {
    console.warn('Firestore direct activate write warning:', fsErr);
  });
  const restWrite = writeQrToFirestoreRest(cleanId, updatedRecord);

  // 2. Sync to Server API
  const serverWrite = fetch(`/api/qr/${encodeURIComponent(cleanId)}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_url: effectiveTargetUrl,
      app_type: effectiveAppType,
      expires_at,
      subscription_months,
      wallets: cleanWallets,
    }),
  }).catch(() => {});

  await Promise.allSettled([sdkWrite, restWrite, serverWrite]);

  // 3. Update local cache
  const cache = getLocalCache();
  cache[cleanId] = updatedRecord;
  saveLocalCache(cache);

  return { success: true, record: updatedRecord };
}

/**
 * Admin Quick Edit: Modify Target URL, label, and subscription expiry.
 * ID is strictly read-only and immutable.
 * Saves simultaneously to Firestore (SDK + REST) AND Server API with full field overwrite so no stale link ever remains.
 */
export async function adminUpdateQrCode(
  id: string,
  rawTargetUrl: string,
  preferredType?: AppType,
  label?: string,
  expiresAt?: string | null,
  subscriptionMonths?: number,
  wallets?: WalletItem[]
): Promise<{ success: boolean; record?: QrCodeRecord }> {
  const cleanId = id.trim();
  const isWallet = preferredType === 'wallet' || (Array.isArray(wallets) && wallets.length > 0);
  const effectiveAppType: AppType = isWallet ? 'wallet' : (preferredType || 'website');

  const sourceInput = (isWallet && Array.isArray(wallets) && wallets.length > 0)
    ? wallets[0].phone
    : rawTargetUrl;

  const smartLink = processSmartLink(sourceInput, effectiveAppType);
  const effectiveTargetUrl = (smartLink.isWalletCard && smartLink.walletPhone)
    ? smartLink.walletPhone
    : (smartLink.schemeUrl || smartLink.fallbackUrl || sourceInput.trim());

  const current: QrCodeRecord = (await getQrCode(cleanId)) || {
    id: cleanId,
    created_at: new Date().toISOString(),
    total_scans: 0,
    is_active: true,
    target_url: null,
  };

  const resolvedWallets: WalletItem[] = isWallet
    ? (wallets !== undefined
        ? wallets.map((w) => ({
            phone: (w.phone || '').trim(),
            provider: w.provider || 'vodafone',
            ownerName: (w.ownerName || '').trim(),
          }))
        : (current.wallets || []))
    : [];

  const updatedRecord: QrCodeRecord = cleanForFirestore({
    ...current,
    id: cleanId,
    target_url: effectiveTargetUrl,
    app_type: effectiveAppType,
    is_active: true,
    label: label !== undefined ? label : (current.label ?? ''),
    expires_at: expiresAt !== undefined ? expiresAt : (current.expires_at ?? null),
    subscription_months: subscriptionMonths !== undefined
      ? subscriptionMonths
      : (current.subscription_months ?? 1),
    updated_at: new Date().toISOString(),
    wallets: resolvedWallets,
  });

  // 1. ALWAYS write full sanitized record to Cloud Firestore (SDK setDoc overwrite + REST PATCH)
  const sdkWrite = setDoc(doc(db, 'qr_codes', cleanId), updatedRecord).catch((fsErr) => {
    console.warn('Firestore admin update warning:', fsErr);
  });
  const restWrite = writeQrToFirestoreRest(cleanId, updatedRecord);

  // 2. ALWAYS sync to Server API if running full-stack Node/Express
  const serverWrite = authFetch(`/api/qr/${encodeURIComponent(cleanId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_url: effectiveTargetUrl,
      app_type: effectiveAppType,
      label: updatedRecord.label,
      expires_at: updatedRecord.expires_at,
      subscription_months: updatedRecord.subscription_months,
      wallets: resolvedWallets,
    }),
  }).catch((err) => {
    console.warn('Server admin update sync failed:', err);
  });

  await Promise.allSettled([sdkWrite, restWrite, serverWrite]);

  // 3. Update local cache
  const cache = getLocalCache();
  cache[cleanId] = updatedRecord;
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
    await setDoc(doc(db, 'qr_codes', id), {
      expires_at: newExpiresAt,
      subscription_months: updatedRecord.subscription_months,
      updated_at: updatedRecord.updated_at,
    }, { merge: true });
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
    await setDoc(doc(db, 'qr_codes', id), {
      expires_at: expiresAt,
      updated_at: updatedRecord.updated_at,
    }, { merge: true });
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
        // Authoritative live snapshot: populate strictly from current Firestore docs
        // so that deleted codes disappear immediately and are never kept as ghost records
        const liveMap: Record<string, QrCodeRecord> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          const id = data?.id || d.id;
          if (id && id !== 'undefined' && id !== 'null') {
            const item: QrCodeRecord = {
              created_at: data.created_at || new Date().toISOString(),
              total_scans: data.total_scans || 0,
              is_active: Boolean(data.is_active),
              target_url: data.target_url || null,
              ...data,
              id,
            };
            liveMap[id] = item;
          }
        });
        const list = Object.values(liveMap)
          .filter((item): item is QrCodeRecord => Boolean(item && item.id && item.id !== 'undefined' && item.id !== 'null'))
          .sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
        saveLocalCache(liveMap);
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
 * Real-time live subscription for a single QR code document.
 * Immediately pushes updates (e.g. when Admin changes number or wallet operator)
 * so customer screens or active view updates instantly without reload!
 */
export function subscribeToSingleQrCode(
  id: string,
  callback: (record: QrCodeRecord | null) => void
): () => void {
  const cleanId = id.trim();
  if (!cleanId) return () => {};

  try {
    const docRef = doc(db, 'qr_codes', cleanId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const rec = snapshot.data() as QrCodeRecord;
          const cache = getLocalCache();
          cache[cleanId] = rec;
          saveLocalCache(cache);
          callback(rec);
        }
      },
      (err) => {
        console.warn('Single QR live subscription warning:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('subscribeToSingleQrCode error:', err);
    return () => {};
  }
}

/**
 * Record a scan count authoritatively in Firestore & local cache.
 * CRITICAL RULE: NEVER count scans before activation (is_active: false), even if scanned 1,000,000 times!
 * Only counts once per scan event, debounced against duplicate reloads/renders.
 */
export async function recordQrScan(id: string): Promise<void> {
  const cleanId = id.trim();
  if (!cleanId) return;

  // 1. Session / navigation deduplication: prevent double-counting on browser reload or re-renders
  if (typeof window !== 'undefined') {
    const sessionKey = `scanned_session_${cleanId}`;
    const lastScannedTime = sessionStorage.getItem(sessionKey);
    const now = Date.now();
    if (lastScannedTime && (now - parseInt(lastScannedTime, 10)) < 30000) {
      // Debounce: already counted within 30 seconds on this device/session
      return;
    }
    sessionStorage.setItem(sessionKey, now.toString());
  }

  // 2. Strict check: verify the card is actually active before incrementing!
  const cache = getLocalCache();
  const cached = cache[cleanId];
  if (cached && !cached.is_active) {
    // Card is not active yet: NEVER count scans before activation!
    return;
  }

  // Check Firestore document state if not in cache or ambiguous
  try {
    const docSnap = await getDoc(doc(db, 'qr_codes', cleanId));
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (!data.is_active) {
      // Card is not active: DO NOT count scan!
      return;
    }
  } catch {
    if (!cached || !cached.is_active) return;
  }

  // 3. Direct Firestore atomic increment with setDoc merge (bulletproof on Vercel)
  try {
    const qrRef = doc(db, 'qr_codes', cleanId);
    await setDoc(qrRef, {
      total_scans: increment(1),
      last_scanned_at: new Date().toISOString(),
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore scan increment warning:', fsErr);
  }

  // 4. Also notify backend API if available (keepalive preserves request during navigation)
  try {
    fetch(`/api/qr/${encodeURIComponent(cleanId)}/scan`, { 
      method: 'POST',
      keepalive: true 
    }).catch(() => {});
  } catch {}

  // 5. Update local cache
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
    const res = await authFetch(`/api/qr/${encodeURIComponent(id)}/reset-scans`, {
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
 * Delete a QR Code permanently from database (Firestore SDK + REST), server, and local cache.
 * Purges the code completely whether active (is_active: true) or inactive (is_active: false).
 */
export async function deleteQrCode(id: string): Promise<boolean> {
  const cleanId = id.trim();
  if (!cleanId) return false;

  // 1. Immediately purge from local cache
  const cache = getLocalCache();
  delete cache[cleanId];
  saveLocalCache(cache);

  // 2. Delete from Cloud Firestore via Firebase SDK
  const sdkPromise = deleteDoc(doc(db, 'qr_codes', cleanId)).catch((fsErr) => {
    console.warn('Firestore SDK deleteDoc warning:', fsErr);
  });

  // 3. Delete directly from Cloud Firestore via REST API (ensures immediate backend purge)
  const pId = firebaseConfig?.projectId || 'clean-plateau-dv4kj';
  const dbId = firebaseConfig?.firestoreDatabaseId || 'ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0';
  const apiKey = firebaseConfig?.apiKey || 'AIzaSyAjyCP484AEQ52-9CDgp8TDkAw5woA1TFc';
  const restUrl = `https://firestore.googleapis.com/v1/projects/${pId}/databases/${dbId}/documents/qr_codes/${encodeURIComponent(cleanId)}?key=${apiKey}`;
  
  const restPromise = fetch(restUrl, { method: 'DELETE' }).catch((restErr) => {
    console.warn('Firestore REST delete warning:', restErr);
  });

  // 4. Delete from Backend Server API
  const serverPromise = authFetch(`/api/qr/${encodeURIComponent(cleanId)}`, {
    method: 'DELETE',
  }).catch((err) => {
    console.warn('Server delete request warning:', err);
  });

  // Wait for all delete operations to complete concurrently
  await Promise.allSettled([sdkPromise, restPromise, serverPromise]);

  // Clean local cache again defensively
  const finalCache = getLocalCache();
  delete finalCache[cleanId];
  saveLocalCache(finalCache);

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
  public_domain_url: 'https://smart-card-inky.vercel.app',
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
    const res = await authFetch('/api/settings', {
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
