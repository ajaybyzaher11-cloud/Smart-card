// @ts-ignore
import ArabicReshaper from 'arabic-persian-reshaper';
import bidiFactory from 'bidi-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const bidi = bidiFactory();

function formatArabic(text: string): string {
  if (!text) return '';
  if (/[\u0600-\u06FF]/.test(text)) {
    try {
      const reshaped = ArabicReshaper.ArabicShaper.convertArabic(text);
      const levels = bidi.getEmbeddingLevels(reshaped);
      return bidi.getReorderedString(reshaped, levels);
    } catch {
      return text;
    }
  }
  return text;
}

const cairoFontPath = path.resolve('public/fonts/Cairo.ttf');

// 1. GENERATE PROFESSIONAL DOCUMENTATION & UPDATES PDF
async function generateDocPdf() {
  const outputPath = path.resolve('public/Smart_Card_Documentation_and_Updates.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
    info: {
      Title: 'Smart Card - Documentation & Updates Report',
      Author: 'Smart Card Engineering Team',
      Subject: 'Official Documentation and Project Updates Changelog',
      Keywords: 'Smart Card, QR, NFC, Vercel, Documentation, Changelog'
    }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  if (fs.existsSync(cairoFontPath)) {
    doc.registerFont('Cairo', cairoFontPath);
  }

  const setArabic = () => {
    if (fs.existsSync(cairoFontPath)) {
      doc.font('Cairo');
    } else {
      doc.font('Helvetica');
    }
  };

  // Header Banner
  doc.rect(0, 0, doc.page.width, 105).fill('#0f172a'); // Dark navy
  doc.rect(0, 102, doc.page.width, 3).fill('#eab308'); // Gold accent line

  doc.fillColor('#fbbf24').fontSize(24).font('Helvetica-Bold')
     .text('Smart Card', 40, 24);
  doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica')
     .text('Next-Generation Dynamic NFC & Smart QR Platform', 40, 52);
  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
     .text('Live Domain: https://smart-card-inky.vercel.app  |  GitHub: ajaybyzaher11-cloud/Smart-card', 40, 72);

  doc.y = 125;

  // Executive Overview Box
  doc.roundedRect(40, doc.y, doc.page.width - 80, 80, 8).fillAndStroke('#f8fafc', '#e2e8f0');
  const ovY = doc.y;
  doc.fillColor('#b45309').fontSize(12).font('Helvetica-Bold')
     .text('EXECUTIVE PROJECT OVERVIEW', 55, ovY + 12);
  
  setArabic();
  doc.fillColor('#1e293b').fontSize(10);
  doc.text(
    formatArabic('منصة Smart Card هي نظام رقمي فائق التطور لإدارة وتوجيه البطاقات الذكية ورموز QR الديناميكية المشفرة. تتيح للمستخدمين التوجيه المباشر والآني لمختلف المنصات والتطبيقات الذكية (واتساب، إنستاباي، الاتصال المباشر، الحسابات البنكية، والمحافظ الإلكترونية) بأعلى درجات السرية والأمان.'),
    55,
    ovY + 30,
    { width: doc.page.width - 110, align: 'right', lineGap: 3 }
  );

  doc.y = ovY + 95;

  // Section 1: Complete Changelog
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
     .text('1. COMPLETE CHANGELOG & UPDATES', 40, doc.y);
  setArabic();
  doc.fillColor('#b45309').fontSize(10)
     .text(formatArabic('سجل التحديثات والتعديلات المنفذة على المنصة'), 40, doc.y + 2, { align: 'right' });
  doc.y += 18;

  const changelog = [
    {
      num: '01',
      titleEn: 'Admin Dashboard Null-Safety Fix',
      titleAr: 'إصلاح خطأ TypeError وقراءة خصائص غير معرّفة في لوحة الإدارة',
      details: 'Fixed "Cannot read properties of undefined (reading toLowerCase)" by implementing defensive guards across search, filtering, and undefined card records in AdminDashboardView.tsx.'
    },
    {
      num: '02',
      titleEn: 'Brand Unification Strictly to "Smart Card"',
      titleAr: 'توحيد الاسم التجاري بالكامل إلى Smart Card وحذف الترجمات البديلة',
      details: 'Replaced "luxury smart card gatway" and Arabic name variations throughout the site (HTML head, OpenGraph, headers, modals, cards, and footers) strictly with "Smart Card".'
    },
    {
      num: '03',
      titleEn: 'Production Deployment & Live Vercel Linking',
      titleAr: 'ربط وتوجيه كافة الرموز والروابط بنطاق Vercel المباشر (smart-card-inky.vercel.app)',
      details: 'Integrated GitHub repository (ajaybyzaher11-cloud/Smart-card) and deployed to Vercel live domain (https://smart-card-inky.vercel.app). All QR codes and scanner links now generate production URLs.'
    },
    {
      num: '04',
      titleEn: 'Admin Auth Hardening & SHA-256 Encryption',
      titleAr: 'إخفاء التعبئة السريعة، ضبط كلمة المرور الافتراضية admin1234، وتشفير SHA-256',
      details: 'Removed plain-text password helpers and quick-fill buttons from the UI. Configured default password to "admin1234", client-side SHA-256 hashing, and in-dashboard password updates.'
    },
    {
      num: '05',
      titleEn: 'Admin Login Footer Label: Safe & Protected',
      titleAr: 'تعديل نص التذييل في شاشة تسجيل الدخول إلى "آمنة ومحمية"',
      details: 'Updated the footer badge in AdminLoginView.tsx strictly to "آمنة ومحمية" with golden lock icon, matching exact user specification.'
    },
    {
      num: '06',
      titleEn: 'Comprehensive PDF Reports Generation & Direct Downloads',
      titleAr: 'توليد ملفات PDF كاملة لتوثيق المنصة وكود المشروع البرمجي الشامل',
      details: 'Built automated PDF export pipelines generating high-resolution downloadable documentation and complete codebase archives accessible directly.'
    },
    {
      num: '07',
      titleEn: 'Security Hardening & High-Contrast Card Search',
      titleAr: 'معالجة الثغرات الخمس بالكامل وتحسين تباين خانة بحث الكروت',
      details: 'Implemented server-side requireAdminAuth middleware, express-rate-limit, old password verification, strict URL scheme validation, and redesigned manual card ID search with high-contrast amber styling.'
    },
    {
      num: '08',
      titleEn: 'Universal Database Password Sync & Complete Credentials Superseding',
      titleAr: 'تحديث ومزامنة كلمة مرور الأدمن عبر قاعدة البيانات السحابية بالكامل',
      details: 'Configured seamless real-time password updates from the admin dashboard directly into Cloud Firestore (settings/auth and platform_settings/auth) and server filesystem (data/auth.json). Once changed, the new password immediately supersedes all previous credentials across all devices and sessions.'
    },
    {
      num: '09',
      titleEn: 'Admin Platform Switcher Auto-Clear & Instant Input Focus',
      titleAr: 'تفريغ تلقائي فوري لبيانات المنصة القديمة عند تغيير المنصة في لوحة الأدمن',
      details: 'Implemented handleSelectPlatform in EditQrModal to automatically purge and clear old URLs, phone numbers, and bank details when switching target platforms, dynamically updating labels and placeholders with direct clear shortcuts.'
    }
  ];

  for (const item of changelog) {
    if (doc.y > 690) {
      doc.addPage();
      doc.y = 45;
    }

    const cY = doc.y;
    doc.roundedRect(40, cY, doc.page.width - 80, 68, 6).fillAndStroke('#ffffff', '#e2e8f0');

    // Number circle badge
    doc.roundedRect(48, cY + 10, 24, 24, 4).fill('#0f172a');
    doc.fillColor('#fbbf24').fontSize(10).font('Helvetica-Bold')
       .text(item.num, 48, cY + 16, { width: 24, align: 'center' });

    doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold')
       .text(item.titleEn, 80, cY + 10);

    setArabic();
    doc.fillColor('#64748b').fontSize(9)
       .text(formatArabic(item.titleAr), doc.page.width - 50 - 270, cY + 11, { width: 270, align: 'right' });

    doc.font('Helvetica').fillColor('#334155').fontSize(8.5)
       .text(item.details, 80, cY + 30, { width: doc.page.width - 130, lineGap: 2 });

    doc.y = cY + 75;
  }

  // Section 2: Technical Architecture
  if (doc.y > 600) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.y += 12;
  }

  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
     .text('2. TECHNICAL ARCHITECTURE & INFRASTRUCTURE', 40, doc.y);
  setArabic();
  doc.fillColor('#b45309').fontSize(10)
     .text(formatArabic('البنية التقنية والتكنولوجية للمنصة'), 40, doc.y + 2, { align: 'right' });
  doc.y += 18;

  const stack = [
    ['Frontend Core', 'React 19 (Hooks, Functional Components, Strict Mode), TypeScript 7'],
    ['Styling & UI', 'Tailwind CSS 4 (@tailwindcss/vite), Lucide React Icons, 3D CSS transforms'],
    ['Build System', 'Vite 8 SPA bundler with zero-latency HMR & production tree-shaking'],
    ['Production Hosting', 'Vercel (https://smart-card-inky.vercel.app) with automatic Git deployments'],
    ['Backend & API', 'Express.js dev proxy + Vercel serverless functions (/api/redirect.ts)'],
    ['Security Standard', 'Client-side SHA-256 Web Crypto hashing, sanitized nanoid keys, CORS protection'],
    ['Deep Linking', 'Auto-routing engine for WhatsApp (wa.me), InstaPay (ipn.eg), Phone, Bank cards']
  ];

  for (const [layer, tech] of stack) {
    if (doc.y > 720) {
      doc.addPage();
      doc.y = 45;
    }
    const rY = doc.y;
    doc.roundedRect(40, rY, doc.page.width - 80, 22, 4).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#b45309').fontSize(9).font('Helvetica-Bold').text(layer, 50, rY + 6, { width: 140 });
    doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica').text(tech, 195, rY + 6, { width: doc.page.width - 245 });
    doc.y = rY + 26;
  }

  // Section 3: Admin & User Operation Flow
  if (doc.y > 600) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.y += 14;
  }

  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
     .text('3. OPERATIONAL GUIDE', 40, doc.y);
  setArabic();
  doc.fillColor('#b45309').fontSize(10)
     .text(formatArabic('دليل التشغيل والاستخدام للمدير والعملاء'), 40, doc.y + 2, { align: 'right' });
  doc.y += 16;

  const operations = [
    'Adding New Cards: Generate single or bulk QR cards (nanoid identifiers) with custom subscription durations.',
    'Customer Activation: Customers scanning an unconfigured card arrive directly at the branded activation screen.',
    'Instant Redirection: Configured active cards redirect with HTTP 302 directly to WhatsApp, InstaPay, or Web.',
    'Payment Copy Screen: Egyptian wallet numbers (010, 011, 012, 015) and Bank accounts render a luxury copy UI.',
    'Admin Security: Password updates are hashed via SHA-256 and persisted in local and cloud state instantly.'
  ];

  for (const op of operations) {
    const oY = doc.y;
    doc.fillColor('#eab308').fontSize(10).font('Helvetica-Bold').text('•', 45, oY);
    doc.fillColor('#334155').fontSize(9).font('Helvetica').text(op, 58, oY, { width: doc.page.width - 100, lineGap: 2 });
    doc.y += 18;
  }

  // Add Page Numbers & Footers without triggering auto page break
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.rect(40, doc.page.height - 30, doc.page.width - 80, 0.5).fill('#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('Smart Card Platform  |  Official Documentation  |  Confidential & Protected', 40, doc.page.height - 20, { lineBreak: false });
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text(`Page ${i + 1} of ${totalPages}`, 40, doc.page.height - 20, { width: doc.page.width - 80, align: 'right', lineBreak: false });
  }

  doc.end();
  return new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// 2. GENERATE COMPLETE CODEBASE PDF (CLEAN, DARK-THEME, HIGH-CONTRAST)
