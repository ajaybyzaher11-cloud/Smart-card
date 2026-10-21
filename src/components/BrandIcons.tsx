import React from 'react';
import { AppType } from '../types/qr';

interface BrandIconProps {
  className?: string;
  size?: number;
}

/**
 * Official WhatsApp Brand SVG Icon
 */
export function WhatsAppIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <path
        fill="#25D366"
        d="M12.004 2C6.48 2 2 6.48 2 12c0 1.95.56 3.77 1.53 5.32L2 22l4.82-1.5c1.48.88 3.22 1.38 5.18 1.38 5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.25c-1.68 0-3.24-.48-4.57-1.32l-.33-.21-2.86.89.9-2.77-.22-.35c-.94-1.45-1.47-3.14-1.47-4.49 0-4.55 3.7-8.25 8.25-8.25 4.55 0 8.25 3.7 8.25 8.25 0 4.55-3.7 8.25-8.25 8.25zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.12.17 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"
      />
    </svg>
  );
}

/**
 * Official InstaPay Brand SVG Icon (Egyptian Instant Payment Network)
 */
export function InstaPayIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="22" fill="#4B0082" />
      {/* Dynamic InstaPay Stylized Bolt / 'i' Accent */}
      <path
        d="M26 68L48 26H74L52 68H26Z"
        fill="url(#instapay_grad_1)"
      />
      <circle cx="68" cy="34" r="8" fill="#00D2FF" />
      <path
        d="M38 74L46 58H68L60 74H38Z"
        fill="#FF007A"
      />
      <defs>
        <linearGradient id="instapay_grad_1" x1="26" y1="26" x2="74" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF007A" />
          <stop offset="0.5" stopColor="#9B51E0" />
          <stop offset="1" stopColor="#00D2FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Official Instagram Brand SVG Icon (Gradient Camera)
 */
export function InstagramIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="6" fill="url(#ig_grad)" />
      <path
        d="M12 7.25C9.37 7.25 7.25 9.37 7.25 12C7.25 14.63 9.37 16.75 12 16.75C14.63 16.75 16.75 14.63 16.75 12C16.75 9.37 14.63 7.25 12 7.25ZM12 15.15C10.26 15.15 8.85 13.74 8.85 12C8.85 10.26 10.26 8.85 12 8.85C13.74 8.85 15.15 10.26 15.15 12C15.15 13.74 13.74 15.15 12 15.15ZM17.93 6.94C17.93 7.57 17.43 8.07 16.8 8.07C16.17 8.07 15.67 7.57 15.67 6.94C15.67 6.31 16.17 5.81 16.8 5.81C17.43 5.81 17.93 6.31 17.93 6.94Z"
        fill="white"
      />
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="white"
        strokeWidth="1.5"
      />
      <defs>
        <radialGradient id="ig_grad" cx="20%" cy="100%" r="130%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="20%" stopColor="#F77737" />
          <stop offset="40%" stopColor="#F56040" />
          <stop offset="60%" stopColor="#FD1D1D" />
          <stop offset="80%" stopColor="#E1306C" />
          <stop offset="90%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * Official Facebook Brand SVG Icon
 */
export function FacebookIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        d="M15.5 12.3l.5-3.3h-3.2v-2.1c0-.9.4-1.8 1.9-1.8H16V2.3c-.6-.1-1.6-.2-2.7-.2-2.8 0-4.6 1.7-4.6 4.7v2.2H5.8v3.3h2.9V21.5c.6.1 1.2.2 1.8.2.6 0 1.2-.1 1.8-.2V12.3h3.2z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Official TikTok Brand SVG Icon
 */
export function TikTokIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        fill="#00F2FE"
        d="M16.6 8.2c-1.1-.3-2-1.1-2.3-2.2h-2.1v9.5c0 1.4-1.1 2.5-2.5 2.5-1.4 0-2.5-1.1-2.5-2.5 0-1.4 1.1-2.5 2.5-2.5.3 0 .6.1.9.2v-2.3c-.3 0-.6-.1-.9-.1-2.6 0-4.7 2.1-4.7 4.7s2.1 4.7 4.7 4.7 4.7-2.1 4.7-4.7V9.7c1.1.8 2.5 1.2 3.9 1.2v-2.2c-.6 0-1.2-.2-1.7-.5z"
      />
      <path
        fill="#FE2C55"
        d="M16.9 8c-1.1-.3-2-1.1-2.3-2.2h-1.8v9.5c0 1.4-1.1 2.5-2.5 2.5-1.4 0-2.5-1.1-2.5-2.5 0-1.4 1.1-2.5 2.5-2.5.3 0 .6.1.9.2v-2c-.3 0-.6-.1-.9-.1-2.6 0-4.7 2.1-4.7 4.7s2.1 4.7 4.7 4.7 4.7-2.1 4.7-4.7V9.5c1.1.8 2.5 1.2 3.9 1.2V8.3c-.6 0-1.2-.1-1.7-.3z"
      />
      <path
        fill="#FFFFFF"
        d="M16.6 8.1c-1.1-.3-2-1.1-2.3-2.2h-2v9.5c0 1.4-1.1 2.5-2.5 2.5-1.4 0-2.5-1.1-2.5-2.5 0-1.4 1.1-2.5 2.5-2.5.3 0 .6.1.9.2v-2.2c-.3 0-.6-.1-.9-.1-2.6 0-4.7 2.1-4.7 4.7s2.1 4.7 4.7 4.7 4.7-2.1 4.7-4.7V9.6c1.1.8 2.5 1.2 3.9 1.2V8.5c-.6 0-1.2-.1-1.7-.4z"
      />
    </svg>
  );
}

