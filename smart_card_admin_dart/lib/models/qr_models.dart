import 'package:flutter/material.dart';

enum AppType {
  whatsapp,
  instapay,
  wallet,
  bank,
  instagram,
  facebook,
  tiktok,
  telegram,
  snapchat,
  phone,
  website,
  other;

  static AppType fromString(String? value) {
    final v = (value ?? '').trim().toLowerCase();
    for (final t in AppType.values) {
      if (t.name == v) return t;
    }
    return AppType.website;
  }

  String get labelAr {
    switch (this) {
      case AppType.whatsapp:
        return 'واتساب';
      case AppType.instapay:
        return 'إنستاباي';
      case AppType.wallet:
        return 'محفظة كاش';
      case AppType.bank:
        return 'حساب بنكي';
      case AppType.instagram:
        return 'إنستغرام';
      case AppType.facebook:
        return 'فيسبوك';
      case AppType.tiktok:
        return 'تيك توك';
      case AppType.telegram:
        return 'تيليجرام';
      case AppType.snapchat:
        return 'سناب شات';
      case AppType.phone:
        return 'اتصال هاتفي';
      case AppType.website:
        return 'موقع ويب';
      case AppType.other:
        return 'رابط مخصص';
    }
  }

  String get placeholder {
    switch (this) {
      case AppType.whatsapp:
        return '01012345678 أو wa.me/2010...';
      case AppType.instapay:
        return 'https://ipn.eg/S/... (رابط الدفع السريع)';
      case AppType.wallet:
        return '010... أو رابط الدفع السريع https://...';
      case AppType.bank:
        return 'رقم الحساب البنكي';
      case AppType.instagram:
        return '@username أو رابط instagram.com/...';
      case AppType.facebook:
        return 'https://facebook.com/yourpage';
      case AppType.tiktok:
        return '@username أو رابط tiktok.com/@...';
      case AppType.telegram:
        return '@username أو t.me/...';
      case AppType.snapchat:
        return '@username أو snapchat.com/add/...';
      case AppType.phone:
        return '01012345678 أو +2010...';
      case AppType.website:
      case AppType.other:
        return 'https://yourwebsite.com';
    }
  }

  IconData get icon {
    switch (this) {
      case AppType.whatsapp:
        return Icons.chat_rounded;
      case AppType.instapay:
        return Icons.bolt_rounded;
      case AppType.wallet:
        return Icons.account_balance_wallet_rounded;
      case AppType.bank:
        return Icons.account_balance_rounded;
      case AppType.instagram:
        return Icons.camera_alt_rounded;
      case AppType.facebook:
        return Icons.facebook_rounded;
      case AppType.tiktok:
        return Icons.music_note_rounded;
      case AppType.telegram:
        return Icons.send_rounded;
      case AppType.snapchat:
        return Icons.notifications_active_rounded;
      case AppType.phone:
        return Icons.phone_in_talk_rounded;
      case AppType.website:
        return Icons.language_rounded;
      case AppType.other:
        return Icons.link_rounded;
    }
  }

  Color get brandColor {
    switch (this) {
      case AppType.whatsapp:
        return const Color(0xFF25D366);
      case AppType.instapay:
        return const Color(0xFFA855F7);
      case AppType.wallet:
        return const Color(0xFFF59E0B);
      case AppType.bank:
        return const Color(0xFFFBBF24);
      case AppType.instagram:
        return const Color(0xFFE1306C);
      case AppType.facebook:
        return const Color(0xFF1877F2);
      case AppType.tiktok:
        return const Color(0xFF25F4EE);
      case AppType.telegram:
        return const Color(0xFF229ED9);
      case AppType.snapchat:
        return const Color(0xFFFFFC00);
      case AppType.phone:
        return const Color(0xFF10B981);
      case AppType.website:
      case AppType.other:
        return const Color(0xFF38BDF8);
    }
  }
}

enum WalletProvider {
  vodafone,
  orange,
  etisalat,
  we,
  instapay,
  generic;

  static WalletProvider fromString(String? value) {
    final v = (value ?? '').trim().toLowerCase();
    for (final p in WalletProvider.values) {
      if (p.name == v) return p;
    }
    return WalletProvider.generic;
  }

  String get nameAr {
    switch (this) {
      case WalletProvider.vodafone:
        return 'ڨودافون كاش';
      case WalletProvider.orange:
        return 'أورانج كاش';
      case WalletProvider.etisalat:
        return 'اتصالات كاش';
      case WalletProvider.we:
        return 'وي باي (WE Pay)';
      case WalletProvider.instapay:
        return 'إنستاباي';
      case WalletProvider.generic:
        return 'محفظة كاش';
    }
  }

  String get nameEn {
    switch (this) {
      case WalletProvider.vodafone:
        return 'Vodafone Cash';
      case WalletProvider.orange:
        return 'Orange Cash';
      case WalletProvider.etisalat:
        return 'Etisalat Cash';
      case WalletProvider.we:
        return 'WE Pay';
      case WalletProvider.instapay:
        return 'InstaPay';
      case WalletProvider.generic:
        return 'Cash Wallet';
    }
  }

  String get prefix {
    switch (this) {
      case WalletProvider.vodafone:
        return '010';
      case WalletProvider.orange:
        return '012';
      case WalletProvider.etisalat:
        return '011';
      case WalletProvider.we:
        return '015';
      case WalletProvider.instapay:
        return 'IPN';
      case WalletProvider.generic:
        return '01X';
    }
  }

