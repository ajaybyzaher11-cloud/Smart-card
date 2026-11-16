import '../models/qr_models.dart';

String normalizeArabicNumerals(String input) {
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  var out = input;
  for (var i = 0; i < arabic.length; i++) {
    out = out.replaceAll(arabic[i], i.toString());
  }
  return out;
}

bool isSafeUrlScheme(String url) {
  if (url.trim().isEmpty) return false;
  final lower = url.trim().toLowerCase();
  return !RegExp(r'^(?:javascript|data|vbscript|file|blob|about):').hasMatch(lower);
}

bool isQuickPayUrl(String input) {
  final s = normalizeArabicNumerals(input).trim();
  if (s.isEmpty) return false;
  final lower = s.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
  if (lower.startsWith('intent://') || lower.startsWith('android-app://') || lower.startsWith('android-app//')) {
    return true;
  }
  if (RegExp(r'^(vfcash|orangecash|etisalatcash|wepay|ipn|instapay)://', caseSensitive: false).hasMatch(lower)) {
    return true;
  }
  final hasDomain = lower.contains('.eg') ||
      lower.contains('.com') ||
      lower.contains('.net') ||
      lower.contains('.me') ||
      lower.contains('.io') ||
      lower.startsWith('www.') ||
      lower.contains('/');
  final digitsOnly = s.replaceAll(RegExp(r'[^\d]'), '');
  return hasDomain && (s.contains('/') || lower.startsWith('www.') || digitsOnly.length < 8);
}

WalletProvider detectWalletProviderFromUrl(String url) {
  final raw = url.trim().toLowerCase();
  if (raw.isEmpty) return WalletProvider.generic;
  var lower = raw;
  try {
    lower = Uri.decodeFull(raw);
  } catch (_) {}

  if (lower.contains('ipn.eg') || lower.contains('instapay') || lower.startsWith('ipn://')) {
    return WalletProvider.instapay;
  }
  if (lower.contains('vodafone') ||
      lower.contains('voda') ||
      lower.contains('vf.eg') ||
      lower.contains('vfcash') ||
      lower.contains('anavodafone') ||
      lower.contains('anafodafone') ||
      lower.contains('com.vf')) {
    return WalletProvider.vodafone;
  }
  if (lower.contains('orange') || lower.contains('orangecash') || lower.contains('com.orange')) {
    return WalletProvider.orange;
  }
  if (lower.contains('etisalat') ||
      lower.contains('etisalatcash') ||
      lower.contains('e&') ||
      lower.contains('eand') ||
      lower.contains('e-and') ||
      lower.contains('com.etisalat')) {
    return WalletProvider.etisalat;
  }
  if (lower.contains('te.eg') ||
      lower.contains('telecom') ||
      lower.contains('wepay') ||
      lower.contains('we-pay') ||
      lower.contains('we.eg') ||
      RegExp(r'(?:^|[^a-z])we(?:pay|cash)?(?:[^a-z]|$)').hasMatch(lower)) {
    return WalletProvider.we;
  }
  return WalletProvider.generic;
}

class DetectedWalletInfo {
  final WalletProvider provider;
  final String cleanPhone;
  final String formattedPhone;

  const DetectedWalletInfo({
    required this.provider,
    required this.cleanPhone,
    required this.formattedPhone,
  });
}

DetectedWalletInfo detectWalletInfo(String rawPhone) {
  final normalized = normalizeArabicNumerals(rawPhone);
  var cleanPhone = normalized.replaceAll(RegExp(r'[^\d]'), '');

  if (cleanPhone.startsWith('0020') && cleanPhone.length == 14) {
    cleanPhone = cleanPhone.substring(4);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length == 12) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.length == 10 && cleanPhone.startsWith('1')) {
    cleanPhone = '0$cleanPhone';
  }

  var formattedPhone = cleanPhone;
  if (cleanPhone.length == 11) {
    formattedPhone = '${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 7)} ${cleanPhone.substring(7)}';
  }

  if (cleanPhone.startsWith('010')) {
    return DetectedWalletInfo(provider: WalletProvider.vodafone, cleanPhone: cleanPhone, formattedPhone: formattedPhone);
  }
  if (cleanPhone.startsWith('012')) {
    return DetectedWalletInfo(provider: WalletProvider.orange, cleanPhone: cleanPhone, formattedPhone: formattedPhone);
  }
  if (cleanPhone.startsWith('011')) {
    return DetectedWalletInfo(provider: WalletProvider.etisalat, cleanPhone: cleanPhone, formattedPhone: formattedPhone);
  }
  if (cleanPhone.startsWith('015')) {
    return DetectedWalletInfo(provider: WalletProvider.we, cleanPhone: cleanPhone, formattedPhone: formattedPhone);
  }
  return DetectedWalletInfo(
    provider: WalletProvider.generic,
    cleanPhone: cleanPhone.isNotEmpty ? cleanPhone : rawPhone.trim(),
    formattedPhone: cleanPhone.isNotEmpty ? cleanPhone : rawPhone.trim(),
  );
}

