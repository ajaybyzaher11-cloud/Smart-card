import { AppType, BankDetails, DeepLinkInfo } from '../types/qr';

/**
 * Checks whether the current window is embedded within an iframe
 * (e.g., inside the AI Studio Web Preview environment).
 */
export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Encodes bank details into a compact bank URI scheme for storage
 */
export function encodeBankDetails(details: BankDetails): string {
  const params = new URLSearchParams();
  if (details.bankName) params.set('b', details.bankName);
  if (details.accountNumber) params.set('acc', details.accountNumber);
  if (details.accountName) params.set('name', details.accountName);
  if (details.iban) params.set('iban', details.iban);
  if (details.notes) params.set('notes', details.notes);
  return `bank://account?${params.toString()}`;
}

/**
 * Decodes a bank URI scheme back into structured BankDetails
 */
export function decodeBankDetails(uri: string): BankDetails | null {
  if (!uri || !uri.startsWith('bank://')) return null;
  try {
    const query = uri.replace('bank://account?', '').replace('bank://?', '');
    const params = new URLSearchParams(query);
    return {
      bankName: params.get('b') || 'حساب بنكي',
      accountNumber: params.get('acc') || '',
      accountName: params.get('name') || '',
      iban: params.get('iban') || '',
      notes: params.get('notes') || '',
    };
  } catch {
    return null;
  }
}

/**
 * Robustly sanitizes and extracts the true URL from raw inputs,
 * handling Android app share links (e.g. android-app://com.instapay.app/https/ipn.eg/...),
 * double protocols (https://android-app:// or https://https://), and custom schemes.
 */
