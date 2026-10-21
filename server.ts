import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'qr_codes.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

app.use(express.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  public_domain_url: '',
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

// Ensure default settings exist
if (!fs.existsSync(SETTINGS_FILE)) {
  saveSettings(DEFAULT_SETTINGS);
}

interface QrRecord {
  id: string;
  is_active: boolean;
  target_url: string | null;
  app_type?: string;
  label?: string;
  created_at: string;
  updated_at?: string;
  total_scans: number;
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

// Ensure database file exists with empty state if missing
if (!fs.existsSync(DB_FILE)) {
  saveDatabase({});
}

// --- API Endpoints ---

// 1. Get all QR codes
app.get('/api/qr', (req, res) => {
  const db = loadDatabase();
  const list = Object.values(db).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ success: true, data: list });
});

// 2. Get single QR code by ID
app.get('/api/qr/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDatabase();
  const record = db[id];
  if (!record) {
    return res.status(404).json({ success: false, error: 'الرمز غير موجود' });
  }
  res.json({ success: true, data: record });
});

// 3. Bulk Generate QR codes (Accepts ANY count typed by user)
app.post('/api/qr/bulk', (req, res) => {
  const count = parseInt(req.body.count, 10);
  if (isNaN(count) || count < 1) {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال رقم صحيح أكبر من صفر' });
  }

  // Safe upper ceiling to avoid memory overload
  const safeCount = Math.min(count, 500);
  const db = loadDatabase();
  const newRecords: QrRecord[] = [];

  for (let i = 0; i < safeCount; i++) {
    let id = nanoid(10).replace(/[^a-zA-Z0-9_-]/g, 'x');
    // Ensure uniqueness
    while (db[id]) {
      id = nanoid(10).replace(/[^a-zA-Z0-9_-]/g, 'x');
    }

    const record: QrRecord = {
      id,
      is_active: false,
      target_url: null,
      created_at: new Date().toISOString(),
      total_scans: 0,
    };

    db[id] = record;
    newRecords.push(record);
  }

  saveDatabase(db);
  res.json({ success: true, data: newRecords, count: newRecords.length });
});

// 4. Customer First-Scan Activation
app.post('/api/qr/:id/activate', (req, res) => {
  const { id } = req.params;
  const { target_url, app_type } = req.body;

  if (!target_url) {
    return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
  }

  const db = loadDatabase();
  const current = db[id];
  if (!current) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود في النظام' });
  }

  if (current.is_active) {
    return res.status(403).json({
      success: false,
      error: 'هذا الكود تم تفعيله مسبقاً ومقفل نهائياً، ولا يمكن تعديله إلا من خلال الأدمن.',
    });
  }

  const now = new Date().toISOString();
  current.is_active = true;
  current.target_url = target_url;
  current.app_type = app_type || 'website';
  current.updated_at = now;

  saveDatabase(db);
  res.json({ success: true, data: current });
});

// 5. Admin Exclusive Quick Edit
app.put('/api/qr/:id', (req, res) => {
  const { id } = req.params;
  const { target_url, app_type, label } = req.body;

  const db = loadDatabase();
  const current = db[id];
  if (!current) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود' });
  }

  // ID is strictly immutable!
  const now = new Date().toISOString();
  if (target_url !== undefined) current.target_url = target_url;
  if (app_type !== undefined) current.app_type = app_type;
  if (label !== undefined) current.label = label;
  current.is_active = true;
  current.updated_at = now;

  saveDatabase(db);
  res.json({ success: true, data: current });
});

// Anti-duplicate scan debouncing: maps `${id}_${clientIp}` to timestamp (ms)
const recentScansDebounce = new Map<string, number>();

// 6. Record Scan Counter (Strict Rule: Only if record is active, with anti-double-count debouncing)
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

    // Minimum 3000ms cooldown to eliminate fake double hits from prefetch/sub-requests
    if (now - lastScanTime > 3000) {
      recentScansDebounce.set(debounceKey, now);
      record.total_scans = (record.total_scans || 0) + 1;
      saveDatabase(db);
    }
  }
  res.json({ success: true, total_scans: record ? (record.total_scans || 0) : 0 });
});

// 6.5 Reset / Adjust Scan Counter
app.post('/api/qr/:id/reset-scans', (req, res) => {
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

// 7. Delete QR Code permanently from database
app.delete('/api/qr/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDatabase();
  if (!db[id]) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود' });
  }
  delete db[id];
  saveDatabase(db);
  res.json({ success: true, message: 'تم حذف الكود نهائياً' });
});

// 8. Get platform settings (developer contact / WhatsApp)
app.get('/api/settings', (req, res) => {
  const settings = loadSettings();
  res.json({ success: true, data: settings });
});