WalletProvider resolveWalletProvider(String input, [WalletProvider? explicit]) {
  final trimmed = input.trim();
  if (trimmed.isEmpty) return WalletProvider.generic;
  if (isQuickPayUrl(trimmed)) {
    final urlProv = detectWalletProviderFromUrl(trimmed);
    if (urlProv != WalletProvider.generic) return urlProv;
    if (explicit != null && explicit != WalletProvider.generic) return explicit;
    return WalletProvider.generic;
  }
  final phoneInfo = detectWalletInfo(trimmed);
  if (phoneInfo.provider != WalletProvider.generic) return phoneInfo.provider;
  if (explicit != null && explicit != WalletProvider.generic) return explicit;
  return WalletProvider.generic;
}

String sanitizeQuickPayUrl(String raw, [WalletProvider? provider]) {
  var s = raw.trim();
  if (s.isEmpty) return '';

  s = s.replaceFirst(RegExp(r'^https?:\/\/+android-app:?\/\/', caseSensitive: false), 'android-app://');
  s = s.replaceFirst(RegExp(r'^android-app\/\/', caseSensitive: false), 'android-app://');
  s = s.replaceFirst(RegExp(r'^https?:\/\/+(https?:\/\/)', caseSensitive: false), r'$1');

  final embeddedMatch = RegExp(r'https?:\/\/[^\s"<>]+', caseSensitive: false).firstMatch(s);
  if (embeddedMatch != null) {
    return embeddedMatch.group(0) ?? s;
  }

  if (s.toLowerCase().startsWith('instapay://') || s.toLowerCase().startsWith('ipn://')) {
    return s;
  }

  if (s.startsWith('android-app://')) {
    final pkg = s.replaceFirst('android-app://', '').split('/').first.trim().toLowerCase();
    if (pkg.contains('instapay') || provider == WalletProvider.instapay) {
      return 'https://ipn.eg';
    }
    if (pkg.contains('vf') || pkg.contains('vodafone') || provider == WalletProvider.vodafone) {
      return 'intent://#Intent;package=com.vf.eg;scheme=anafodafone;S.browser_fallback_url=https%3A%2F%2Fweb.vodafone.com.eg%2Far%2Fvodafone-cash;end';
    }
    if (pkg.contains('orange') || provider == WalletProvider.orange) {
      return 'intent://#Intent;package=com.orange.mail.egypt;scheme=orangecash;S.browser_fallback_url=https%3A%2F%2Fwww.orange.eg%2Far%2Forange-cash;end';
    }
    if (pkg.contains('etisalat') || provider == WalletProvider.etisalat) {
      return 'intent://#Intent;package=com.etisalat;scheme=etisalatcash;S.browser_fallback_url=https%3A%2F%2Fwww.etisalat.eg;end';
    }
    if (pkg.contains('we') || pkg.contains('telecom') || provider == WalletProvider.we) {
      return 'intent://#Intent;package=eg.telecom.we;scheme=wepay;S.browser_fallback_url=https%3A%2F%2Fte.eg;end';
    }
    if (pkg.isNotEmpty) {
      return 'https://play.google.com/store/apps/details?id=$pkg';
    }
    return 'https://web.vodafone.com.eg/ar/vodafone-cash';
  }

  if (s.startsWith('intent://')) return s;
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    return 'https://$s';
  }
  return s;
}

String encodeBankDetails(BankDetails details) {
  final params = <String, String>{};
  if (details.bankName.isNotEmpty) params['b'] = details.bankName;
  if (details.accountNumber.isNotEmpty) params['acc'] = details.accountNumber;
  if (details.accountName.isNotEmpty) params['name'] = details.accountName;
  if (details.iban.isNotEmpty) params['iban'] = details.iban;
  if (details.notes.isNotEmpty) params['notes'] = details.notes;
  return Uri(scheme: 'bank', host: 'account', queryParameters: params).toString();
}

BankDetails? decodeBankDetails(String? uriStr) {
  if (uriStr == null || !uriStr.startsWith('bank://')) return null;
  try {
    final uri = Uri.parse(uriStr);
    return BankDetails(
      bankName: uri.queryParameters['b'] ?? 'البنك الأهلي المصري (NBE)',
      accountNumber: uri.queryParameters['acc'] ?? '',
      accountName: uri.queryParameters['name'] ?? '',
      iban: uri.queryParameters['iban'] ?? '',
      notes: uri.queryParameters['notes'] ?? '',
    );
  } catch (_) {
    return null;
  }
}

String _stripBidi(String input) {
  return input
      .replaceAll(RegExp(r'[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]'), '')
      .trim()
      .replaceAll(RegExp(r'^["\x27]|["\x27]$'), '')
      .trim();
}

