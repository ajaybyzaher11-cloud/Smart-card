---
name: smart-card-sync-deploy
description: Mandatory post-edit workflow for the Smart Card platform. Automatically propagates every change across all generated QR codes (web views, API redirect, admin modals, and Dart Admin mobile app), rebuilds SMART_CARD_FULL_CODE.txt, verifies build & TypeScript lint, and pushes to GitHub (main) to trigger Vercel production deployment.
---

# Smart Card — Sync Generated QR Codes & Deploy (GitHub + Vercel)

Activate and follow this skill on **every** modification request in the Smart Card workspace before reporting completion to the user.

## 1. Propagate Changes Across All Generated QR Codes & Clients

All generated QR codes (`/q/:id` and `/?view=:id`) read live state from Firestore (`ai-studio-41f04a06-1999-41b9-b7be-e25b21dc1fd0`) and render dynamically through the platform components. Keep every layer synchronized:

1. **Live Generated QR Code Views (Applies to all existing & future QR codes):**
   - `src/views/SmartRedirectView.tsx`: Customer-facing card views (Multi-wallet, Single-wallet, Bank, InstaPay, Quick Pay links, Social links, and deactivation/expiration fallbacks).
   - `src/views/CustomerActivationView.tsx`: First-time card activation form and validation rules.
   - `src/lib/deepLinks.ts` & `src/lib/qrService.ts` & `src/types/qr.ts`: Wallet/provider auto-detection, deep links, QR payload schema, and deactivation/print helpers.
2. **Server & Vercel Serverless Redirect:**
   - `api/redirect.ts`: Vercel production rewrite target for `/q/:id` (must stay in sync with `server.ts` redirect logic).
   - `server.ts`: Express server endpoints & dev/full-stack QR handling.
3. **Admin Dashboard & Modals (Web):**
   - `src/views/AdminDashboardView.tsx`, `src/components/EditQrModal.tsx`, `src/components/BulkGenerateModal.tsx`, `src/components/PrintSheetModal.tsx`, `src/components/QrScannerModal.tsx`.
4. **Dart / Flutter Admin-Only Mobile App (`smart_card_admin_dart/`):**
   - Keep `lib/models/qr_models.dart`, `lib/services/firestore_service.dart`, `lib/utils/deep_links.dart`, and `lib/screens/*` synchronized with all Admin capabilities, schema fields, and labels.
5. **Firestore & Rules (when schema/permissions change):**
   - Always read `/skills/system_skills/firebase-integration-rpc/SKILL.md` first and deploy updated `firestore.rules` if modified.

## 2. Rebuild Unified Code Bundle

Regenerate the complete copyable bundle so it reflects the latest workspace files:

```bash
npx tsx scripts/build-single-code.ts
```

This updates both `SMART_CARD_FULL_CODE.txt` and `public/SMART_CARD_FULL_CODE.txt`.

## 3. Build & Lint Verification

1. Co-execute `compile_applet` (`npm run build`) and `lint_applet` (`tsc --noEmit`) and resolve any errors until both pass with exit code `0`.
2. Confirm local dev server health (`http://localhost:3000` returns HTTP `200`).

## 4. Push to GitHub (`main`) & Trigger Vercel Deployment

- **Repository:** `https://github.com/ajaybyzaher11-cloud/Smart-card.git`
- **Branch:** `main`
- **Live Vercel URL:** `https://smart-card-inky.vercel.app` (auto-deploys on every push to `main`)

### Safe Sync Steps:
1. Clone shallowly into `/tmp/repo_sync` (`git clone --depth 1 --branch main ... /tmp/repo_sync`) using the session GitHub credential (never store plaintext PAT tokens inside repository files).
2. Copy tracked workspace files while **strictly excluding** `.git`, `node_modules`, `dist`, `data`, `.env`, and `public/assets/`:
   ```bash
   tar --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='data' --exclude='.env' --exclude='public/assets' -cf - . | tar -xf - -C /tmp/repo_sync
   ```
3. Inspect `git -c safe.directory=/tmp/repo_sync -C /tmp/repo_sync status -s` to ensure only intended source files are modified and no secrets or runtime data files are staged.
4. Commit and push to `origin main`, then immediately delete `/tmp/repo_sync`:
   ```bash
   rm -rf /tmp/repo_sync
   ```
5. Confirm commit hash in the user summary (in Arabic).
