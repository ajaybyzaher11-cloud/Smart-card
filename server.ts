import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'qr_codes.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

app.use(express.json({ limit: '1mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Password Hash (SHA-256 for "admin1234")
const DEFAULT_BASE_HASH = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';

function hashString(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// Rate Limiting Guards
const generalApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة.' },
});

const bulkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'تم تجاوز الحد المسموح لتوليد الأكواد بالجملة، يرجى المحاولة لاحقاً.' },
});

app.use('/api/', generalApiLimiter);

// --- Session Store & Auth Management ---
interface AdminSession {
  token: string;
  created_at: string;
  expires_at: number; // timestamp in ms
}

function loadSessions(): Record<string, AdminSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      const now = Date.now();
      const valid: Record<string, AdminSession> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && (v as AdminSession).expires_at > now) {
          valid[k] = v as AdminSession;
        }
      }
      return valid;
    }
  } catch {}
  return {};
}

function saveSessions(sessions: Record<string, AdminSession>): void {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save sessions:', err);
  }
}

let firebaseConfig: any = null;
try {
  const cfgPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch {}

async function syncPasswordToFirestore(newHash: string): Promise<void> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) return;
  try {
    const pId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const key = firebaseConfig.apiKey;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${pId}/databases/${dbId}/documents/settings/auth?key=${key}`;
    await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          hash: { stringValue: newHash },
          updated_at: { stringValue: new Date().toISOString() },
          migrated: { booleanValue: true },
        },
      }),
    });
  } catch (err) {
    console.warn('Failed to sync password to Firestore from server:', err);
  }
}

async function syncPasswordFromFirestore(): Promise<void> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) return;
  try {
    const pId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const key = firebaseConfig.apiKey;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${pId}/databases/${dbId}/documents/settings/auth?key=${key}`;
    const res = await fetch(docUrl);
    if (res.ok) {
      const data = await res.json();
      const hashVal = data.fields?.hash?.stringValue;
      if (hashVal && hashVal.length === 64) {
        fs.writeFileSync(AUTH_FILE, JSON.stringify({ hash: hashVal, updated_at: new Date().toISOString() }, null, 2), 'utf-8');
      }
    }
  } catch {}
}
// Sync with Firestore on startup
syncPasswordFromFirestore().catch(() => {});

function getStoredPasswordHash(): string {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (data && typeof data.hash === 'string' && data.hash.length === 64) {
        return data.hash;
      }
    }
  } catch {}
  return DEFAULT_BASE_HASH;
}

function saveStoredPasswordHash(newHash: string): void {
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ hash: newHash, updated_at: new Date().toISOString() }, null, 2), 'utf-8');
  syncPasswordToFirestore(newHash).catch(() => {});
}

// Cookie helper
function getCookieFromReq(req: express.Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Server-Side Authentication Middleware for Admin APIs
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  let token: string | null = null;

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check X-Admin-Token header
  if (!token && typeof req.headers['x-admin-token'] === 'string') {
    token = req.headers['x-admin-token'].trim();
  }

  // 3. Check admin_session cookie
  if (!token) {
    token = getCookieFromReq(req, 'admin_session');
  }

  if (!token || token.length < 32) {
    return res.status(401).json({
      success: false,
      error: 'غير مصرح: يجب تسجيل الدخول كمسؤول أولاً (Unauthorized Session)',
    });
  }

  const sessions = loadSessions();
  const session = sessions[token];
  if (!session || session.expires_at <= Date.now()) {
    return res.status(401).json({
      success: false,
      error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً (Session Expired)',
    });
  }

  // Session valid
  next();
}

// --- Platform Settings ---
interface PlatformSettings {
  developer_whatsapp: string;
  developer_contact_url: string;
  developer_title?: string;
  support_message?: string;
  public_domain_url?: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  developer_whatsapp: '01550523365',
  developer_contact_url: 'https://wa.me/201550523365',
  developer_title: 'تواصل مع المطور',
  support_message: 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
  public_domain_url: 'https://smart-card-inky.vercel.app',
};

