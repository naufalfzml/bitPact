## Context

bitPact memakai Next.js (App Router) di frontend dan Express + Supabase di
backend. Notifikasi UI dipusatkan di `frontend/src/app/components/Toast.tsx`
(`ToastProvider` + `useToast`). Mode tim saat ini hanya membagi peserta secara
acak di `POST /api/events/:id/start` (`routes/events.js`), tidak ada UI penetapan
tim manual. Penamaan tim tidak konsisten: roster memakai "TEAM RED/BLUE",
bracket memakai token `team-0`/`team-1` yang dirender "TEAM-0/1".

Change ini murni UX + backend ringan; **tidak menyentuh kontrak** maupun alur
settlement (claim dibahas di change `winner-claim-payout`).

## Goals / Non-Goals

**Goals:**
- Event hanya bisa dibuat sebagai privat (`password` / `invite_only`).
- Copy tombol & loading akurat dan konsisten.
- Modal popup reusable untuk konfirmasi/error; toast untuk sukses & tx hash.
- Toast terpicu tepat satu kali (perbaiki bug dobel).
- Mode tim bisa disusun manual atau acak; penamaan tim seragam "Team 1/Team 2".

**Non-Goals:**
- Perubahan kontrak / payout claim.
- Menghapus dukungan render event publik lama.
- Mendukung lebih dari 2 tim.

## Decisions

### D1: Access type privat-saja di Create Event
Hapus `<option value="public">` dari `events/create/page.tsx`; ubah default
`accessType` state dari `"public"` → `"password"`. Tipe union dipersempit ke
`"password" | "invite_only"`. Backend `POST /api/events` tetap menerima
`access_type` apa adanya (tidak perlu menolak "public" demi backward-compat data
lama), tetapi UI tidak lagi memproduksi "public".
- *Alternatif ditolak:* menolak "public" di backend → bisa memutus event lama.

### D2: Copy tombol & loading
- Tombol submit Create Event: `"■ Create Tournament"` (idle) /
  `"CREATING TOURNAMENT..."` (loading), menggantikan "Deploy Contract" /
  "INITIALIZING_ON_CHAIN_CONTRACT...".
- Loading detail event: ganti `LOADING_DASHBOARD_PANEL...` → copy konsisten
  (mis. `LOADING EVENT...`), selaras gaya dengan halaman voting.

### D3: Modal popup reusable
Tambah `frontend/src/app/components/Modal.tsx`: komponen modal terpusat
(overlay + panel) bergaya retro yang menerima `title`, `children`/`message`,
dan aksi (mis. `onConfirm`/`onClose`, label tombol). Dipakai untuk:
- Konfirmasi aksi penting (mis. distribusi/aksi destruktif).
- Menampilkan error yang sebelumnya inline / via toast error.

Toast tetap untuk: pesan sukses transien dan **tx hash** (pojok layar).
Pola pemakaian: state lokal `modal` (`{ title, body, onConfirm? }`) per halaman,
atau context provider sederhana bila perlu reuse luas. Pilih state lokal dulu
untuk menjaga perubahan minimal; naikkan ke provider hanya jika berulang.
- *Alternatif ditolak:* mengubah SEMUA toast menjadi modal → terlalu mengganggu;
  user ingin tx hash tetap berupa toast pojok.

### D4: Perbaikan toast dobel (root cause)
`push()` saat ini memanggil `setToasts(...)` **di dalam** updater `setNextId`.
Updater state di React harus murni; di StrictMode (dev) updater di-invoke dua
kali untuk deteksi impuritas → `setToasts` terpanggil dua kali → dua toast.
Perbaikan: pisahkan id-counter dari efek penambahan toast. Gunakan `useRef`
untuk counter id (`idRef.current++`) lalu panggil `setToasts` sekali di luar
updater murni. Hasil: satu `push` = satu toast, di dev maupun prod.
- *Alternatif:* `useReducer` dengan id di dalam reducer (juga murni) — setara;
  pilih `useRef` agar diff minimal.

### D5: Drafting tim manual / otomatis
Untuk mode `team`, tambahkan panel draft tim di konsol kreator (fase
`setup` + `roster_locked`, setelah game mode dipilih), meniru pola 1v1:
- **Manual:** tiap peserta punya dropdown pilih tim ("Team 1" / "Team 2").
  Disimpan sebagai `team_id` (0/1) lewat alur penyimpanan draft.
- **Auto random:** tombol acak yang membagi `team_id` seperti logika `/start`
  saat ini (shuffle, `ceil(N/2)` ke tim 0).

Backend `POST /api/events/:id/start` untuk mode tim: **hormati `team_id` yang
sudah diset** (manual). Hanya acak otomatis bila ada peserta yang `team_id`-nya
belum diset (null). Penyimpanan penetapan manual: perluas/`reuse` alur draft
(mis. endpoint `draft-bracket` atau endpoint kecil `assign-teams` yang
meng-update `team_id` peserta). Pilih: **endpoint khusus `assign-teams`** agar
tidak mencampur semantik bracket 1v1 dengan penetapan tim.
- *Alternatif ditolak:* selalu acak (perilaku lama) → tidak memenuhi permintaan.

### D6: Penamaan tim seragam "Team 1 / Team 2"
Sumber kebenaran tetap `team_id` 0/1 dan token bracket `team-0`/`team-1`.
Tambahkan helper render tunggal: `teamLabel(idOrToken)` → `team_id 0`/`team-0`
menjadi `"Team 1"`, `1`/`team-1` menjadi `"Team 2"` (1-based untuk tampilan).
Pakai helper ini di roster (`events/[id]/page.tsx`) dan bracket board, serta di
panel draft tim. Backend tidak berubah (tetap `team-0/1`, `team_id 0/1`).

## Risks / Trade-offs

- **Menghapus "Public"** → event publik lama tetap perlu render. Mitigasi: cabang
  registrasi publik di detail event TIDAK dihapus; hanya form Create yang
  dibatasi.
- **Endpoint `assign-teams` baru** → tambah permukaan API. Mitigasi: kecil,
  creator-only, validasi status `setup` + `roster_locked` + mode `team`.
- **Migrasi notifikasi ke modal** → risiko inkonsistensi bila sebagian terlewat.
  Mitigasi: cakup hanya konfirmasi/error penting; toast lain dibiarkan.
- **StrictMode fix** → pastikan tetap satu toast di prod (StrictMode hanya dev);
  perbaikan updater murni aman di keduanya.

## Migration Plan

1. Frontend copy + access type (low risk, isolated).
2. Toast dedupe fix + komponen Modal baru.
3. Migrasi konfirmasi/error penting ke Modal.
4. Backend `assign-teams` + ubah `/start` agar hormati `team_id` manual.
5. Frontend panel draft tim manual/auto + helper `teamLabel` di roster/bracket.
6. Verifikasi: `cd backend && npm test`, `cd frontend && npm run build`, uji manual.

Rollback: revert per-commit (tiap fitur commit terpisah); tidak ada perubahan
skema DB destruktif (hanya update `team_id` yang sudah ada).

## Open Questions

- Tidak ada — keputusan penamaan (Team 1/2), scope modal, dan privat-saja sudah
  dikonfirmasi.
