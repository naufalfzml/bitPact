## Why

Sepuluh temuan UX/UI/i18n yang berdiri sendiri tetapi sama-sama merusak
"polish" produk untuk demo hackathon dan untuk pengguna MiniPay nyata. Semua
dari [AUDIT.md](../../../AUDIT.md):

- **N8**: `.bp-rpg-status` (HP / USDC / CELO) di-`display: none` saat
  `≤720px` → MiniPay pengguna mobile pertama, info paling penting justru
  hilang.
- **N9**: Halaman `/leaderboard` ada, tetapi tak ada link di header nav.
  Per arahan user: **hapus** halaman & link sekalian (no global
  leaderboard). Endpoint backendnya dihapus terpisah di change
  `backend-correctness-cleanup`.
- **N10**: WalletConnect `projectId` hardcoded di
  [providers.tsx:12](../../../frontend/src/app/providers.tsx#L12).
- **N11**: `alert()` / `confirm()` native dipakai 20+ kali — UX jelek di
  mobile, keluar dari tema 8-bit.
- **N12**: Halaman vote tidak menampilkan vote saya (AGREE/REJECT) — tombol
  tetap aktif, baru tahu sudah vote setelah 409 dari backend.
- **N13**: Tombol "Distribute Prize" muncul di **dua tempat** (event detail
  + vote page) — duplikasi membingungkan.
- **N14**: Photo upload tanpa preview & validasi ukuran client-side.
- **N15**: Teks UI campur Bahasa Indonesia + English meskipun commit
  internasionalisasi sudah dijalankan.
- **N16**: env var `NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` masih bernama `CUSD`
  walau token sebenarnya USDC.
- **N19**: Logo header masih bertuliskan `_bP_` (punya huruf) — bertentangan
  dengan brand guideline "monogram pixel text-free".

## What Changes

### Mobile & navigation
- **N8 mobile RPG bar**: ubah CSS `.bp-rpg-status` di
  [globals.css:1292-1294](../../../frontend/src/app/globals.css#L1292-L1294) —
  jangan `display:none`. Pindah ke baris bawah di mobile (`flex-wrap` di
  `.bp-header-inner` + ukuran font dikecilkan).
- **N9 hapus leaderboard**: hapus folder
  `frontend/src/app/leaderboard/`, hapus link nav jika ada (saat ini tidak
  ada, tetap konfirmasi), dan hapus fetch ke `/leaderboard/reputation`
  (sudah di backend change).

### Configuration
- **N10 projectId via env**: baca
  `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` di
  [providers.tsx:12](../../../frontend/src/app/providers.tsx#L12); fallback
  ke placeholder lama untuk dev. Update `.env.example` / `.env`.
- **N16 rename env CUSD → USDC**: `NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` →
  `NEXT_PUBLIC_USDC_TOKEN_ADDRESS` di `frontend/.env`,
  `frontend/src/constants/index.ts`, dan dokumentasi.

### UX components
- **N11 toast 8-bit kustom**: komponen baru `BpToast` + `BpToastProvider`
  di `frontend/src/app/components/Toast.tsx` (custom, no external dep).
  Style match tema (border tebal, palette success/info/warning/destructive,
  blink subtle, auto-dismiss). Replace `alert()` (success / info) dan
  `confirm()` (destruksi → tetap pakai `confirm()` untuk safety atau buat
  modal pixel — pilih `confirm()` sementara karena mengubah confirm flow
  perlu UX testing lebih).
- **N12 my-vote state**: extend `GET /api/events/:id` (atau panggil
  endpoint baru ringan) untuk include `my_vote: "agree" | "reject" | null`
  bila query param `wallet=` diberikan. Frontend tampilkan banner "Anda
  sudah AGREE/REJECT" + disable tombol vote.
- **N13 dedup distribute button**: hapus tombol "Distribute Prize" dari
  event detail page (line 1325-1346); biarkan hanya di vote page (lebih
  contextual).
- **N14 photo preview**: di event detail page, render preview thumbnail
  saat `photoFile` di-set; tambah validasi `file.size > 5*1024*1024` →
  error; tambah `multer({ limits: { fileSize: 5 * 1024 * 1024 } })` di
  backend `POST /:id/photo` sebagai defense in depth.

### Branding
- **N19 logo glyph piksel**: ganti `_bP_` di header dengan SVG monogram
  pixel art (file: `frontend/src/app/components/LogoMark.tsx`). User akan
  pilih dari 2-3 draft (lihat tasks 8).

### Internationalisasi (full English)
- **N15 sapu bahasa**: ganti semua string Bahasa Indonesia di FE & error
  message backend ke English. Detail token-by-token di tasks 7.

## Capabilities

### New Capabilities
- `frontend-polish`: Frontend MUST menyediakan toast notifications custom
  8-bit untuk feedback success/info/warning/destructive (menggantikan
  `alert()`), MUST menampilkan vote saya saat halaman vote dibuka, MUST
  menampilkan preview foto sebelum upload, MUST menampilkan RPG status bar
  di semua viewport (termasuk mobile), dan MUST mengambil WalletConnect
  projectId dari env variable.

## Impact

- **Frontend**:
  - **Files baru**: `components/Toast.tsx`, `components/LogoMark.tsx`,
    optional helper `lib/toast.ts` (singleton).
  - **Files dihapus**: `app/leaderboard/page.tsx` (dan parent folder).
  - **Files diubah**: `providers.tsx`, `layout.tsx`, `events/create/page.tsx`,
    `events/[id]/page.tsx`, `events/[id]/vote/page.tsx`,
    `components/ConnectButtonClient.tsx`, `globals.css`, `constants/index.ts`,
    `.env`.
- **Backend**:
  - `routes/events.js`: ekspos `my_vote` di `GET /api/events/:id` ketika
    query `?wallet=0x...` diberikan; tambah `multer({ limits })` di photo
    upload; ubah string error ke English.
- **Tests**:
  - Tambah test smoke ringan untuk endpoint `GET /api/events/:id?wallet=`
    (mock supabase return votes → `my_vote` benar).
  - Test existing tetap hijau (88).
- **Docs**:
  - `frontend/.env.example` (bila ada — kalau belum, buat) menyertakan
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` dan
    `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`.