function loadSettings(): PlatformSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error('Failed to read settings file:', err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: PlatformSettings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write settings file:', err);
  }
}

if (!fs.existsSync(SETTINGS_FILE)) {
  saveSettings(DEFAULT_SETTINGS);
}

// --- QR Database ---
interface QrRecord {
  id: string;
  is_active: boolean;
  target_url: string | null;
  app_type?: string;
  label?: string;
  created_at: string;
  updated_at?: string;
  total_scans: number;
  expires_at?: string | null;
  subscription_months?: number;
}

function loadDatabase(): Record<string, QrRecord> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read db file:', err);
  }
  return {};
}

function saveDatabase(db: Record<string, QrRecord>): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db file:', err);
  }
}

if (!fs.existsSync(DB_FILE)) {
  saveDatabase({});
}

// Safe URL validator
function isSafeUrlScheme(url: string): boolean {
  if (!url) return false;
  const sanitized = url.trim().replace(/[\x00-\x1f\x7f]/g, '').toLowerCase();
  const dangerous = /^(?:javascript|data|vbscript|file|blob|about):/i;
  return !dangerous.test(sanitized);
}

function formatTikTokTargetUrl(input: string): string {
  if (!input) return '';
  let clean = input
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!clean) return '';

  if (/^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\//i.test(clean)) {
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }

  if (clean.includes('tiktok.com')) {
    const parts = clean.split('?');
    const pathPart = parts[0];
    const queryPart = parts[1] ? `?${parts[1]}` : '';

    const match = pathPart.match(/tiktok\.com\/(?:@)?([a-zA-Z0-9_.-]+)/i);
    if (match && match[1]) {
      const segment = match[1].replace(/^@/, '').toLowerCase().trim();
      const reservedRoutes = ['discover', 'explore', 'upload', 'live', 'tag', 'music', 'about', 'legal', 'business', 'share', 'foryou'];
      if (!reservedRoutes.includes(segment)) {
        return `https://www.tiktok.com/@${segment}${queryPart}`;
      }
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }

  let username = clean.replace(/^[/@]+/, '').split('?')[0].split('/')[0].trim();
  username = username.replace(/[^\w.-]/g, '').toLowerCase().trim();

  if (username) {
    return `https://www.tiktok.com/@${username}`;
  }

  return clean;
}

function formatInstagramTargetUrl(input: string): string {
  if (!input) return '';
  let clean = input
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  if (clean.includes('instagram.com/')) {
    const match = clean.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
    if (match && match[1]) {
      const user = match[1].replace(/^@/, '').toLowerCase().trim();
      return `https://www.instagram.com/${user}/`;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }
  let username = clean.replace(/^[/@]+/, '').split('?')[0].split('/')[0].trim();
  username = username.replace(/[^\w.]/g, '').toLowerCase().trim();
  if (username) {
    return `https://www.instagram.com/${username}/`;
  }
  return clean;
}

function formatTelegramTargetUrl(input: string): string {
  if (!input) return '';
  let clean = input
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  if (clean.includes('t.me/') || clean.includes('telegram.me/')) {
    const match = clean.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
    if (match && match[1]) {
      return `https://t.me/${match[1].replace(/^@/, '').toLowerCase().trim()}`;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }
  let username = clean.replace(/^[/@]+/, '').split('?')[0].split('/')[0].trim();
  username = username.replace(/[^\w]/g, '').toLowerCase().trim();
  if (username) {
    return `https://t.me/${username}`;
  }
  return clean;
}

function formatSnapchatTargetUrl(input: string): string {
  if (!input) return '';
  let clean = input
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  if (clean.includes('snapchat.com/add/')) {
    const match = clean.match(/snapchat\.com\/add\/([a-zA-Z0-9_.-]+)/i);
    if (match && match[1]) {
      return `https://www.snapchat.com/add/${match[1].replace(/^@/, '').toLowerCase().trim()}`;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }
  let username = clean.replace(/^[/@]+/, '').split('?')[0].split('/')[0].trim();
  username = username.replace(/[^\w.-]/g, '').toLowerCase().trim();
  if (username) {
    return `https://www.snapchat.com/add/${username}`;
  }
  return clean;
}

// --- AUTH APIS ---

// 1. Admin Login (Server authoritative verification & token generation)
app.post('/api/admin/login', authRateLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال كلمة المرور' });
  }

  const attemptHash = hashString(password.trim());
  const storedHash = getStoredPasswordHash();

  if (attemptHash !== storedHash) {
    return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
  }

  // Generate cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const sessions = loadSessions();
  sessions[token] = {
    token,
    created_at: new Date().toISOString(),
    expires_at: Date.now() + sevenDays,
  };
  saveSessions(sessions);

  // Set HTTP-Only secure cookie
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sevenDays,
    path: '/',
  });

  return res.json({
    success: true,
    token,
    message: 'تم تسجيل الدخول بنجاح',
  });
});