  Color get color {
    switch (this) {
      case WalletProvider.vodafone:
        return const Color(0xFFE60000);
      case WalletProvider.orange:
        return const Color(0xFFFF7900);
      case WalletProvider.etisalat:
        return const Color(0xFF719E19);
      case WalletProvider.we:
        return const Color(0xFF7E22CE);
      case WalletProvider.instapay:
        return const Color(0xFFA855F7);
      case WalletProvider.generic:
        return const Color(0xFFF59E0B);
    }
  }
}

class WalletItem {
  final String phone;
  final WalletProvider provider;
  final String ownerName;

  const WalletItem({
    required this.phone,
    required this.provider,
    required this.ownerName,
  });

  factory WalletItem.fromJson(Map<String, dynamic> json) {
    return WalletItem(
      phone: (json['phone'] ?? '').toString(),
      provider: WalletProvider.fromString(json['provider']?.toString()),
      ownerName: (json['ownerName'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'phone': phone.trim(),
        'provider': provider.name,
        'ownerName': ownerName.trim(),
      };
}

class BankDetails {
  final String bankName;
  final String accountNumber;
  final String accountName;
  final String iban;
  final String notes;

  const BankDetails({
    required this.bankName,
    required this.accountNumber,
    this.accountName = '',
    this.iban = '',
    this.notes = '',
  });
}

class QrCodeRecord {
  final String id;
  final bool isActive;
  final String? targetUrl;
  final AppType appType;
  final String label;
  final String createdAt;
  final String updatedAt;
  final String? lastScannedAt;
  final int totalScans;
  final String? expiresAt;
  final int subscriptionMonths;
  final List<WalletItem> wallets;
  final bool isPrinted;
  final String? printedAt;

  const QrCodeRecord({
    required this.id,
    required this.isActive,
    this.targetUrl,
    this.appType = AppType.website,
    this.label = '',
    required this.createdAt,
    required this.updatedAt,
    this.lastScannedAt,
    this.totalScans = 0,
    this.expiresAt,
    this.subscriptionMonths = 1,
    this.wallets = const [],
    this.isPrinted = false,
    this.printedAt,
  });

  bool get isExpired {
    if (expiresAt == null || expiresAt!.trim().isEmpty) return false;
    final parsed = DateTime.tryParse(expiresAt!);
    if (parsed == null) return false;
    return parsed.isBefore(DateTime.now());
  }

  factory QrCodeRecord.fromJson(Map<String, dynamic> json) {
    final rawWallets = json['wallets'];
    final parsedWallets = <WalletItem>[];
    if (rawWallets is List) {
      for (final item in rawWallets) {
        if (item is Map<String, dynamic>) {
          parsedWallets.add(WalletItem.fromJson(item));
        } else if (item is Map) {
          parsedWallets.add(WalletItem.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }

    return QrCodeRecord(
      id: (json['id'] ?? '').toString(),
      isActive: json['is_active'] == true,
      targetUrl: json['target_url']?.toString(),
      appType: AppType.fromString(json['app_type']?.toString()),
      label: (json['label'] ?? '').toString(),
      createdAt: (json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
      updatedAt: (json['updated_at'] ?? json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
      lastScannedAt: json['last_scanned_at']?.toString(),
      totalScans: (json['total_scans'] is num)
          ? (json['total_scans'] as num).toInt()
          : int.tryParse(json['total_scans']?.toString() ?? '0') ?? 0,
      expiresAt: json['expires_at']?.toString(),
      subscriptionMonths: (json['subscription_months'] is num)
          ? (json['subscription_months'] as num).toInt()
          : int.tryParse(json['subscription_months']?.toString() ?? '1') ?? 1,
      wallets: parsedWallets,
      isPrinted: json['is_printed'] == true,
      printedAt: json['printed_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'id': id,
      'is_active': isActive,
      'target_url': targetUrl,
      'app_type': appType.name,
      'label': label,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'total_scans': totalScans,
      'expires_at': expiresAt,
      'subscription_months': subscriptionMonths,
      'is_printed': isPrinted,
      'printed_at': printedAt,
    };
    if (lastScannedAt != null && lastScannedAt!.isNotEmpty) {
      map['last_scanned_at'] = lastScannedAt;
    }
    if (appType == AppType.wallet && wallets.isNotEmpty) {
      map['wallets'] = wallets.map((w) => w.toJson()).toList();
    }
    return map;
  }
}

class PlatformSettings {
  final String developerWhatsapp;
  final String developerContactUrl;
  final String developerTitle;
  final String supportMessage;
  final String publicDomainUrl;

  const PlatformSettings({
    this.developerWhatsapp = '01550523365',
    this.developerContactUrl = 'https://wa.me/201550523365',
    this.developerTitle = 'تواصل مع المطور',
    this.supportMessage = 'مرحباً، أود التواصل بخصوص البطاقة الذكية',
    this.publicDomainUrl = 'https://smart-card-inky.vercel.app',
  });

  factory PlatformSettings.fromJson(Map<String, dynamic> json) {
    return PlatformSettings(
      developerWhatsapp: (json['developer_whatsapp'] ?? '01550523365').toString(),
      developerContactUrl: (json['developer_contact_url'] ?? 'https://wa.me/201550523365').toString(),
      developerTitle: (json['developer_title'] ?? 'تواصل مع المطور').toString(),
      supportMessage: (json['support_message'] ?? 'مرحباً، أود التواصل بخصوص البطاقة الذكية').toString(),
      publicDomainUrl: (json['public_domain_url'] ?? 'https://smart-card-inky.vercel.app').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'developer_whatsapp': developerWhatsapp,
        'developer_contact_url': developerContactUrl,
        'developer_title': developerTitle,
        'support_message': supportMessage,
        'public_domain_url': publicDomainUrl,
      };
}
