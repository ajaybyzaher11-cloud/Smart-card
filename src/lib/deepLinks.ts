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
 * Validates that a URL does NOT contain dangerous or malicious execution schemes
 * (e.g., javascript:, vbscript:, data:, file:, etc.)
 */
export function isSafeUrlScheme(url: string): boolean {
  if (!url) return false;
  const sanitized = url.trim().replace(/[\x00-\x1f\x7f]/g, '').toLowerCase();
  const dangerous = /^(?:javascript|data|vbscript|file|blob|about):/i;
  return !dangerous.test(sanitized);
}

/**
 * Robustly sanitizes and extracts the true URL from raw inputs,
 * handling Android app share links (e.g. android-app://com.instapay.app/https/ipn.eg/...),
 * double protocols (https://android-app:// or https://https://), and custom schemes.
 */
export function cleanAndSanitizeUrl(input: string): string {
  let s = (input || '').trim();
  if (!s) return '';

  // Immediately reject dangerous script schemes
  if (!isSafeUrlScheme(s)) {
    return '';
  }

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
    return handle.replace(/@instapay$/i, '').trim();
  }

  return s;
}

/**
 * Normalizes Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII numerals (0123456789)
 */
export function normalizeArabicNumerals(input: string): string {
  if (!input) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return input.replace(/[٠-٩]/g, (char) => {
    const idx = arabicNumerals.indexOf(char);
    return idx !== -1 ? String(idx) : char;
  });
}

/**
 * Checks if input is an external Quick Payment URL/link or deep link rather than a phone number
 */