// 9. Update platform settings
app.post('/api/settings', (req, res) => {
  const { developer_whatsapp, developer_contact_url, developer_title, support_message, public_domain_url } = req.body;
  const current = loadSettings();

  let formattedUrl = (developer_contact_url || '').trim();
  let cleanPhone = (developer_whatsapp || '').trim();

  if (!formattedUrl && cleanPhone) {
    let num = cleanPhone.replace(/[^\d]/g, '');
    if (num.startsWith('01')) num = '2' + num;
    formattedUrl = `https://wa.me/${num}`;
  }

  // Normalize public domain URL (remove trailing slash)
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

// QR Code Scan Route: Instant HTTP 302 Redirection for activated codes with strict no-cache
app.get('/q/:id', (req, res, next) => {
  const { id } = req.params;
  const db = loadDatabase();
  const record = db[id];

  // ALWAYS set strict no-cache headers so mobile browsers (Brave, Chrome, Safari)
  // NEVER cache any old redirect or stale page!
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // IF RECORD WAS DELETED OR DOES NOT EXIST:
  if (!record) {
    if (req.accepts('html')) {
      const settings = loadSettings();
      let waUrl = settings.developer_contact_url?.trim();
      if (!waUrl && settings.developer_whatsapp) {
        let num = settings.developer_whatsapp.replace(/[^\d]/g, '');
        if (num.startsWith('01')) num = '2' + num;
        waUrl = `https://wa.me/${num}`;
      }
      if (!waUrl) waUrl = 'https://wa.me/201550523365';
      const displayPhone = settings.developer_whatsapp || '01550523365';
      const buttonTitle = settings.developer_title || 'تواصل مع المطور';

      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>الرمز غير صالح أو تم حذفه</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; }
            .gold-gradient-bg {
              background: radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.15) 0%, rgba(10, 10, 12, 0.98) 75%);
            }
            .gold-border {
              border: 1px solid rgba(212, 175, 55, 0.35);
            }
            .gold-glow {
              box-shadow: 0 0 40px rgba(212, 175, 55, 0.15);
            }
            .gold-btn {
              background: linear-gradient(135deg, #FDE047 0%, #EAB308 50%, #CA8A04 100%);
              color: #000000;
              box-shadow: 0 8px 30px rgba(234, 179, 8, 0.35);
            }
            .gold-btn:hover {
              background: linear-gradient(135deg, #FEF08A 0%, #FACC15 50%, #EAB308 100%);
              transform: translateY(-2px);
              box-shadow: 0 12px 35px rgba(234, 179, 8, 0.45);
            }
          </style>
        </head>
        <body class="bg-[#09090b] text-white min-h-screen flex items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
          <div class="max-w-md w-full gold-gradient-bg gold-border gold-glow rounded-3xl p-8 sm:p-10 text-center space-y-7 relative overflow-hidden bg-[#121216]">
            <!-- Luxury Icon Badge -->
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent border border-amber-400/40 flex items-center justify-center mx-auto shadow-inner relative">
              <span class="text-3xl">✨</span>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
            </div>

            <div class="space-y-3">
              <span class="px-3.5 py-1.5 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-black inline-flex items-center gap-1.5 tracking-wide">
                <span>✦</span>
                <span>البطاقات الذكية الفاخرة</span>
                <span>✦</span>
              </span>
              <h1 class="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                الرمز غير صالح أو تم حذفه
              </h1>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                تم مسح هذا الرمز من قاعدة البيانات أو لم يعد نشطاً. للحصول على بطاقة جديدة أو الاستفسار، يمكنك التواصل مع المطور مباشرة.
              </p>
            </div>

            <!-- Direct WhatsApp Developer Action Button -->
            <div class="pt-2 space-y-3">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="gold-btn w-full py-4 px-6 font-black text-sm rounded-2xl flex items-center justify-center gap-3 transition-all duration-300">
                <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>${buttonTitle}</span>
              </a>

              <p class="text-[11px] text-amber-200/60 font-mono tracking-wider pt-1">
                رقم الواتساب: ${displayPhone}
              </p>
            </div>
          </div>
        </body>
        </html>
      `);
    }
    return res.status(404).json({ success: false, error: 'الرمز غير موجود أو تم حذفه نهائياً' });
  }

  // Check if browser sent a prefetch/preview request (e.g. Brave / Chrome / Safari prefetch)
  const isPrefetch = req.headers['purpose'] === 'prefetch' ||
                     req.headers['sec-purpose'] === 'prefetch' ||
                     req.headers['x-purpose'] === 'preview';

  // STRICT RULE: Only count AFTER the code has been activated!
  // Never count before or during first-time customer activation.
  if (record.is_active && !isPrefetch) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : (rawIp.split(',')[0] || '').trim();
    const debounceKey = `${id}_${clientIp}`;
    const now = Date.now();
    const lastScanTime = recentScansDebounce.get(debounceKey) || 0;

    // Minimum 3000ms cooldown to eliminate fake double hits from prefetch/sub-requests
    if (now - lastScanTime > 3000) {
      recentScansDebounce.set(debounceKey, now);
      record.total_scans = (record.total_scans || 0) + 1;
      saveDatabase(db);

      // Periodically prune debounce map
      if (recentScansDebounce.size > 2000) {
        for (const [k, time] of recentScansDebounce.entries()) {
          if (now - time > 15000) recentScansDebounce.delete(k);
        }
      }
    }
  }

  // If active and has a target URL and NOT a bank card:
  // Send INSTANT HTTP 302 REDIRECT directly to destination!
  if (record.is_active && record.target_url && record.app_type !== 'bank' && !record.target_url.startsWith('bank://')) {
    let target = record.target_url.trim();

    // Normalize common schemes
    if (target.startsWith('instapay://send?to=')) {
      const handle = decodeURIComponent(target.replace('instapay://send?to=', ''));
      target = `https://ipn.eg/${encodeURIComponent(handle.replace('@instapay', ''))}`;
    } else if (target.startsWith('wa.me/')) {
      target = `https://${target}`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('tel:') && !target.startsWith('mailto:')) {
      // If it looks like an Egyptian phone number for WhatsApp
      if (/^(?:\+?20|0)?1[0125]\d{8}$/.test(target)) {
        let num = target.replace(/[^\d]/g, '');
        if (num.startsWith('01')) num = '2' + num;
        target = `https://wa.me/${num}`;
      } else {
        target = `https://${target}`;
      }
    }

    // If requested with ?preview=1 (from admin simulator in iframe), let React render preview
    if (req.query.preview === '1') {
      return next();
    }

    // Return instant HTTP 302 Found with strict no-cache so browser re-checks next time
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    return res.redirect(302, target);
  }

  // If inactive (needs first-time activation) or bank card, let React SPA render
  next();
});

// Setup Vite middleware for development and static serve for production
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
