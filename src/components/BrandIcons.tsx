import React from 'react';
import { AppType } from '../types/qr';

interface BrandIconProps {
  className?: string;
  size?: number;
}

/**
 * 1. Official WhatsApp App Squircle Icon
 * Uses official squircle app icon asset provided by user (1792666710853_e8958abe.jpg)
 */
export function WhatsAppIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <img
      src="/whatsapp-app-logo.png"
      alt="WhatsApp"
      width={size}
      height={size}
      className={`${className} object-contain rounded-xl select-none drop-shadow-sm`}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * 2. Official Facebook App Squircle Icon
 * Matches the official Facebook 3D squircle app icon (user uploaded 1792666781397.jpg)
 */
export function FacebookIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fb_squircle_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1977F3" />
          <stop offset="1" stopColor="#0D61D9" />
        </linearGradient>
        <linearGradient id="fb_glass_sheen" x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Squircle Base */}
      <rect width="100" height="100" rx="22" fill="url(#fb_squircle_grad)" />
      {/* Specular Highlight */}
      <path d="M0 22C0 9.85 9.85 0 22 0h56c12.15 0 22 9.85 22 22v12C68 38 32 38 0 32V22z" fill="url(#fb_glass_sheen)" />
      {/* Bold Facebook 'f' reaching right to the bottom edge */}
      <path
        d="M66.5 100V61.5H79.5L81.5 46.5H66.5V36.9C66.5 32.6 67.7 29.6 74 29.6H82V16.2C80.6 16 75.8 15.6 70.2 15.6C58.5 15.6 50.5 22.7 50.5 35.8V46.5H38V61.5H50.5V100H66.5Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * 3. Official Google Phone / Dialer Squircle Icon
 * Matches the official Google Phone app icon (user uploaded 1792666875207.jpg)
 */
export function PhoneCallIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="phone_white_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>
        <filter id="phone_soft_shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>
      </defs>
      {/* Pure White Squircle Base with Soft Inset Border */}
      <rect width="100" height="100" rx="22" fill="url(#phone_white_grad)" stroke="#E2E8F0" strokeWidth="1" filter="url(#phone_soft_shadow)" />
      {/* Google Dual-Tone Blue Phone Handset */}
      <g transform="translate(18, 18) scale(0.64)">
        {/* Dark Blue Upper Earpiece & Grip (#1A73E8) */}
        <path
          d="M34.5 10.5C31.2 3.1 22.6 0 15.2 3.3L4.8 7.9C1.8 9.2 0 12.3 0 15.6C0 54.5 31.5 86 70.4 86C73.7 86 76.8 84.2 78.1 81.2L82.7 70.8C86 63.4 82.9 54.8 75.5 51.5L63.5 46.2C57.4 43.5 50.1 45.4 46.2 50.8L40.8 58.2C29.2 51.5 20.5 42.8 13.8 31.2L21.2 25.8C26.6 21.9 28.5 14.6 25.8 8.5L20.5-3.5"
          display="none"
        />
        {/* Crisp Vector Geometry matching uploaded dialer image */}
        {/* Top/Backgrip section in Deep Google Blue */}
        <path
          d="M48 10C42 10 32 16 28 26L21 44C16 57 26 73 39 83L49 90C59 96 73 98 83 91L92 84C97 80 99 74 96 69L87 51C84 46 78 44 73 47L64 52C55 45 48 37 42 27L48 19C52 14 51 8 46 4L48 10Z"
          display="none"
        />
        {/* Precise Handset Paths */}
        {/* Upper/Earpiece in #1A73E8 */}
        <path
          d="M42.8 6.5C36.2 1.3 26.6 2.6 21.4 9.2L12.5 20.6C7.8 26.5 7.4 34.6 11.5 41C19.8 54.1 31.9 66.2 45 74.5C51.4 78.6 59.5 78.2 65.4 73.5L76.8 64.6C83.4 59.4 84.7 49.8 79.5 43.2L69.8 30.9C65.2 25.1 57.1 23.6 50.7 27.6L45.2 31.1C39.4 27.2 34.8 22.6 30.9 16.8L34.4 11.3C38.4 4.9 36.9-3.2 31.1-7.8"
          display="none"
        />
        {/* Clean Material Dialer Handset */}
        {/* Top Dark Blue (#1A73E8) */}
        <path
          d="M32.5 12C28.2 5.5 19.5 3.8 13 8.1L5.8 12.9C1.9 15.5 0 20 0 24.6C0 60.7 29.3 90 65.4 90C70 90 74.5 88.1 77.1 84.2L81.9 77C86.2 70.5 84.5 61.8 78 57.5L64.8 48.7C59.2 45 51.8 46.2 47.7 51.5L42.5 58.1C32.8 52.8 25.2 45.2 19.9 35.5L26.5 30.3C31.8 26.2 33 18.8 29.3 13.2L32.5 12Z"
          fill="#1A73E8"
        />
        {/* Bottom Curved Highlight (#4285F4) */}
        <path
          d="M65.4 90C29.3 90 0 60.7 0 24.6C0 22.3.5 20.1 1.4 18 10 52 38 80 72 88.6c-2.1.9-4.3 1.4-6.6 1.4z"
          fill="#4285F4"
          fillOpacity="0.8"
        />
        <path
          d="M20 35.5C25.3 45.2 32.9 52.8 42.6 58.1L35 68C22 58 12 48 2 35l9.5-6.5L20 35.5z"
          fill="#4285F4"
        />
      </g>
    </svg>
  );
}