// 2. Validate current session
app.get('/api/admin/session', (req, res) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token && typeof req.headers['x-admin-token'] === 'string') {
    token = req.headers['x-admin-token'].trim();
  }
  if (!token) {
    token = getCookieFromReq(req, 'admin_session');
  }

  if (!token) {
    return res.json({ success: true, authenticated: false });
  }

  const sessions = loadSessions();
  const session = sessions[token];
  const isValid = Boolean(session && session.expires_at > Date.now());
  return res.json({ success: true, authenticated: isValid });
});

// 3. Admin Logout
app.post('/api/admin/logout', (req, res) => {
  let token = getCookieFromReq(req, 'admin_session');
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (token) {
    const sessions = loadSessions();
    delete sessions[token];
    saveSessions(sessions);
  }
  res.clearCookie('admin_session', { path: '/' });
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// 4. Update Password (Protected & requires current password verification)
app.post('/api/admin/password', requireAdminAuth, authRateLimiter, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || typeof currentPassword !== 'string') {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال كلمة المرور الحالية' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف أو أرقام' });
  }

  const currentHash = getStoredPasswordHash();
  const attemptCurrentHash = hashString(currentPassword.trim());

  const isCurrentValid = attemptCurrentHash === currentHash || (currentHash === DEFAULT_BASE_HASH && attemptCurrentHash === DEFAULT_BASE_HASH);
  if (!isCurrentValid) {
    return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
  }

  const newHash = hashString(newPassword.trim());
  saveStoredPasswordHash(newHash);

  // Invalidate old sessions for maximum security
  saveSessions({});

  // Issue fresh session for the current admin
  const token = crypto.randomBytes(32).toString('hex');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const sessions = loadSessions();
  sessions[token] = {
    token,
    created_at: new Date().toISOString(),
    expires_at: Date.now() + sevenDays,
  };
  saveSessions(sessions);

  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sevenDays,
    path: '/',
  });

  return res.json({
    success: true,
    token,
    message: 'تم التحقق من كلمة المرور وتحديثها وتشفيرها بنجاح!',
  });
});

// --- QR & SETTINGS APIS ---

// Get all QR codes
app.get('/api/qr', (req, res) => {
  const db = loadDatabase();
  const list = Object.values(db).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ success: true, data: list });
});

// Get single QR code by ID
app.get('/api/qr/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDatabase();
  const record = db[id];
  if (!record) {
    return res.status(404).json({ success: false, error: 'الرمز غير موجود' });
  }
  res.json({ success: true, data: record });
});

