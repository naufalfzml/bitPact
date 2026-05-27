## 1. N10 — WalletConnect projectId via env

- [x] 1.1 Update [frontend/src/app/providers.tsx:12](../../../frontend/src/app/providers.tsx#L12)
      untuk membaca `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` dengan
      fallback hardcoded dev (+ console warn bila fallback).
- [x] 1.2 Tambah `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=` ke `frontend/.env`
      (kosong / dev placeholder) — `.env` gitignored, jadi cuma working tree.

## 2. N16 — Rename env `CUSD` → `USDC`

- [x] 2.1 Di [frontend/src/constants/index.ts:2](../../../frontend/src/constants/index.ts#L2):
      baca `NEXT_PUBLIC_USDC_TOKEN_ADDRESS` dulu, fallback ke
      `NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` dengan deprecation warning, fallback
      terakhir ke alamat Sepolia.
- [x] 2.2 Update `frontend/.env` lokal: tambah `NEXT_PUBLIC_USDC_TOKEN_ADDRESS=...`
      (gitignored).

## 3. N8 — RPG status bar mobile

- [x] 3.1 Di [frontend/src/app/globals.css:1292-1294](../../../frontend/src/app/globals.css#L1292-L1294)
      hapus rule `.bp-rpg-status { display: none; }`.
- [x] 3.2 Tambah aturan layout responsive: di `≤720px`, RPG status jadi
      wrapping flex row di bawah header brand.
- [ ] 3.3 Smoke check mobile preview (pending user manual after deploy).

## 4. N11 — Toast komponen kustom

- [x] 4.1 Buat `frontend/src/app/components/Toast.tsx`:
      ToastContext, ToastProvider, useToast(), auto-dismiss 4s, click to
      dismiss, fixed bottom-right (desktop) / bottom full-width (mobile).
- [x] 4.2 Tambah class `.bp-toast` + `.bp-toast-stack` + animasi keyframes di
      [globals.css](../../../frontend/src/app/globals.css).
- [x] 4.3 Wrap layout dengan `<ToastProvider>` (inner-most agar dipakai semua page).
- [x] 4.4 Replace `alert()` di [events/[id]/page.tsx](../../../frontend/src/app/events/[id]/page.tsx).
- [x] 4.5 Replace `alert()` di [events/[id]/vote/page.tsx](../../../frontend/src/app/events/[id]/vote/page.tsx).
- [x] 4.6 events/create/page.tsx tidak punya `alert()` (sudah pakai setError).

## 5. N12 — My-vote di vote page

- [x] 5.1 Backend `GET /api/events/:id` menerima `?wallet=0x...` dan
      mengembalikan `my_vote: "agree" | "reject" | null`. Helper
      `resolveMyVote` di-extract sebagai pure function.
- [x] 5.2 Unit test 7 case (canonical / case-insensitive / null wallet /
      malformed rows) di `backend/test/myVote.test.js`. Backend 76 test pass.
- [x] 5.3 Vote page fetch dengan `?wallet=${address.toLowerCase()}` + re-fetch
      on wallet change.
- [x] 5.4 Banner "YOU VOTED AGREE/REJECT" dirender saat `event.my_vote !== null`,
      menggantikan tombol vote.

## 6. N13 — Dedup distribute button

- [x] 6.1 Hapus blok "Distribute Prize" creator panel di event detail page.
- [x] 6.2 Ganti dengan tombol navigate ke vote page ("Open Voting Console to
      distribute").

## 7. N14 — Photo preview + size limit

- [x] 7.1 Frontend `handlePhotoFileChange` validasi mime + size 5MB. Bad
      files → toast.error.
- [x] 7.2 Render preview thumbnail (200×200, pixelated) + filename/size caption.
- [x] 7.3 Backend multer config: `limits.fileSize = 5MB`, fileFilter image only.
- [x] 7.4 Middleware wrap mengkonversi MulterError + filter error ke 400 JSON.

## 8. N19 — Logo glyph SVG

- [x] 8.1 Draft 3 opsi (Bracket Tree, Vault Block, Coin Stack) → user pilih
      **Bracket Tree**.
- [x] 8.2 Buat `frontend/src/app/components/LogoMark.tsx` — SVG monogram
      "two seeds → final cell", `shape-rendering="crispEdges"`,
      size prop sm/md/lg, palette via CSS custom props.
- [x] 8.3 Ganti `<span>_bP_</span>` di
      [layout.tsx:25-27](../../../frontend/src/app/layout.tsx#L25-L27)
      dengan `<LogoMark size="md" />`; logo Link kini aria-labeled.

## 9. N15 — Sapu bahasa English

- [x] 9.1 Frontend `events/[id]/page.tsx`: ~8 banner/label/placeholder
      strings di-translate.
- [x] 9.2 Frontend `events/create/page.tsx`: tidak ada string Indonesia tersisa.
- [x] 9.3 Backend `routes/events.js`: ~13 pesan error response di-translate.
- [x] 9.4 `backend/test/api.smoke.test.js` regex untuk start-bracket guard
      diperbarui sesuai wording baru. 76 test pass.

## 10. N9 — Hapus halaman leaderboard

- [x] 10.1 Hapus folder `frontend/src/app/leaderboard/`.
- [x] 10.2 Tidak ada link nav ke `/leaderboard` (sudah dicek; tidak ada).
- [x] 10.3 Tidak ada import / referensi tersisa.

## 11. Verifikasi total

- [x] 11.1 `cd frontend && npm run build` — sukses tanpa type error.
- [x] 11.2 `cd backend && npm test` — 76 test pass (63 existing pre-change +
      6 bracket + 7 my_vote).
- [x] 11.3 `cd contracts && forge test` — 27 test pass (tidak terdampak).
- [ ] 11.4 Demo flow manual di mobile viewport (pending user setelah Sepolia
      deploy): connect → create → register → start → vote → distribute.

## 12. Commit plan (per logical unit)

- [x] 12.1 `chore(frontend): wire WalletConnect projectId via env var` — `cb82247`
- [x] 12.2 `chore(frontend): rename CUSD env var to USDC with backward fallback` — `4106670`
- [x] 12.3 `fix(frontend): show RPG status bar on mobile (MiniPay)` — `a2f867a`
- [x] 12.4 `feat(frontend): add 8-bit toast component and provider` — `40c578e`
- [x] 12.5 `refactor(frontend): replace alert() with toast across pages` — `9125a13`
- [x] 12.6 `feat(backend): expose my_vote in event detail when wallet query passed` — `cded01e`
- [x] 12.7 `feat(frontend): show voter's own vote on vote page` — `39fb4b9`
- [x] 12.8 `refactor(frontend): keep distribute prize button only on vote page` — `1da692e`
- [x] 12.9 `feat: photo upload preview and 5MB size validation` — `5f58ae0`
- [x] 12.10 `feat(frontend): replace _bP_ wordmark with pixel logo glyph` — `6ad8cd0`
- [x] 12.11 `chore: unify user-facing strings to English` — `021fb51`
- [x] 12.12 `chore(frontend): remove unused leaderboard page` — `0dab22b`