/**
 * 4. Official InstaPay App Squircle Icon
 * Uses high-resolution squircle app icon asset provided by user
 */
export function InstaPayIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <img
      src="/instapay-app-logo.png"
      alt="InstaPay"
      width={size}
      height={size}
      className={`${className} object-contain rounded-xl select-none drop-shadow-sm`}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * 5. Official Instagram App Squircle Icon
 */
export function InstagramIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ig_squircle_grad" cx="20%" cy="100%" r="130%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="20%" stopColor="#F77737" />
          <stop offset="40%" stopColor="#F56040" />
          <stop offset="60%" stopColor="#FD1D1D" />
          <stop offset="80%" stopColor="#E1306C" />
          <stop offset="90%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </radialGradient>
        <linearGradient id="ig_glass_sheen" x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.25" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Squircle Base */}
      <rect width="100" height="100" rx="22" fill="url(#ig_squircle_grad)" />
      <path d="M0 22C0 9.85 9.85 0 22 0h56c12.15 0 22 9.85 22 22v12C68 38 32 38 0 32V22z" fill="url(#ig_glass_sheen)" />
      {/* Camera Outer Rounded Rect */}
      <rect x="23" y="23" width="54" height="54" rx="15" stroke="white" strokeWidth="6" />
      {/* Camera Center Lens */}
      <circle cx="50" cy="50" r="13" stroke="white" strokeWidth="6" />
      {/* Camera Flash Dot */}
      <circle cx="66" cy="34" r="3.5" fill="white" />
    </svg>
  );
}

/**
 * 6. Official TikTok App Squircle Icon
 */
