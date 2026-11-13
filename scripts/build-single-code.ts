import fs from 'fs';
import path from 'path';

const filesToInclude = [
  // Configuration & Infrastructure
  'package.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'vercel.json',
  'metadata.json',
  '.env.example',
  'firestore.rules',
  'firebase-blueprint.json',
  'firebase-applet-config.json',

  // Backend & Serverless Redirect
  'server.ts',
  'api/redirect.ts',

  // Frontend Entry & Core
  'src/main.tsx',
  'src/App.tsx',
  'src/index.css',

  // Types & Hooks
  'src/types/qr.ts',
  'src/types/jsqr.d.ts',
  'src/hooks/usePWAInstall.ts',

  // Libraries & Services
  'src/lib/firebase.ts',
  'src/lib/auth.ts',
  'src/lib/deepLinks.ts',
  'src/lib/qrService.ts',

  // Components
  'src/components/BrandIcons.tsx',
  'src/components/QrScannerModal.tsx',
  'src/components/EditQrModal.tsx',
  'src/components/BulkGenerateModal.tsx',
  'src/components/PrintSheetModal.tsx',
  'src/components/UploadQrModal.tsx',
  'src/components/DeveloperSettingsModal.tsx',
  'src/components/PWAInstallBanner.tsx',
  'src/components/PWAInstallModal.tsx',

  // Views
  'src/views/HomeLandingView.tsx',
  'src/views/AdminLoginView.tsx',
  'src/views/AdminDashboardView.tsx',
  'src/views/CustomerActivationView.tsx',
  'src/views/SmartRedirectView.tsx',
  'src/views/CardExpiredView.tsx',
];

function buildSingleCodeBundle() {
  const sections: string[] = [];
  const includedList: string[] = [];

  for (const relPath of filesToInclude) {
    const absPath = path.resolve(relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf-8');
    includedList.push(`${relPath} (${content.split('\n').length} lines)`);
    sections.push(
      [
        '================================================================================',
        `FILE: ${relPath}`,
        '================================================================================',
        content.trimEnd(),
        '',
      ].join('\n')
    );
  }

  const header = [
    '################################################################################',
    '# SMART CARD PLATFORM - COMPLETE UNIFIED SOURCE CODE (SINGLE COPYABLE FILE)',
    `# Total Files: ${includedList.length}`,
    `# Generated At: ${new Date().toISOString()}`,
    '# Live URL: https://smart-card-inky.vercel.app',
    '################################################################################',
    '#',
    '# TABLE OF CONTENTS:',
    ...includedList.map((entry, idx) => `#   ${String(idx + 1).padStart(2, '0')}. ${entry}`),
    '#',
    '################################################################################',
    '',
  ].join('\n');

  const finalOutput = `${header}\n${sections.join('\n')}`;

  fs.writeFileSync(path.resolve('SMART_CARD_FULL_CODE.txt'), finalOutput, 'utf-8');
  fs.writeFileSync(path.resolve('public/SMART_CARD_FULL_CODE.txt'), finalOutput, 'utf-8');
  console.log(`Generated SMART_CARD_FULL_CODE.txt (${includedList.length} files, ${(finalOutput.length / 1024).toFixed(1)} KB)`);
}

buildSingleCodeBundle();