// Bulk Generate QR codes (PROTECTED with requireAdminAuth & bulkRateLimiter)
app.post('/api/qr/bulk', requireAdminAuth, bulkRateLimiter, (req, res) => {
  const count = parseInt(req.body.count, 10);
  const subscriptionMonths = typeof req.body.subscription_months === 'number' ? req.body.subscription_months : 1;
  const providedExpiresAt = req.body.expires_at !== undefined ? req.body.expires_at : (
    subscriptionMonths > 0 ? new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000).toISOString() : null
  );

  if (isNaN(count) || count < 1) {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال رقم صحيح أكبر من صفر' });
  }

  const safeCount = Math.min(count, 500);
  const db = loadDatabase();
  const newRecords: QrRecord[] = [];

  for (let i = 0; i < safeCount; i++) {
    let id = nanoid(10).replace(/[^a-zA-Z0-9_-]/g, 'x');
    while (db[id]) {
      id = nanoid(10).replace(/[^a-zA-Z0-9_-]/g, 'x');
    }

    const record: QrRecord = {
      id,
      is_active: false,
      target_url: null,
      created_at: new Date().toISOString(),
      total_scans: 0,
      subscription_months: subscriptionMonths,
      expires_at: providedExpiresAt,
    };

    db[id] = record;
    newRecords.push(record);
  }

  saveDatabase(db);
  res.json({ success: true, data: newRecords, count: newRecords.length });
});

// Customer First-Scan Activation (Public)
app.post('/api/qr/:id/activate', (req, res) => {
  const { id } = req.params;
  const { target_url, app_type, expires_at, subscription_months } = req.body;

  if (!target_url) {
    return res.status(400).json({ success: false, error: 'الرجاء كتابة الرابط أو الرقم المطلوب' });
  }

  // Validate URL scheme safety
  if (!isSafeUrlScheme(target_url)) {
    return res.status(400).json({ success: false, error: 'بروتوكول الرابط غير آمن أو غير مسموح به' });
  }

  const db = loadDatabase();
  let current = db[id];
  const now = new Date().toISOString();

  if (!current) {
    current = {
      id,
      is_active: true,
      target_url,
      app_type: app_type || 'website',
      created_at: now,
      updated_at: now,
      total_scans: 1,
      expires_at: expires_at !== undefined ? expires_at : null,
      subscription_months: subscription_months !== undefined ? subscription_months : 1,
    };
    db[id] = current;
    saveDatabase(db);
    return res.json({ success: true, data: current });
  }

  if (current.is_active) {
    return res.status(403).json({
      success: false,
      error: 'هذا الكود مفعّل مسبقاً بالفعل. اتصل بالمسؤول لتغيير الوجهة.',
    });
  }

  current.is_active = true;
  current.target_url = target_url;
  current.app_type = app_type || 'website';
  current.updated_at = now;
  if (expires_at !== undefined) current.expires_at = expires_at;
  if (subscription_months !== undefined) current.subscription_months = subscription_months;

  saveDatabase(db);
  res.json({ success: true, data: current });
});

// Admin Exclusive Quick Edit (PROTECTED with requireAdminAuth)
app.put('/api/qr/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { target_url, app_type, label, expires_at, subscription_months } = req.body;

  if (target_url && !isSafeUrlScheme(target_url)) {
    return res.status(400).json({ success: false, error: 'الرابط يحتوي على بروتوكول غير آمن' });
  }

  const db = loadDatabase();
  let current = db[id];
  const now = new Date().toISOString();

  if (!current) {
    current = {
      id,
      is_active: true,
      target_url: target_url || null,
      app_type: app_type || 'website',
      created_at: now,
      total_scans: 0,
    };
    db[id] = current;
  }

  let normalizedTarget = target_url;
  const effectiveType = app_type || current?.app_type || 'website';
  if (normalizedTarget && typeof normalizedTarget === 'string') {
    if (effectiveType === 'tiktok') normalizedTarget = formatTikTokTargetUrl(normalizedTarget);
    else if (effectiveType === 'instagram') normalizedTarget = formatInstagramTargetUrl(normalizedTarget);
    else if (effectiveType === 'telegram') normalizedTarget = formatTelegramTargetUrl(normalizedTarget);
    else if (effectiveType === 'snapchat') normalizedTarget = formatSnapchatTargetUrl(normalizedTarget);
  }

  if (target_url !== undefined) current.target_url = normalizedTarget;
  if (app_type !== undefined) current.app_type = app_type;
  if (label !== undefined) current.label = label;
  if (expires_at !== undefined) current.expires_at = expires_at;
  if (subscription_months !== undefined) current.subscription_months = subscription_months;
  current.is_active = true;
  current.updated_at = now;

  saveDatabase(db);
  res.json({ success: true, data: current });
});