export function TikTokIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tiktok_base_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16161A" />
          <stop offset="1" stopColor="#08080A" />
        </linearGradient>
      </defs>
      {/* Carbon Matte Squircle */}
      <rect width="100" height="100" rx="22" fill="url(#tiktok_base_grad)" stroke="#27272A" strokeWidth="1" />
      {/* 3D Cyan Layer */}
      <path
        fill="#00F2FE"
        d="M68.5 35.5c-4.4-1.2-8-4.4-9.2-8.8h-8.4v38c0 5.6-4.4 10-10 10s-10-4.4-10-10 4.4-10 10-10c1.2 0 2.4.4 3.6.8V26.3c-1.2-.4-2.4-.4-3.6-.4-10.4 0-18.8 8.4-18.8 18.8s8.4 18.8 18.8 18.8 18.8-8.4 18.8-18.8V41.5c4.4 3.2 10 4.8 15.6 4.8V37.5c-2.4 0-4.8-.8-6.8-2z"
      />
      {/* 3D Red Layer */}
      <path
        fill="#FE2C55"
        d="M69.7 34.7c-4.4-1.2-8-4.4-9.2-8.8h-7.2v38c0 5.6-4.4 10-10 10s-10-4.4-10-10 4.4-10 10-10c1.2 0 2.4.4 3.6.8v-8.8c-1.2-.4-2.4-.4-3.6-.4-10.4 0-18.8 8.4-18.8 18.8s8.4 18.8 18.8 18.8 18.8-8.4 18.8-18.8V40.7c4.4 3.2 10 4.8 15.6 4.8v-8.8c-2.4 0-4.8-.8-6.8-2z"
      />
      {/* White Core */}
      <path
        fill="#FFFFFF"
        d="M68.5 35.1c-4.4-1.2-8-4.4-9.2-8.8h-8v38c0 5.6-4.4 10-10 10s-10-4.4-10-10 4.4-10 10-10c1.2 0 2.4.4 3.6.8v-8.8c-1.2-.4-2.4-.4-3.6-.4-10.4 0-18.8 8.4-18.8 18.8s8.4 18.8 18.8 18.8 18.8-8.4 18.8-18.8V41.1c4.4 3.2 10 4.8 15.6 4.8v-8.8c-2.4 0-4.8-.8-6.8-2z"
      />
    </svg>
  );
}

/**
 * 7. Official Telegram App Squircle Icon
 */
export function TelegramIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tg_squircle_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2CB5E8" />
          <stop offset="1" stopColor="#1D96D2" />
        </linearGradient>
        <linearGradient id="tg_glass_sheen" x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.25" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Squircle Base */}
      <rect width="100" height="100" rx="22" fill="url(#tg_squircle_grad)" />
      <path d="M0 22C0 9.85 9.85 0 22 0h56c12.15 0 22 9.85 22 22v12C68 38 32 38 0 32V22z" fill="url(#tg_glass_sheen)" />
      {/* Origami Paper Plane */}
      <path
        d="M23 49.5L69 31C71.1 30.1 73.1 31.5 72.5 33.7L64.5 71.5C64 74 61.8 74.8 59.8 73.5L48 64.6L42 70.3C41.2 71.1 40.5 71.8 39 71.8L40 59.2L63 38.5C64 37.6 62.8 37.1 61.5 38L33 55.8L21.2 52.1C18.6 51.3 18.5 49.6 21.3 48.5L23 49.5Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * 8. Official Vodafone Cash Icon
 * Uses official transparent brand logo provided by user (/wallets/vodafone-cash.png)
 */
