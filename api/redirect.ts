const PROJECT_ID = 'clean-plateau-dv4kj';
const DATABASE_ID = 'ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0';
const API_KEY = 'AIzaSyAjyCP484AEQ52-9CDgp8TDkAw5woA1TFc';

export default async function handler(req: any, res: any) {
  // Always disable caching for QR scans
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Extract ID from query (?id=...) or path
  const queryId = (req.query?.id || '').toString().trim();
  const urlPath = req.url || '';
  const pathMatch = urlPath.match(/\/q\/([a-zA-Z0-9_-]+)/);
  const id = queryId || (pathMatch ? pathMatch[1] : '');

  if (!id) {
    return res.writeHead(302, { Location: '/' }).end();
  }

  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/qr_codes/${encodeURIComponent(id)}?key=${API_KEY}`;
    const response = await fetch(docUrl);

    if (!response.ok) {
      // Document not found or not in Firestore -> redirect to customer activation
      return res.writeHead(302, { Location: `/?activate=${id}` }).end();
    }

    const data = await response.json();
    const fields = data.fields || {};

    const isActive = fields.is_active?.booleanValue ?? false;
    const targetUrl = fields.target_url?.stringValue ?? '';
    const appType = fields.app_type?.stringValue ?? 'website';
    const expiresAtStr = fields.expires_at?.stringValue;

    // 1. If not active yet -> redirect directly to customer activation screen
    if (!isActive) {
      return res.writeHead(302, { Location: `/?activate=${id}` }).end();
    }

    // 2. Check expiration
    if (expiresAtStr) {
      const expiresAt = new Date(expiresAtStr).getTime();
      if (expiresAt < Date.now()) {
        return res.writeHead(302, { Location: `/?expired=${id}` }).end();
      }
    }

    // 3. Bank accounts always require copy screen
    if (appType === 'bank' || targetUrl.startsWith('bank://')) {
      return res.writeHead(302, { Location: `/?view=${id}` }).end();
    }

    // 4. Wallet: ONLY redirect directly if it is an actual HTTP/HTTPS payment web link!
    // If it's a phone number (010, 012, 011, 015), redirect to dedicated luxury copy view screen!
    const isWebPaymentLink = (/^https?:\/\//i.test(targetUrl) || targetUrl.startsWith('www.') || targetUrl.includes('.eg/') || targetUrl.includes('.com/')) && !targetUrl.startsWith('intent:');
    if (appType === 'wallet' && !isWebPaymentLink) {
      return res.writeHead(302, { Location: `/?view=${id}` }).end();
    }

    // Check for dangerous schemes (javascript:, data:, vbscript:)
    const sanitizedUrl = targetUrl.trim().replace(/[\x00-\x1f\x7f]/g, '');
    if (/^(?:javascript|data|vbscript|file|blob|about):/i.test(sanitizedUrl.toLowerCase())) {
      return res.writeHead(302, { Location: `/?view=${id}` }).end();
    }

    // Never redirect to intent schemes
    if (targetUrl.startsWith('intent:')) {
      return res.writeHead(302, { Location: `/?view=${id}` }).end();
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

    // 5. Direct Link (WhatsApp, Instagram, Facebook, TikTok, Website, Phone, InstaPay Link, or Wallet Payment Link)
    let destination = sanitizedUrl;

    if (appType === 'tiktok' || destination.includes('tiktok.com') || (!destination.startsWith('http') && appType === 'tiktok')) {
      destination = formatTikTokTargetUrl(destination);
    } else if (appType === 'instagram' || destination.includes('instagram.com') || (!destination.startsWith('http') && appType === 'instagram')) {
      destination = formatInstagramTargetUrl(destination);
    } else if (appType === 'telegram' || destination.includes('t.me') || (!destination.startsWith('http') && appType === 'telegram')) {
      destination = formatTelegramTargetUrl(destination);
    } else if (appType === 'snapchat' || destination.includes('snapchat.com') || (!destination.startsWith('http') && appType === 'snapchat')) {
      destination = formatSnapchatTargetUrl(destination);
    } else if (destination.startsWith('wa.me/')) {
      destination = `https://${destination}`;
    } else if (!destination.startsWith('http://') && !destination.startsWith('https://') && !destination.startsWith('tel:')) {
      if (/^(?:\+?20|0)?1[0125]\d{8}$/.test(destination)) {
        let num = destination.replace(/[^\d]/g, '');
        if (num.startsWith('01')) num = '2' + num;
        destination = `https://wa.me/${num}`;
      } else {
        destination = `https://${destination}`;
      }
    }

    // Atomic increment scan counter in Firestore via REST API transform (non-blocking)
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit?key=${API_KEY}`;
    fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/qr_codes/${id}`,
              fieldTransforms: [
                {
                  fieldPath: 'total_scans',
                  increment: { integerValue: '1' }
                }
              ]
            }
          }
        ]
      })
    }).catch(() => {});

    // Send INSTANT HTTP 302 Redirection with HTML fallback body for universal mobile browser & app support
    res.writeHead(302, {
      Location: destination,
      'Content-Type': 'text/html; charset=utf-8'
    });
    return res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${destination}">
  <title>جاري فتح الرابط...</title>
  <script>location.replace(${JSON.stringify(destination)});</script>
</head>
<body style="background:#09090b;color:#facc15;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>جاري تحويلك إلى الرابط مباشرة... <a href="${destination}" style="color:#facc15;text-decoration:underline;">اضغط هنا إذا لم يتم الفتح تلقائياً</a></p>
</body>
</html>`);
  } catch (err) {
    console.error('Serverless redirect error:', err);
    // Fallback to client SPA
    return res.writeHead(302, { Location: `/?scan=${id}` }).end();
  }
}
