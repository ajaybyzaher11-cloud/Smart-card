export type AppType = 
  | 'bank'
  | 'instapay'
  | 'wallet'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'telegram'
  | 'tiktok'
  | 'snapchat'
  | 'phone'
  | 'website'
  | 'other';

export interface BankDetails {
  bankName: string;
  accountName?: string;
  accountNumber: string;
  iban?: string;
  notes?: string;
}

export type SubscriptionPlan = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'unlimited' | 'custom';

export interface QrCodeRecord {
  id: string; // Primary key, immutable nanoid(10)
  is_active: boolean; // default false, becomes true on first activation
  target_url: string | null; // Smart deep link, URL, or bank URI
  app_type?: AppType;
  created_at: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
  total_scans?: number;
  label?: string; // Optional friendly label or note by admin
  bank_details?: BankDetails;
  expires_at?: string | null; // ISO timestamp or null for permanent
  subscription_months?: number; // e.g. 1 for monthly, 3, 6, 12, or 0 for unlimited
}

export interface DeepLinkInfo {
  appType: AppType;
  appTitleAr: string;
  schemeUrl: string; // Native app URI scheme or direct target
  fallbackUrl: string; // Web fallback
  displayUrl: string;
  isBankCard?: boolean;
  bankDetails?: BankDetails;
}

export interface PlatformSettings {
  developer_whatsapp: string; // e.g. "01550523365"
  developer_contact_url: string; // e.g. "https://wa.me/201550523365"
  developer_title?: string;
  support_message?: string;
  public_domain_url?: string; // Real production domain, e.g. "https://smartcard-app.onrender.com"
}