export function VodafoneCashIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`${className} select-none drop-shadow-md`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="vf_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E60000" />
            <stop offset="1" stopColor="#A80000" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#vf_grad)" />
        <circle cx="50" cy="42" r="18" fill="white" />
        <circle cx="50" cy="42" r="11" fill="#E60000" />
        <rect x="22" y="72" width="56" height="16" rx="8" fill="white" />
        <text x="50" y="84" textAnchor="middle" fill="#E60000" fontSize="10.5" fontWeight="900" fontFamily="sans-serif">
          CASH
        </text>
      </svg>
    );
  }

  return (
    <img
      src="/wallets/vodafone-cash.png"
      alt="فودافون كاش - Vodafone Cash"
      width={size}
      height={size}
      className={`${className} object-contain select-none drop-shadow-md`}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * 8b. Official Orange Cash Icon
 * Uses official transparent brand logo provided by user (/wallets/orange-cash.png)
 */
export function OrangeCashIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`${className} select-none drop-shadow-md`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="orange_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF7900" />
            <stop offset="1" stopColor="#E05B00" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#orange_grad)" />
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="sans-serif">
          orange
        </text>
        <rect x="22" y="68" width="56" height="18" rx="9" fill="#000000" />
        <text x="50" y="81" textAnchor="middle" fill="#FF7900" fontSize="11" fontWeight="900" fontFamily="sans-serif">
          CASH
        </text>
      </svg>
    );
  }

  return (
    <img
      src="/wallets/orange-cash.png"
      alt="أورنج كاش - Orange Cash"
      width={size}
      height={size}
      className={`${className} object-contain select-none drop-shadow-md`}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * 8c. Official Etisalat Cash (e& eg كاش) Icon
 * Uses official transparent brand logo provided by user (/wallets/etisalat-cash.png)
 */
export function EtisalatCashIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`${className} select-none drop-shadow-md`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="eti_bg" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#121D13" />
            <stop offset="1" stopColor="#081009" />
          </linearGradient>
          <linearGradient id="eti_green_grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8CC63F" />
            <stop offset="1" stopColor="#6BA524" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#eti_bg)" stroke="#719E19" strokeWidth="2" />
        <text x="50" y="50" textAnchor="middle" fill="#A3E635" fontSize="13" fontWeight="800" fontFamily="sans-serif">
          e& eg
        </text>
        <rect x="22" y="70" width="56" height="18" rx="9" fill="url(#eti_green_grad)" />
        <text x="50" y="83" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="900" fontFamily="sans-serif">
          كاش
        </text>
      </svg>
    );
  }

  return (
    <img
      src="/wallets/etisalat-cash.png"
      alt="اتصالات كاش - Etisalat Cash"
      width={size}
      height={size}
      className={`${className} object-contain select-none drop-shadow-md`}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * 8d. Official WE Pay (Telecom Egypt) Icon
 * Uses official transparent brand logo provided by user (/wallets/we-pay.png)
 */
export function WePayIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`${className} select-none drop-shadow-md`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="we_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#662D91" />
            <stop offset="1" stopColor="#431868" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#we_grad)" />
        <text x="50" y="48" textAnchor="middle" fill="white" fontSize="16" fontWeight="900" fontFamily="sans-serif">
          we
        </text>
        <rect x="24" y="70" width="52" height="18" rx="9" fill="#FACC15" />
        <text x="50" y="83" textAnchor="middle" fill="#431868" fontSize="11" fontWeight="900" fontFamily="sans-serif">
          PAY
        </text>
      </svg>
    );
  }

  return (
    <img
      src="/wallets/we-pay.png"
      alt="وي باي - WE Pay"
      width={size}
      height={size}
      className={`${className} object-contain select-none drop-shadow-md`}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * 8e. General Smart Wallet Squircle Icon
 */
export function WalletCashIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wallet_squircle_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA1D25" />
          <stop offset="1" stopColor="#B30D14" />
        </linearGradient>
        <linearGradient id="wallet_gold_crest" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      {/* Squircle Base */}
      <rect width="100" height="100" rx="22" fill="url(#wallet_squircle_grad)" />
      {/* Wallet Body */}
      <rect x="20" y="30" width="60" height="42" rx="8" fill="white" />
      {/* Inner Pocket Flap */}
      <path d="M58 41C58 37.7 60.7 35 64 35H80V67H64C60.7 67 58 64.3 58 61V41Z" fill="url(#wallet_gold_crest)" />
      {/* Gold Coin / Currency Lock */}
      <circle cx="69" cy="51" r="4.5" fill="#B30D14" />
      <circle cx="69" cy="51" r="2.5" fill="#FDE047" />
      {/* Wallet subtle waveform bars */}
      <rect x="27" y="42" width="18" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="27" y="49" width="24" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="27" y="56" width="14" height="3" rx="1.5" fill="#E2E8F0" />
    </svg>
  );
}

/**
 * Smart Wallet Provider Icon Selector
 * Directly renders the official brand logo according to the wallet operator
 */
export function WalletProviderIcon({
  provider,
  className = 'w-6 h-6',
  size,
}: {
  provider?: 'vodafone' | 'orange' | 'etisalat' | 'we' | 'generic';
  className?: string;
  size?: number;
}) {
  switch (provider) {
    case 'vodafone':
      return <VodafoneCashIcon className={className} size={size} />;
    case 'orange':
      return <OrangeCashIcon className={className} size={size} />;
    case 'etisalat':
      return <EtisalatCashIcon className={className} size={size} />;
    case 'we':
      return <WePayIcon className={className} size={size} />;
    default:
      return <WalletCashIcon className={className} size={size} />;
  }
}