export function cleanAndSanitizeUrl(input: string): string {
  let s = (input || '').trim();
  if (!s) return '';

  // If already a bank URI scheme, leave as-is
  if (s.startsWith('bank://')) {
    return s;
  }

  // 1. Check if input contains an embedded web URL (common in Android share intents)
  // e.g., android-app://com.instapay.app/https/ipn.eg/S/shenoudazaher/instapay/7CGeaO
  const embeddedHttpMatch = s.match(/(https?:\/\/[^\s]+)/i) || s.match(/(https?\/[^\s]+)/i);
  if (embeddedHttpMatch && !s.startsWith('http://android-app') && !s.startsWith('https://android-app')) {
    let extracted = embeddedHttpMatch[1];
    if (extracted.startsWith('https/') || extracted.startsWith('http/')) {
      extracted = extracted.replace(/^https?\//, 'https://');
    }
    return extracted;
  }

  // 2. Double scheme like https://android-app://
  if (/^https?:\/\/+android-app:\/\//i.test(s)) {
    s = s.replace(/^https?:\/\/+android-app:\/\//i, 'android-app://');
    const innerUrl = s.match(/https?\/[^\s]+/i) || s.match(/https?:\/\/[^\s]+/i);
    if (innerUrl) {
      let clean = innerUrl[0];
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = clean.replace(/^https?\//, 'https://');
      }
      return clean;
    }
    const pkg = s.replace('android-app://', '').split('/')[0];
    return `https://play.google.com/store/apps/details?id=${pkg}`;
  }

  // 3. Fix double http(s) like https://https:// or https://http://
  s = s.replace(/^https?:\/\/+(https?:\/\/)/i, '$1');

  // 4. Raw android-app:// scheme
  if (s.startsWith('android-app://')) {
    const innerUrl = s.match(/https?\/[^\s]+/i) || s.match(/https?:\/\/[^\s]+/i);
    if (innerUrl) {
      let clean = innerUrl[0];
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = clean.replace(/^https?\//, 'https://');
      }
      return clean;
    }
    const pkg = s.replace('android-app://', '').split('/')[0];
    return `https://play.google.com/store/apps/details?id=${pkg}`;
  }

  // 5. Standard valid non-http schemes
  if (s.startsWith('tel:') || s.startsWith('mailto:')) {
    return s;
  }

  // 6. Custom scheme like instapay://send?to=
  if (s.startsWith('instapay://send?to=')) {
    const handle = decodeURIComponent(s.replace('instapay://send?to=', ''));
    return `https://ipn.eg/${encodeURIComponent(handle.replace('@instapay', ''))}`;
  }

  return s;
}

/**
 * Analyzes user input and produces clean, universal URLs, deep links,
 * or bank details that work flawlessly across mobile and desktop.
 */
export function processSmartLink(rawInput: string, preferredType?: AppType): DeepLinkInfo {
  const sanitized = cleanAndSanitizeUrl(rawInput);
  const trimmed = sanitized.trim();

  // Handle Bank Type
  if (preferredType === 'bank' || trimmed.startsWith('bank://')) {
    const bankDetails = decodeBankDetails(trimmed) || {
      bankName: 'حساب بنكي',
      accountNumber: trimmed.replace(/^https?:\/\//, ''),
    };

    return {
      appType: 'bank',
      appTitleAr: bankDetails.bankName || 'حساب بنكي',
      schemeUrl: trimmed.startsWith('bank://') ? trimmed : encodeBankDetails(bankDetails),
      fallbackUrl: '#',
      displayUrl: bankDetails.accountNumber ? `${bankDetails.bankName}: ${bankDetails.accountNumber}` : 'بيانات الحساب البنكي',
      isBankCard: true,
      bankDetails,
    };
  }

  // Handle Smart Wallet (Vodafone Cash, Etisalat, Orange, WE)
  if (preferredType === 'wallet') {
    const cleanNumber = trimmed.replace(/[^\d+]/g, '');
    return {
      appType: 'wallet',
      appTitleAr: 'محفظة إلكترونية (كاش)',
      schemeUrl: `tel:*9*7*${cleanNumber}#`,
      fallbackUrl: `tel:${cleanNumber}`,
      displayUrl: cleanNumber || trimmed,
    };
  }

  if (!trimmed) {
    return {
      appType: preferredType || 'website',
      appTitleAr: 'رابط ويب',
      schemeUrl: '',
      fallbackUrl: '',
      displayUrl: '',
    };
  }

  // 1. WhatsApp
  const isWhatsAppInput =
    preferredType === 'whatsapp' ||
    trimmed.includes('wa.me') ||
    trimmed.includes('whatsapp.com') ||
    trimmed.startsWith('whatsapp://') ||
    (!preferredType && /^(?:\+?20|0)?1[0125]\d{8}$/.test(rawInput.trim()));

  if (isWhatsAppInput) {
    let phoneDigits = '';
    let customText = '';

    if (trimmed.includes('wa.me/')) {
      const parts = trimmed.split('wa.me/')[1]?.split('?') || [];
      phoneDigits = parts[0]?.replace(/[^\d]/g, '') || '';
      if (parts[1]?.includes('text=')) {
        customText = new URLSearchParams(parts[1]).get('text') || '';
      }
    } else if (trimmed.includes('phone=')) {
      try {
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        phoneDigits = urlObj.searchParams.get('phone')?.replace(/[^\d]/g, '') || '';
        customText = urlObj.searchParams.get('text') || '';
      } catch {
        phoneDigits = trimmed.replace(/[^\d]/g, '');
      }
    } else {
      phoneDigits = rawInput.trim().replace(/[^\d]/g, '');
    }

    // Auto format Egyptian numbers: 010... -> 2010...
    if (phoneDigits.startsWith('01') && phoneDigits.length === 11) {
      phoneDigits = '2' + phoneDigits;
    }

    const textQueryParam = customText ? `?text=${encodeURIComponent(customText)}` : '';
    const universalUrl = `https://wa.me/${phoneDigits}${textQueryParam}`;

    return {
      appType: 'whatsapp',
      appTitleAr: 'واتساب WhatsApp',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `wa.me/${phoneDigits}`,
    };
  }

  // 2. Phone Call
  const isPhone =
    preferredType === 'phone' ||
    trimmed.startsWith('tel:') ||
    (!preferredType && /^(\+|00)?\d{7,15}$/.test(rawInput.trim().replace(/[\s-]/g, '')));

  if (isPhone) {
    const cleanNumber = rawInput.trim().replace(/[^\d+]/g, '');
    const telUrl = `tel:${cleanNumber}`;
    return {
      appType: 'phone',
      appTitleAr: 'اتصال هاتفي',
      schemeUrl: telUrl,
      fallbackUrl: telUrl,
      displayUrl: cleanNumber,
    };
  }

  // 3. InstaPay Egypt
  const isInstaPay =
    preferredType === 'instapay' ||
    trimmed.includes('ipn.eg') ||
    trimmed.includes('instapay') ||
    rawInput.trim().endsWith('@instapay');

  if (isInstaPay) {
    let cleanUrl = trimmed;
    let displayHandle = trimmed;

    if (trimmed.includes('ipn.eg/')) {
      cleanUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      displayHandle = trimmed.replace(/^https?:\/\/(www\.)?ipn\.eg\/?/, 'ipn.eg/');
    } else {
      const cleanHandle = rawInput.trim().replace(/@instapay$/i, '').trim();
      cleanUrl = `https://ipn.eg/${encodeURIComponent(cleanHandle)}`;
      displayHandle = `${cleanHandle}@instapay`;
    }

    return {
      appType: 'instapay',
      appTitleAr: 'إنستاباي InstaPay',
      schemeUrl: cleanUrl,
      fallbackUrl: cleanUrl,
      displayUrl: displayHandle,
    };
  }

  // 4. Instagram
  const isInstagram =
    preferredType === 'instagram' ||
    trimmed.includes('instagram.com') ||
    (preferredType === undefined && rawInput.trim().startsWith('@') && !trimmed.includes('instapay'));

  if (isInstagram) {
    let username = '';
    if (trimmed.includes('instagram.com/')) {
      const match = trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      username = match ? match[1] : '';
    } else {
      username = rawInput.trim().replace(/^@/, '').replace(/[^\w.]/g, '');
    }

    const universalUrl = `https://www.instagram.com/${username}/`;
    return {
      appType: 'instagram',
      appTitleAr: 'إنستجرام Instagram',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `@${username}`,
    };
  }

  // 5. Facebook
  const isFacebook =
    preferredType === 'facebook' ||
    trimmed.includes('facebook.com') ||
    trimmed.includes('fb.me') ||
    trimmed.includes('fb.watch');

  if (isFacebook) {
    let cleanUrl = trimmed;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://www.facebook.com/${cleanUrl.replace(/^www\./, '')}`;
    }
    return {
      appType: 'facebook',
      appTitleAr: 'فيسبوك Facebook',
      schemeUrl: cleanUrl,
      fallbackUrl: cleanUrl,
      displayUrl: cleanUrl.replace(/^https?:\/\/(www\.)?facebook\.com\/?/, 'fb.com/'),
    };
  }

  // 6. Telegram
  const isTelegram =
    preferredType === 'telegram' ||
    trimmed.includes('t.me') ||
    trimmed.includes('telegram.me');

  if (isTelegram) {
    let handle = trimmed;
    if (trimmed.includes('t.me/')) {
      handle = trimmed.split('t.me/')[1]?.split('?')[0] || '';
    } else {
      handle = rawInput.trim().replace(/^@/, '');
    }
    const universalUrl = `https://t.me/${handle}`;
    return {
      appType: 'telegram',
      appTitleAr: 'تيليجرام Telegram',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `t.me/${handle}`,
    };
  }

  // 7. TikTok
  const isTikTok =
    preferredType === 'tiktok' ||
    trimmed.includes('tiktok.com');

  if (isTikTok) {
    let user = trimmed;
    if (trimmed.includes('tiktok.com/@')) {
      user = trimmed.split('tiktok.com/@')[1]?.split('?')[0] || '';
    } else {
      user = rawInput.trim().replace(/^@/, '');
    }
    const universalUrl = `https://www.tiktok.com/@${user}`;
    return {
      appType: 'tiktok',
      appTitleAr: 'تيك توك TikTok',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `tiktok.com/@${user}`,
    };
  }

  // 8. Snapchat
  const isSnapchat =
    preferredType === 'snapchat' ||
    trimmed.includes('snapchat.com');

  if (isSnapchat) {
    let user = trimmed;
    if (trimmed.includes('snapchat.com/add/')) {
      user = trimmed.split('snapchat.com/add/')[1]?.split('?')[0] || '';
    } else {
      user = rawInput.trim().replace(/^@/, '');
    }
    const universalUrl = `https://www.snapchat.com/add/${user}`;
    return {
      appType: 'snapchat',
      appTitleAr: 'سناب شات Snapchat',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `snapchat.com/add/${user}`,
    };
  }

  // 9. Standard Web URL / Fallback
  let webUrl = trimmed;
  if (!webUrl.startsWith('http://') && !webUrl.startsWith('https://')) {
    webUrl = `https://${webUrl}`;
  }

  return {
    appType: preferredType || 'website',
    appTitleAr: 'رابط ويب',
    schemeUrl: webUrl,
    fallbackUrl: webUrl,
    displayUrl: webUrl.replace(/^https?:\/\//, ''),
  };
}

/**
 * Triggers instant direct opening of the target URL or app.
 * IMPORTANT: Checks if running inside an iframe (like AI Studio preview),
 * avoiding the X-Frame-Options: DENY iframe crash.
 */
export function triggerSmartRedirect(linkInfo: DeepLinkInfo): void {
  const target = linkInfo.schemeUrl || linkInfo.fallbackUrl;
  if (!target || target === '#') return;

  const inIframe = isRunningInIframe();

  if (inIframe) {
    // If inside an iframe (AI Studio preview):
    // Trying window.location.replace() to an external domain (e.g. wa.me, ipn.eg)
    // will be blocked by the browser with X-Frame-Options: DENY.
    // Instead, open in top window or new window:
    try {
      if (window.top) {
        window.top.location.href = target;
        return;
      }
    } catch {
      // Cross-origin top access blocked, open in new tab
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  } else {
    // On real mobile device or standalone browser tab:
    try {
      window.location.replace(target);
    } catch {
      window.location.href = target;
    }
  }
}