String formatTikTokTargetUrl(String input) {
  final clean = _stripBidi(normalizeArabicNumerals(input));
  if (clean.isEmpty) return '';
  if (RegExp(r'^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/', caseSensitive: false).hasMatch(clean)) {
    return clean.startsWith('http') ? clean : 'https://$clean';
  }
  if (clean.contains('tiktok.com')) {
    final match = RegExp(r'tiktok\.com\/(?:@)?([a-zA-Z0-9_.-]+)', caseSensitive: false).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      final seg = match.group(1)!.replaceFirst('@', '').toLowerCase();
      return 'https://www.tiktok.com/@$seg';
    }
    return clean.startsWith('http') ? clean : 'https://$clean';
  }
  final user = clean.replaceFirst(RegExp(r'^[/@]+'), '').split('?').first.split('/').first.replaceAll(RegExp(r'[^\w.-]'), '').toLowerCase();
  return user.isNotEmpty ? 'https://www.tiktok.com/@$user' : clean;
}

String formatInstagramTargetUrl(String input) {
  final clean = _stripBidi(normalizeArabicNumerals(input));
  if (clean.isEmpty) return '';
  if (clean.contains('instagram.com/')) {
    final match = RegExp(r'instagram\.com\/([a-zA-Z0-9._]+)', caseSensitive: false).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      return 'https://www.instagram.com/${match.group(1)!.toLowerCase()}/';
    }
    return clean.startsWith('http') ? clean : 'https://$clean';
  }
  final user = clean.replaceFirst(RegExp(r'^[/@]+'), '').split('?').first.split('/').first.replaceAll(RegExp(r'[^\w.]'), '').toLowerCase();
  return user.isNotEmpty ? 'https://www.instagram.com/$user/' : clean;
}

String formatTelegramTargetUrl(String input) {
  final clean = _stripBidi(input);
  if (clean.isEmpty) return '';
  if (clean.contains('t.me/') || clean.contains('telegram.me/')) {
    final match = RegExp(r'(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)', caseSensitive: false).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      return 'https://t.me/${match.group(1)!.toLowerCase()}';
    }
    return clean.startsWith('http') ? clean : 'https://$clean';
  }
  final user = clean.replaceFirst(RegExp(r'^[/@]+'), '').split('?').first.split('/').first.replaceAll(RegExp(r'[^\w]'), '').toLowerCase();
  return user.isNotEmpty ? 'https://t.me/$user' : clean;
}

String formatSnapchatTargetUrl(String input) {
  final clean = _stripBidi(input);
  if (clean.isEmpty) return '';
  if (clean.contains('snapchat.com/add/')) {
    final match = RegExp(r'snapchat\.com\/add\/([a-zA-Z0-9_.-]+)', caseSensitive: false).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      return 'https://www.snapchat.com/add/${match.group(1)!.toLowerCase()}';
    }
    return clean.startsWith('http') ? clean : 'https://$clean';
  }
  final user = clean.replaceFirst(RegExp(r'^[/@]+'), '').split('?').first.split('/').first.replaceAll(RegExp(r'[^\w.-]'), '').toLowerCase();
  return user.isNotEmpty ? 'https://www.snapchat.com/add/$user' : clean;
}

String formatWhatsappTargetUrl(String input) {
  final clean = _stripBidi(normalizeArabicNumerals(input));
  if (clean.isEmpty) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.toLowerCase().startsWith('wa.me/')) return 'https://$clean';
  var digits = clean.replaceAll(RegExp(r'[^\d]'), '');
  if (digits.startsWith('00')) digits = digits.substring(2);
  if (digits.startsWith('01') && digits.length == 11) digits = '2$digits';
  if (digits.isNotEmpty) return 'https://wa.me/$digits';
  return clean;
}

String formatPhoneTargetUrl(String input) {
  final clean = _stripBidi(normalizeArabicNumerals(input));
  if (clean.isEmpty) return '';
  if (clean.startsWith('tel:')) return clean;
  final num = clean.replaceAll(RegExp(r'[^\d+]'), '');
  return num.isNotEmpty ? 'tel:$num' : clean;
}

String? extractQrIdFromUrl(String rawText) {
  final trimmed = rawText.trim();
  if (trimmed.isEmpty) return null;

  final qMatch = RegExp(r'/q/([a-zA-Z0-9_-]+)').firstMatch(trimmed);
  if (qMatch != null) return qMatch.group(1);

  try {
    final uri = Uri.tryParse(trimmed);
    if (uri != null) {
      for (final key in ['activate', 'view', 'scan', 'expired']) {
        final v = uri.queryParameters[key];
        if (v != null && v.isNotEmpty) return v;
      }
    }
  } catch (_) {}

  if (RegExp(r'^[a-zA-Z0-9_-]{5,24}$').hasMatch(trimmed)) {
    return trimmed;
  }
  return null;
}