/**
 * 9. Luxury Bank Account Squircle Icon (24K Gold & Obsidian Pillars)
 */
export function BankAccountIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bank_obsidian_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E2330" />
          <stop offset="1" stopColor="#0B0E14" />
        </linearGradient>
        <linearGradient id="bank_gold_grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#EAB308" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      {/* Obsidian Squircle with Gold Border */}
      <rect width="100" height="100" rx="22" fill="url(#bank_obsidian_grad)" stroke="url(#bank_gold_grad)" strokeWidth="1.5" />
      {/* Classical Temple Pediment / Roof */}
      <path d="M50 22L22 36H78L50 22Z" fill="url(#bank_gold_grad)" />
      {/* Architrave */}
      <rect x="22" y="38" width="56" height="4" rx="1" fill="#FEF08A" />
      {/* 4 Majestic Pillars */}
      <rect x="27" y="45" width="7" height="24" rx="2" fill="#F8FAFC" />
      <rect x="39" y="45" width="7" height="24" rx="2" fill="#F8FAFC" />
      <rect x="54" y="45" width="7" height="24" rx="2" fill="#F8FAFC" />
      <rect x="66" y="45" width="7" height="24" rx="2" fill="#F8FAFC" />
      {/* Base Steps */}
      <rect x="20" y="71" width="60" height="4" rx="1" fill="#FEF08A" />
      <rect x="16" y="77" width="68" height="5" rx="1.5" fill="url(#bank_gold_grad)" />
    </svg>
  );
}

/**
 * 10. Website / Web Domain Squircle Icon
 */
export function WebsiteGlobeIcon({ className = 'w-6 h-6', size }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} select-none drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="web_squircle_grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="web_glass_sheen" x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.25" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Deep Royal Sapphire Squircle */}
      <rect width="100" height="100" rx="22" fill="url(#web_squircle_grad)" />
      <path d="M0 22C0 9.85 9.85 0 22 0h56c12.15 0 22 9.85 22 22v12C68 38 32 38 0 32V22z" fill="url(#web_glass_sheen)" />
      {/* Globe Wireframe */}
      <circle cx="50" cy="50" r="26" stroke="white" strokeWidth="4" />
      <ellipse cx="50" cy="50" rx="13" ry="26" stroke="white" strokeWidth="3.5" />
      <line x1="24" y1="50" x2="76" y2="50" stroke="white" strokeWidth="3.5" />
      <line x1="30" y1="36" x2="70" y2="36" stroke="white" strokeWidth="2.5" strokeDasharray="3 2" />
      <line x1="30" y1="64" x2="70" y2="64" stroke="white" strokeWidth="2.5" strokeDasharray="3 2" />
    </svg>
  );
}

/**
 * Universal Brand Icon Dispatcher
 */
export function PlatformBrandIcon({
  type,
  className = 'w-6 h-6',
  size,
  targetUrl,
  walletProvider,
}: {
  type: AppType;
  className?: string;
  size?: number;
  targetUrl?: string;
  walletProvider?: 'vodafone' | 'orange' | 'etisalat' | 'we' | 'generic';
}) {
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
    case 'wallet': {
      let prov = walletProvider;
      if (!prov && targetUrl) {
        const clean = targetUrl.replace(/[^\d]/g, '');
        if (clean.includes('010') || targetUrl.startsWith('010') || clean.startsWith('10')) prov = 'vodafone';
        else if (clean.includes('012') || targetUrl.startsWith('012') || clean.startsWith('12')) prov = 'orange';
        else if (clean.includes('011') || targetUrl.startsWith('011') || clean.startsWith('11')) prov = 'etisalat';
        else if (clean.includes('015') || targetUrl.startsWith('015') || clean.startsWith('15')) prov = 'we';
      }
      return <WalletProviderIcon provider={prov} className={className} size={size} />;
    }
    case 'bank':
      return <BankAccountIcon className={className} size={size} />;
    case 'phone':
      return <PhoneCallIcon className={className} size={size} />;
    case 'website':
    default:
      return <WebsiteGlobeIcon className={className} size={size} />;
  }
}