// Debounced scan counter
const recentScansDebounce = new Map<string, number>();

app.post('/api/qr/:id/scan', (req, res) => {
  const { id } = req.params;
  const db = loadDatabase();
  const record = db[id];
  if (record && record.is_active) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : (rawIp.split(',')[0] || '').trim();
    const debounceKey = `${id}_${clientIp}`;
    const now = Date.now();
    const lastScanTime = recentScansDebounce.get(debounceKey) || 0;

    if (now - lastScanTime > 3000) {
      recentScansDebounce.set(debounceKey, now);
      record.total_scans = (record.total_scans || 0) + 1;
      saveDatabase(db);
    }
  }
  res.json({ success: true, total_scans: record ? (record.total_scans || 0) : 0 });
});

// Reset Scan Counter (PROTECTED with requireAdminAuth)
app.post('/api/qr/:id/reset-scans', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { count } = req.body;
  const db = loadDatabase();
  const record = db[id];
  if (!record) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود' });
  }

  record.total_scans = typeof count === 'number' && count >= 0 ? count : 0;
  saveDatabase(db);
  res.json({ success: true, data: record, message: 'تم تعديل العداد بنجاح' });
});

// Delete QR Code (PROTECTED with requireAdminAuth)
app.delete('/api/qr/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const db = loadDatabase();
  if (!db[id]) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود' });
  }
  delete db[id];
  saveDatabase(db);
  res.json({ success: true, message: 'تم حذف الكود نهائياً' });
});

// Get platform settings
app.get('/api/settings', (req, res) => {
  const settings = loadSettings();
  res.json({ success: true, data: settings });
});

// Update platform settings (PROTECTED with requireAdminAuth)
app.post('/api/settings', requireAdminAuth, (req, res) => {
  const { developer_whatsapp, developer_contact_url, developer_title, support_message, public_domain_url } = req.body;
  const current = loadSettings();

  let formattedUrl = (developer_contact_url || '').trim();
  let cleanPhone = (developer_whatsapp || '').trim();

  if (!formattedUrl && cleanPhone) {
    let num = cleanPhone.replace(/[^\d]/g, '');
    if (num.startsWith('01')) num = '2' + num;
    formattedUrl = `https://wa.me/${num}`;
  }

  let cleanDomain = (public_domain_url !== undefined ? public_domain_url : current.public_domain_url || '').trim();
  if (cleanDomain.endsWith('/')) {
    cleanDomain = cleanDomain.slice(0, -1);
  }

  const updated: PlatformSettings = {
    developer_whatsapp: cleanPhone || current.developer_whatsapp,
    developer_contact_url: formattedUrl || current.developer_contact_url,
    developer_title: developer_title || current.developer_title || 'تواصل مع المطور',
    support_message: support_message || current.support_message || 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
    public_domain_url: cleanDomain,
  };

  saveSettings(updated);
  res.json({ success: true, data: updated, message: 'تم حفظ إعدادات التواصل والدومين بنجاح' });
});

const FIRESTORE_PROJECT_ID = 'clean-plateau-dv4kj';
const FIRESTORE_DATABASE_ID = 'ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0';