/**
 * Official Telegram Brand SVG Icon
 */
export function TelegramIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="11" fill="#229ED9" />
      <path
        d="M5.4 11.8l10.9-4.5c.5-.2 1 .1.8.7l-1.9 8.8c-.1.6-.5.8-1 .5l-2.8-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.2-.9z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Vodafone Cash / Smart Wallet Icon
 */
export function WalletCashIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="6" fill="#E60000" />
      {/* Wallet body */}
      <path
        d="M4 8.5C4 7.12 5.12 6 6.5 6H17.5C18.88 6 20 7.12 20 8.5V16.5C20 17.88 18.88 19 17.5 19H6.5C5.12 19 4 17.88 4 16.5V8.5Z"
        fill="white"
      />
      {/* Pocket flap with gold coin/card badge */}
      <path
        d="M15 10.5C15 9.67 15.67 9 16.5 9H20V15H16.5C15.67 15 15 14.33 15 13.5V10.5Z"
        fill="#FFCC00"
      />
      <circle cx="17.5" cy="12" r="1" fill="#E60000" />
    </svg>
  );
}

/**
 * Bank Account Brand Icon (Classic Columns with Gold Accents)
 */
export function BankAccountIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="6" fill="#0F172A" stroke="#EAB308" strokeWidth="1" />
      {/* Roof */}
      <path d="M12 4.5L4.5 8H19.5L12 4.5Z" fill="#FACC15" />
      {/* Pillars */}
      <rect x="6" y="9.5" width="2" height="6.5" rx="0.5" fill="#E2E8F0" />
      <rect x="9.5" y="9.5" width="2" height="6.5" rx="0.5" fill="#E2E8F0" />
      <rect x="13" y="9.5" width="2" height="6.5" rx="0.5" fill="#E2E8F0" />
      <rect x="16.5" y="9.5" width="2" height="6.5" rx="0.5" fill="#E2E8F0" />
      {/* Base */}
      <rect x="4" y="17" width="16" height="2" rx="0.5" fill="#FACC15" />
    </svg>
  );
}

/**
 * Phone Call Icon (Green dialer badge)
 */
export function PhoneCallIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="11" fill="#10B981" />
      <path
        d="M15.4 13.8c-.3-.2-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.9 1-.1.2-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.2.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.2-.3-.3-.6-.4z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Website / Domain Icon
 */
export function WebsiteGlobeIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="11" fill="#3B82F6" />
      <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.2" />
      <ellipse cx="12" cy="12" rx="4" ry="8" stroke="white" strokeWidth="1.2" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="white" strokeWidth="1.2" />
      <line x1="6" y1="7.5" x2="18" y2="7.5" stroke="white" strokeWidth="1" strokeDasharray="1 1" />
      <line x1="6" y1="16.5" x2="18" y2="16.5" stroke="white" strokeWidth="1" strokeDasharray="1 1" />
    </svg>
  );
}

/**
 * Universal Brand Icon Dispatcher
 */
export function PlatformBrandIcon({ type, className = 'w-6 h-6', size }: { type: AppType; className?: string; size?: number }) {
  switch (type) {
    case 'whatsapp':
      return <WhatsAppIcon className={className} size={size} />;
    case 'instapay':
      return <InstaPayIcon className={className} size={size} />;
    case 'instagram':
      return <InstagramIcon className={className} size={size} />;
    case 'facebook':
      return <FacebookIcon className={className} size={size} />;
    case 'tiktok':
      return <TikTokIcon className={className} size={size} />;
    case 'telegram':
      return <TelegramIcon className={className} size={size} />;
    case 'wallet':
      return <WalletCashIcon className={className} size={size} />;
    case 'bank':
      return <BankAccountIcon className={className} size={size} />;
    case 'phone':
      return <PhoneCallIcon className={className} size={size} />;
    case 'website':
    default:
      return <WebsiteGlobeIcon className={className} size={size} />;
  }
}
