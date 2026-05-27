## 1. N10 — WalletConnect projectId via env

- [ ] 1.1 Update [frontend/src/app/providers.tsx:12](../../../frontend/src/app/providers.tsx#L12)
      untuk membaca `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` dengan
      fallback hardcoded dev (+ console warn bila fallback).
- [ ] 1.2 Tambah `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=` ke `frontend/.env`
      (kosong / dev placeholder) dan dokumentasikan di README setup.

## 2. N16 — Rename env `CUSD` → `USDC`

- [ ] 2.1 Di [frontend/src/constants/index.ts:2](../../../frontend/src/constants/index.ts#L2):
      baca `NEXT_PUBLIC_USDC_TOKEN_ADDRESS` dulu, fallback ke
      `NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` dengan deprecation warning, fallback
      terakhir ke alamat Sepolia.
- [ ] 2.2 Update `frontend/.env`: tambah `NEXT_PUBLIC_USDC_TOKEN_ADDRESS=...`
      (set ke value yang sama dengan baris CUSD lama). Hapus baris CUSD setelah
      sync.

## 3. N8 — RPG status bar mobile

- [ ] 3.1 Di [frontend/src/app/globals.css:1292-1294](../../../frontend/src/app/globals.css#L1292-L1294)
      hapus rule `.bp-rpg-status { display: none; }`.
- [ ] 3.2 Tambah aturan layout responsive: di `≤720px`,
      `.bp-header-inner` flex-direction column, `.bp-rpg-status` jadi
      `order: 2; width: 100%; justify-content: space-between; font-size: 0.5rem;`.
- [ ] 3.3 Smoke check: buka di Chrome DevTools mobile preset → konfirmasi
      HP/USDC/CELO visible.

## 4. N11 — Toast komponen kustom

- [ ] 4.1 Buat `frontend/src/app/components/Toast.tsx`:
      - `ToastContext`, `ToastProvider`, helper `useToast()`.
      - Render fixed bottom-right (desktop) / bottom full-width (mobile).
      - Auto-dismiss 4s, manual dismiss via klik.
- [ ] 4.2 Tambah class `.bp-toast` + `.bp-toast-stack` + animasi keyframes di
      [globals.css](../../../frontend/src/app/globals.css).
- [ ] 4.3 Wrap `<Providers>` di [layout.tsx](../../../frontend/src/app/layout.tsx)
      dengan `<ToastProvider>` (inner-most agar bisa dipakai di semua page).
- [ ] 4.4 Replace `alert()` di [events/[id]/page.tsx](../../../frontend/src/app/events/[id]/page.tsx):
      semua positive (REGISTRATION SUCCESSFUL, alert sukses lain) → `toast.success`;
      error → `toast.error`. Pertahankan `confirm()` untuk destruktif sementara.
- [ ] 4.5 Replace `alert()` di [events/[id]/vote/page.tsx](../../../frontend/src/app/events/[id]/vote/page.tsx).
- [ ] 4.6 Replace `alert()` di [events/create/page.tsx](../../../frontend/src/app/events/create/page.tsx).

## 5. N12 — My-vote di vote page

- [ ] 5.1 Backend [GET /api/events/:id](../../../backend/routes/events.js#L150):
      bila query `?wallet=0x...` ada, fetch vote untuk voter tersebut →
      tambah `my_vote: "agree" | "reject" | null` di response.
- [ ] 5.2 Tambah test unit / smoke: dengan `?wallet=` & vote exist → field
      sesuai; tanpa query → field null.
- [ ] 5.3 Frontend vote page: fetch dengan `${API_BASE_URL}/events/${id}?wallet=${address}`.
- [ ] 5.4 Tampilkan banner "You voted AGREE/REJECT" + disable tombol vote bila
      `event.my_vote !== null`.

## 6. N13 — Dedup distribute button

- [ ] 6.1 Hapus blok "Distribute Prize" creator panel di event detail page
      ([page.tsx:1297-1348](../../../frontend/src/app/events/[id]/page.tsx#L1297-L1348)).
      Pertahankan tombol di [vote/page.tsx:218-247](../../../frontend/src/app/events/[id]/vote/page.tsx#L218-L247).
- [ ] 6.2 Di creator panel voting state, ganti dengan teks "Distribute via
      Voting Console" + tombol navigate ke vote page.

## 7. N14 — Photo preview + size limit

- [ ] 7.1 Frontend: di handler upload, validasi `photoFile.size > 5MB` → toast.error.
- [ ] 7.2 Frontend: render `<img src={URL.createObjectURL(photoFile)}>` di bawah
      input file ketika `photoFile` ada.
- [ ] 7.3 Backend: update multer config di
      [events.js:1022](../../../backend/routes/events.js#L1022):
      ```js
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) =>
          file.mimetype.startsWith("image/")
            ? cb(null, true)
            : cb(new Error("Only image uploads are allowed")),
      });
      ```
- [ ] 7.4 Backend: tambah handler error multer (`MulterError`) → respons 400 dengan
      pesan jelas.

## 8. N19 — Logo glyph SVG

- [ ] 8.1 Draft 3 opsi SVG (Bracket Tree, Vault Block, Coin Stack) sebagai
      komponen sketch dan tampilkan inline di PR description / komentar
      task ini. Tunggu user pilih.
- [ ] 8.2 Setelah dipilih: buat `frontend/src/app/components/LogoMark.tsx`
      yang men-render SVG terpilih (size prop `sm` / `md` / `lg`).
- [ ] 8.3 Ganti `<span>_bP_</span>` di [layout.tsx:25-27](../../../frontend/src/app/layout.tsx#L25-L27)
      dengan `<LogoMark size="md" />`. Hapus `.bp-logo-mark` span yang
      mengapit (`■` boleh tetap, atau dihapus jika SVG sudah cukup).

## 9. N15 — Sapu bahasa English

- [ ] 9.1 Frontend `events/[id]/page.tsx`: ganti semua string Indonesia listed
      di Design D9 ke English (line 659, 666, 678, 716, 727, 902, 1110, dst).
- [ ] 9.2 Frontend `events/create/page.tsx`: scan untuk string Indonesia
      tersisa.
- [ ] 9.3 Backend `routes/events.js`: ganti semua pesan error response
      Indonesia ke English (line 237, 247, 252, 261, 555, 607, 848, dst).
- [ ] 9.4 Run `grep -nE "(Pendaftaran|Anda|Kreator|tidak|Skor|HP)" backend/routes frontend/src` —
      pastikan list kosong (atau hanya yang memang Indonesian by design,
      mis. log debugging).

## 10. N9 — Hapus halaman leaderboard

- [ ] 10.1 Hapus folder [frontend/src/app/leaderboard/](../../../frontend/src/app/leaderboard/).
- [ ] 10.2 Cek [layout.tsx](../../../frontend/src/app/layout.tsx) — jika
      sebelumnya ditambahkan link `/leaderboard`, hapus. (Saat ini belum ada,
      tetap verifikasi.)
- [ ] 10.3 Pastikan tidak ada import / link tersisa ke `/leaderboard`.

## 11. Verifikasi total

- [ ] 11.1 `cd frontend && npm run build` — sukses tanpa type error.
- [ ] 11.2 `cd backend && npm test` — 88 test atau revisi sesuai (5.2 menambah).
- [ ] 11.3 `cd contracts && forge test` — 25 test hijau (atau 27 setelah change 2).
- [ ] 11.4 Demo flow manual di mobile viewport: connect → create → register
      → start → vote → distribute. Konfirmasi:
      - RPG bar visible mobile.
      - Toast muncul tepat di tiap aksi.
      - Vote page menampilkan "you voted X" banner.
      - Photo preview ada.
      - Tidak ada teks Indonesia.
      - Logo glyph terlihat sesuai pilihan user.

## 12. Commit plan (per logical unit)

- [ ] 12.1 `chore(frontend): wire WalletConnect projectId via env var` (task 1)
- [ ] 12.2 `chore(frontend): rename CUSD env var to USDC with backward fallback` (task 2)
- [ ] 12.3 `fix(frontend): show RPG status bar on mobile (MiniPay)` (task 3)
- [ ] 12.4 `feat(frontend): add 8-bit toast component and provider` (task 4.1-4.3)
- [ ] 12.5 `refactor(frontend): replace alert() with toast across pages` (task 4.4-4.6)
- [ ] 12.6 `feat(backend): expose my_vote in event detail when wallet query passed` (task 5.1-5.2)
- [ ] 12.7 `feat(frontend): show voter's own vote on vote page` (task 5.3-5.4)
- [ ] 12.8 `refactor(frontend): keep distribute prize button only on vote page` (task 6)
- [ ] 12.9 `feat(frontend+backend): photo upload preview and size validation` (task 7)
- [ ] 12.10 `feat(frontend): replace _bP_ wordmark with pixel logo glyph` (task 8)
- [ ] 12.11 `chore: unify user-facing strings to English` (task 9)
- [ ] 12.12 `chore(frontend): remove unused leaderboard page` (task 10)