// QR Code Instant Redirection Route
app.get('/q/:id', async (req, res, next) => {
  const { id } = req.params;
  const db = loadDatabase();
  let record = db[id];

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Firestore fallback lookup
  if (!record) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/qr_codes/${id}`;
      const firestoreRes = await fetch(docUrl);
      if (firestoreRes.ok) {
        const firestoreData = await firestoreRes.json();
        const f = firestoreData.fields || {};
        record = {
          id,
          is_active: f.is_active?.booleanValue ?? false,
          target_url: f.target_url?.stringValue ?? null,
          app_type: f.app_type?.stringValue ?? 'website',
          created_at: f.created_at?.stringValue ?? new Date().toISOString(),
          total_scans: parseInt(f.total_scans?.integerValue || '0', 10),
          expires_at: f.expires_at?.stringValue ?? null,
          subscription_months: parseInt(f.subscription_months?.integerValue || '1', 10),
        };
        db[id] = record;
        saveDatabase(db);
      }
    } catch (fsErr) {
      console.warn('Server Firestore fallback lookup error:', fsErr);
    }
  }

  if (!record) {
    return next();
  }

  const isPrefetch = req.headers['purpose'] === 'prefetch' ||
    req.headers['sec-purpose'] === 'prefetch' ||
    req.headers['x-purpose'] === 'preview';

  if (record.is_active && !isPrefetch) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : (rawIp.split(',')[0] || '').trim();
    const debounceKey = `${id}_${clientIp}`;
    const now = Date.now();
    const lastScanTime = recentScansDebounce.get(debounceKey) || 0;

    if (now - lastScanTime > 3000) {
      recentScansDebounce.set(debounceKey, now);
      record.total_scans = (record.total_scans || 0) + 1;
      saveDatabase(db);

      if (recentScansDebounce.size > 2000) {
        for (const [k, time] of recentScansDebounce.entries()) {
          if (now - time > 15000) recentScansDebounce.delete(k);
        }
      }
    }
  }

  const isExpired = record.expires_at && new Date(record.expires_at).getTime() < Date.now();
  if (isExpired) {
    return next();
  }

  if (record.is_active && record.target_url && record.app_type !== 'bank' && !record.target_url.startsWith('bank://')) {
    let target = record.target_url.trim();

    // Block dangerous schemes
    if (!isSafeUrlScheme(target) || target.startsWith('intent:')) {
      return next();
    }

    if (record.app_type === 'wallet') {
      const isWebPaymentLink = (/^https?:\/\//i.test(target) || target.startsWith('www.') || target.includes('.eg/') || target.includes('.com/')) && !target.startsWith('intent:');
      if (!isWebPaymentLink) {
        return next();
      }
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
    }

    // Normalize schemes and platforms
    if (record.app_type === 'tiktok' || target.includes('tiktok.com') || (!target.startsWith('http') && record.app_type === 'tiktok')) {
      target = formatTikTokTargetUrl(target);
    } else if (record.app_type === 'instagram' || target.includes('instagram.com') || (!target.startsWith('http') && record.app_type === 'instagram')) {
      target = formatInstagramTargetUrl(target);
    } else if (record.app_type === 'telegram' || target.includes('t.me') || (!target.startsWith('http') && record.app_type === 'telegram')) {
      target = formatTelegramTargetUrl(target);
    } else if (record.app_type === 'snapchat' || target.includes('snapchat.com') || (!target.startsWith('http') && record.app_type === 'snapchat')) {
      target = formatSnapchatTargetUrl(target);
    } else if (target.startsWith('instapay://send?to=')) {
      const handle = decodeURIComponent(target.replace('instapay://send?to=', ''));
      target = `https://ipn.eg/${encodeURIComponent(handle.replace('@instapay', ''))}`;
    } else if (target.startsWith('wa.me/')) {
      target = `https://${target}`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('tel:') && !target.startsWith('mailto:')) {
      if (/^(?:\+?20|0)?1[0125]\d{8}$/.test(target)) {
        let num = target.replace(/[^\d]/g, '');
        if (num.startsWith('01')) num = '2' + num;
        target = `https://wa.me/${num}`;
      } else {
        target = `https://${target}`;
      }
    }

    if (req.query.preview === '1') {
      return next();
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    return res.redirect(302, target);
  }

  next();
});

// Start dev server with Vite or static production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