export function isQuickPayUrl(input: string): boolean {
  const s = normalizeArabicNumerals(input || '').trim();
  if (/^https?:\/\//i.test(s)) return true;
  if (/^intent:\/\//i.test(s)) return true;
  if (/^(vfcash|orangecash|etisalatcash|wepay|ipn):\/\//i.test(s)) return true;

  const hasDomain = s.includes('.eg') || s.includes('.com') || s.includes('.net') || s.includes('.me') || s.includes('.io') || s.startsWith('www.') || s.includes('/');
  const digitsOnly = s.replace(/[^\d]/g, '');

  if (hasDomain && (s.includes('/') || s.includes('www.') || digitsOnly.length < 8)) {
    return true;
  }
  return false;
}

export interface DetectedWalletInfo {
  provider: 'vodafone' | 'orange' | 'etisalat' | 'we' | 'generic';
  nameAr: string;
  nameEn: string;
  companyNameAr: string;
  cleanPhone: string;
  formattedPhone: string;
  brandColor: string;
}

/**
 * Detects the Egyptian mobile wallet operator from the phone number prefix
 * 010 / ٠١٠ -> Vodafone Cash
 * 012 / ٠١٢ -> Orange Cash
 * 011 / ٠١١ -> Etisalat Cash
 * 015 / ٠١٥ -> WE Pay
 */
export function detectWalletInfo(rawPhone: string): DetectedWalletInfo {
  const normalized = normalizeArabicNumerals(rawPhone || '');
  let cleanPhone = normalized.replace(/[^\d]/g, '');

  // Strip international country codes (+20, 0020, 20)
  if (cleanPhone.startsWith('0020') && cleanPhone.length === 14) {
    cleanPhone = cleanPhone.slice(4);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.slice(2);
  }

  // Prepend missing leading zero (e.g. 1012345678 -> 01012345678)
  if (cleanPhone.length === 10 && cleanPhone.startsWith('1')) {
    cleanPhone = '0' + cleanPhone;
  }

  // Formatted display (010 1234 5678)
  let formattedPhone = cleanPhone;
  if (cleanPhone.length === 11) {
    formattedPhone = `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 7)} ${cleanPhone.slice(7)}`;
  }

  // 010 -> Vodafone Cash
  if (cleanPhone.startsWith('010')) {
    return {
      provider: 'vodafone',
      nameAr: 'ڨودافون كاش',
      nameEn: 'Vodafone Cash',
      companyNameAr: 'فودافون مصر - Vodafone Egypt',
      cleanPhone,
      formattedPhone,
      brandColor: '#E60000',
    };
  }

  // 012 -> Orange Cash
  if (cleanPhone.startsWith('012')) {
    return {
      provider: 'orange',
      nameAr: 'أورانج كاش',
      nameEn: 'Orange Cash',
      companyNameAr: 'أورانج مصر - Orange Egypt',
      cleanPhone,
      formattedPhone,
      brandColor: '#FF7900',
    };
  }

  // 011 -> Etisalat Cash
  if (cleanPhone.startsWith('011')) {
    return {
      provider: 'etisalat',
      nameAr: 'اتصالات كاش',
      nameEn: 'Etisalat Cash (e&)',
      companyNameAr: 'إي آند مصر (اتصالات) - e& Egypt',
      cleanPhone,
      formattedPhone,
      brandColor: '#719E19',
    };
  }

  // 015 -> WE Pay
  if (cleanPhone.startsWith('015')) {
    return {
      provider: 'we',
      nameAr: 'وي باي',
      nameEn: 'WE Pay',
      companyNameAr: 'المصرية للاتصالات - Telecom Egypt (WE)',
      cleanPhone,
      formattedPhone,
      brandColor: '#592C82',
    };
  }

  return {
    provider: 'generic',
    nameAr: 'محفظة كاش إلكترونية',
    nameEn: 'Smart Cash Wallet',
    companyNameAr: 'المحفظة الذكية',
    cleanPhone: cleanPhone || rawPhone,
    formattedPhone: cleanPhone || rawPhone,
    brandColor: '#EAB308',
  };
}

/**
 * Formats and normalizes TikTok username or links to the standard Universal / App Link format:
 * https://www.tiktok.com/@<clean_lowercase_username>
 * This guarantees the TikTok app opens directly to the profile on mobile devices,
 * or cleanly loads the profile page on the web, preventing it from just opening the app's home feed.
 */
export function formatTikTokTargetUrl(input: string): string {
  if (!input) return '';
  // 1. Remove all invisible zero-width and RTL/LTR formatting marks
  let clean = normalizeArabicNumerals(input)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!clean) return '';

  // 2. TikTok short video/profile share links (vm.tiktok.com / vt.tiktok.com)
  if (/^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\//i.test(clean)) {
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }

  // 3. Full or partial tiktok.com URL
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
    // If it's a specific link with video ID or something, just ensure https://
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://${clean}`;
    }
    return clean;
  }

  // 4. Raw username (e.g. foodhunteregypt, @foodhunteregypt, FoodHunterEgypt, /@Foodhunteregypt)
  let username = clean.replace(/^[/@]+/, '').split('?')[0].split('/')[0].trim();
  username = username.replace(/[^\w.-]/g, '').toLowerCase().trim();

  if (username) {
    return `https://www.tiktok.com/@${username}`;
  }

  return clean;
}

/**
 * Normalizes Instagram usernames/URLs to https://www.instagram.com/<clean_lowercase_username>/
 */