async function generateCodebasePdf() {
  const outputPath = path.resolve('public/Smart_Card_Full_Source_Code.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margin: 35,
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: 'Smart Card - Complete Source Code Archive',
      Author: 'Smart Card Engineering Team',
      Subject: 'Complete Source Code of the Smart Card Application'
    }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const filesToInclude = [
    'index.html',
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'vercel.json',
    'server.ts',
    'metadata.json',
    'api/redirect.ts',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/types/qr.ts',
    'src/types/jsqr.d.ts',
    'src/lib/auth.ts',
    'src/lib/deepLinks.ts',
    'src/lib/qrService.ts',
    'src/lib/firebase.ts',
    'src/views/AdminLoginView.tsx',
    'src/views/AdminDashboardView.tsx',
    'src/views/HomeLandingView.tsx',
    'src/views/CustomerActivationView.tsx',
    'src/views/SmartRedirectView.tsx',
    'src/views/CardExpiredView.tsx',
    'src/components/BrandIcons.tsx',
    'src/components/BulkGenerateModal.tsx',
    'src/components/DeveloperSettingsModal.tsx',
    'src/components/EditQrModal.tsx',
    'src/components/PrintSheetModal.tsx',
    'src/components/QrScannerModal.tsx',
    'src/components/UploadQrModal.tsx'
  ];

  // COVER PAGE
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#27272a');
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).stroke('#eab308');

  doc.fillColor('#fbbf24').fontSize(32).font('Helvetica-Bold')
     .text('SMART CARD', 0, 180, { align: 'center' });
  doc.fillColor('#f8fafc').fontSize(18).font('Helvetica')
     .text('Complete Source Code Archive', 0, 225, { align: 'center' });
  doc.fillColor('#94a3b8').fontSize(11).font('Helvetica')
     .text('Production Repository Compilation  |  Vercel Live Edition', 0, 255, { align: 'center' });

  doc.roundedRect(80, 310, doc.page.width - 160, 190, 8).fillAndStroke('#131317', '#3f3f46');
  doc.fillColor('#facc15').fontSize(12).font('Helvetica-Bold')
     .text('ARCHIVE METADATA', 100, 328);

  const metaItems = [
    ['Platform Name:', 'Smart Card'],
    ['Live Domain:', 'https://smart-card-inky.vercel.app'],
    ['GitHub Repository:', 'https://github.com/ajaybyzaher11-cloud/Smart-card.git'],
    ['Total Files Included:', `${filesToInclude.length} production source files`],
    ['Compiled On:', new Date().toUTCString()],
    ['Security Level:', 'Protected (Admin SHA-256 Auth & Nanoid Integrity)']
  ];

  let metaY = 352;
  for (const [k, v] of metaItems) {
    doc.fillColor('#a1a1aa').fontSize(9).font('Helvetica-Bold').text(k, 100, metaY);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica').text(v, 220, metaY, { width: 280 });
    metaY += 21;
  }

  doc.fillColor('#71717a').fontSize(8.5).font('Helvetica')
     .text('Generated for internal auditing, verification, and complete technical archiving.', 0, 720, { align: 'center' });

  // TABLE OF CONTENTS PAGE
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
  doc.rect(0, 0, doc.page.width, 50).fill('#121216');
  doc.fillColor('#fbbf24').fontSize(14).font('Helvetica-Bold')
     .text('TABLE OF CONTENTS - SOURCE FILES INDEX', 35, 18);

  let tocY = 70;
  let idx = 1;
  for (const file of filesToInclude) {
    const fullPath = path.resolve(file);
    let lineCount = 0;
    if (fs.existsSync(fullPath)) {
      lineCount = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
    }
    doc.roundedRect(35, tocY, doc.page.width - 70, 18, 3).fill(idx % 2 === 0 ? '#18181b' : '#121216');
    doc.fillColor('#fbbf24').fontSize(8.5).font('Helvetica-Bold').text(String(idx).padStart(2, '0'), 45, tocY + 4);
    doc.fillColor('#f1f5f9').fontSize(8.5).font('Helvetica').text(file, 70, tocY + 4);
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`${lineCount} lines`, doc.page.width - 110, tocY + 4, { align: 'right' });
    tocY += 21;
    idx++;
  }

  // CODE RENDERING
  const lineHeight = 10;
  const maxLinesPerPage = 68;

  for (const file of filesToInclude) {
    const fullPath = path.resolve(file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    let lineIdx = 0;
    let isFirstPageOfFile = true;

    while (lineIdx < lines.length) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');

      let curY = 30;

      if (isFirstPageOfFile) {
        doc.roundedRect(35, curY, doc.page.width - 70, 26, 4).fillAndStroke('#18181b', '#eab308');
        doc.fillColor('#fbbf24').fontSize(10).font('Helvetica-Bold')
           .text(`FILE: ${file}`, 45, curY + 7);
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
           .text(`${lines.length} lines  |  ${(content.length / 1024).toFixed(1)} KB`, doc.page.width - 150, curY + 8, { align: 'right' });
        curY += 34;
        isFirstPageOfFile = false;
      } else {
        doc.roundedRect(35, curY, doc.page.width - 70, 18, 3).fill('#18181b');
        doc.fillColor('#a1a1aa').fontSize(8).font('Helvetica-Bold')
           .text(`FILE (cont.): ${file}`, 45, curY + 5);
        curY += 24;
      }

      // Line number background gutter
      const gutterWidth = 32;
      const codeBlockHeight = maxLinesPerPage * lineHeight;
      doc.rect(35, curY, gutterWidth, Math.min(codeBlockHeight, (lines.length - lineIdx) * lineHeight + 4)).fill('#121216');
      doc.rect(35 + gutterWidth, curY, 0.5, Math.min(codeBlockHeight, (lines.length - lineIdx) * lineHeight + 4)).fill('#27272a');

      doc.font('Courier').fontSize(7.5);

      let linesOnThisPage = 0;
      while (lineIdx < lines.length && linesOnThisPage < maxLinesPerPage) {
        const lineNum = String(lineIdx + 1).padStart(4, ' ');
        const lineStr = lines[lineIdx].replace(/\t/g, '  ').substring(0, 105);

        doc.fillColor('#eab308').text(lineNum, 36, curY + 1, { width: 28, align: 'right', lineBreak: false });
        doc.fillColor('#e2e8f0').text(lineStr, 35 + gutterWidth + 6, curY + 1, { lineBreak: false });

        curY += lineHeight;
        lineIdx++;
        linesOnThisPage++;
      }
    }
  }

  // Footers
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 1; i < totalPages; i++) { // skip cover
    doc.switchToPage(i);
    doc.rect(35, doc.page.height - 24, doc.page.width - 70, 0.5).fill('#27272a');
    doc.fillColor('#71717a').fontSize(7.5).font('Helvetica')
       .text('Smart Card - Full Source Code Archive', 35, doc.page.height - 18, { align: 'left' });
    doc.fillColor('#71717a').fontSize(7.5).font('Helvetica')
       .text(`Page ${i + 1} of ${totalPages}`, 35, doc.page.height - 18, { align: 'right' });
  }

  doc.end();
  return new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function main() {
  console.log('Generating Documentation PDF...');
  await generateDocPdf();
  console.log('Documentation PDF generated successfully!');

  console.log('Generating Codebase PDF...');
  await generateCodebasePdf();
  console.log('Codebase PDF generated successfully!');

  // Copy to artifacts directory
  const artifactDir = path.resolve('.aistudio/artifacts/brain/41f04a06-1999-41b9-b7be-e25b21dc1fd0');
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync('public/Smart_Card_Documentation_and_Updates.pdf', path.join(artifactDir, 'Smart_Card_Documentation_and_Updates.pdf'));
    fs.copyFileSync('public/Smart_Card_Full_Source_Code.pdf', path.join(artifactDir, 'Smart_Card_Full_Source_Code.pdf'));
    console.log('Copied both PDFs to artifact directory');
  }
}

main().catch((err) => {
  console.error('Error in main:', err);
  process.exit(1);
});