export function formatInstagramTargetUrl(input: string): string {
  if (!input) return '';
  let clean = normalizeArabicNumerals(input)
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

/**
 * Normalizes Telegram usernames/URLs to https://t.me/<clean_lowercase_username>
 */
export function formatTelegramTargetUrl(input: string): string {
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

/**
 * Normalizes Snapchat usernames/URLs to https://www.snapchat.com/add/<clean_lowercase_username>
 */
export function formatSnapchatTargetUrl(input: string): string {
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

  // Handle Smart Wallet (Vodafone Cash, Etisalat, Orange, WE Pay)
  if (preferredType === 'wallet') {
    const normalized = normalizeArabicNumerals(trimmed);
    let cleanTrimmed = normalized;
    if (cleanTrimmed.startsWith('tel:*9*7*')) {
      cleanTrimmed = cleanTrimmed.replace('tel:*9*7*', '').replace('#', '').replace('%23', '');
    }

    // 1. Check if input is a Web URL or Quick Payment Link (e.g. https://... or vf.eg or web.vodafone.com.eg/...)
    if (isQuickPayUrl(cleanTrimmed)) {
      let fullUrl = cleanTrimmed;
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://') && !fullUrl.startsWith('intent://')) {
        fullUrl = `https://${fullUrl}`;
      }
      return {
        appType: 'wallet',
        appTitleAr: 'محفظة كاش (رابط الدفع السريع)',
        schemeUrl: fullUrl,
        fallbackUrl: fullUrl,
        displayUrl: fullUrl.replace(/^https?:\/\//, ''),
        isWalletCard: false, // Direct instant redirect to payment link!
      };
    }

    // 2. Otherwise, input is a wallet phone number (e.g. 010..., 012..., 011..., 015..., ٠١٠...)
    const detected = detectWalletInfo(cleanTrimmed);

    return {
      appType: 'wallet',
      appTitleAr: `${detected.nameAr} - ${detected.nameEn}`,
      schemeUrl: '', // Dedicated copy screen only - NO intent or USSD
      fallbackUrl: '',
      displayUrl: detected.cleanPhone,
      isWalletCard: true, // Show dedicated luxury card with logo, company name, phone, and copy button ONLY!
      walletProvider: detected.provider,
      walletProviderNameAr: detected.nameAr,
      walletProviderNameEn: detected.nameEn,
      walletCompanyNameAr: detected.companyNameAr,
      walletPhone: detected.cleanPhone,
      walletFormattedPhone: detected.formattedPhone,
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

  // 3. InstaPay Egypt (Quick Pay Link ONLY - Direct instant redirect)
  const isInstaPay =
    preferredType === 'instapay' ||
    trimmed.includes('ipn.eg') ||
    trimmed.includes('instapay');

  if (isInstaPay) {
    let paymentUrl = trimmed;
    if (paymentUrl.startsWith('ipn.eg/')) {
      paymentUrl = `https://${paymentUrl}`;
    } else if (!paymentUrl.startsWith('http://') && !paymentUrl.startsWith('https://')) {
      if (paymentUrl.includes('ipn.eg')) {
        paymentUrl = `https://${paymentUrl}`;
      } else {
        paymentUrl = `https://ipn.eg/${paymentUrl.replace(/^@/, '').replace(/@instapay$/i, '')}`;
      }
    }

    return {
      appType: 'instapay',
      appTitleAr: 'إنستاباي InstaPay',
      schemeUrl: paymentUrl,
      fallbackUrl: paymentUrl,
      displayUrl: paymentUrl.replace(/^https?:\/\//, ''),
      isInstaPayCard: false, // Direct instant redirect to InstaPay quick payment link!
    };
  }



  // 4. Instagram
  const isInstagram =
    preferredType === 'instagram' ||
    trimmed.includes('instagram.com') ||
    (preferredType === undefined && rawInput.trim().startsWith('@') && !trimmed.includes('instapay'));

  if (isInstagram) {
    const universalUrl = formatInstagramTargetUrl(trimmed || rawInput);
    const match = universalUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    const username = match ? match[1] : trimmed.replace(/^@/, '');

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
    const universalUrl = formatTelegramTargetUrl(trimmed || rawInput);
    const match = universalUrl.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/);
    const handle = match ? match[1] : trimmed.replace(/^@/, '');

    return {
      appType: 'telegram',
      appTitleAr: 'تيليجرام Telegram',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `t.me/${handle}`,
    };
  }

  // 7. TikTok (Direct App & Profile Universal Link)
  const isTikTok =
    preferredType === 'tiktok' ||
    trimmed.includes('tiktok.com');

  if (isTikTok) {
    const universalUrl = formatTikTokTargetUrl(trimmed || rawInput);
    const match = universalUrl.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/i);
    const displayUser = match ? match[1] : trimmed.replace(/^@/, '');

    return {
      appType: 'tiktok',
      appTitleAr: 'تيك توك TikTok',
      schemeUrl: universalUrl,
      fallbackUrl: universalUrl,
      displayUrl: `tiktok.com/@${displayUser}`,
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
  if (!target || target === '#' || target.startsWith('intent:') || !isSafeUrlScheme(target)) return;

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
