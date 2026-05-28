## Why

Beberapa bagian UX bitPact sudah tidak sesuai dengan arah produk dan ada satu
bug notifikasi yang mengganggu. bitPact kini **hanya untuk event privat**,
tetapi form Create Event masih menawarkan opsi "Public". Tombol & teks loading
masih memakai copy lama yang tidak akurat (mis. "Deploy Contract" padahal tidak
ada kontrak baru yang di-deploy). Notifikasi muncul **dobel** karena bug di
provider toast, dan tidak ada modal konfirmasi/error yang konsisten. Mode tim
(2v2) belum bisa disusun manual (hanya auto-random saat start), serta penamaan
tim **tidak konsisten** antara roster ("TEAM RED/BLUE") dan bracket ("TEAM-0/1").

## What Changes

- **Create Event — privat saja:** Hapus opsi access type **"Public"** dari form
  Create Event. Default access type menjadi `password`; opsi tersisa hanya
  `password` dan `invite_only`. **BREAKING** untuk pembuatan event publik baru
  (event publik lama yang sudah ada tetap bisa di-render demi backward-compat).
- **Copy tombol & loading yang akurat:** Ganti copy tombol submit Create Event
  dari "INITIALIZING_ON_CHAIN_CONTRACT..." / "■ Deploy Contract" menjadi copy
  yang akurat (membuat event TIDAK men-deploy kontrak — vault bersifat tunggal),
  mis. "CREATING TOURNAMENT..." / "■ Create Tournament". Rapikan teks loading
  detail event "LOADING_DASHBOARD_PANEL..." menjadi copy yang lebih bersih dan
  konsisten dengan halaman voting.
- **Modal popup + perbaikan toast dobel:** Tambah komponen **modal popup
  terpusat** yang reusable untuk konfirmasi & error. Toast pojok tetap dipakai
  untuk pesan sukses transien dan notifikasi tx hash. Perbaiki bug toast dobel
  di `Toast.tsx` (`push()` memanggil `setToasts` di dalam updater `setNextId`
  sehingga React StrictMode meng-invoke dua kali → dua toast).
- **Drafting tim manual atau otomatis:** Untuk mode tim (mis. 2v2), kreator bisa
  menetapkan tim **secara manual** (pilih tim tiap pemain) ATAU **acak otomatis**
  — meniru pola draft 1v1 (manual dropdown + auto-shuffle). Backend `/start`
  harus menghormati penetapan tim manual bila ada, dan fallback ke acak bila
  tidak.
- **Penamaan tim konsisten (1-based):** Roster dan bracket sama-sama memakai
  label **"Team 1"/"Team 2"** (dipetakan dari `team_id` 0/1 dan token bracket
  `team-0`/`team-1`).

## Capabilities

### New Capabilities
- `private-only-events`: Pembuatan event dibatasi hanya pada tipe akses privat
  (`password`, `invite_only`); tidak ada event publik baru yang bisa dibuat.
- `ui-notifications-and-modals`: Sistem notifikasi UI — modal popup terpusat untuk
  konfirmasi/error, toast pojok untuk sukses & tx hash, setiap notifikasi terpicu
  tepat satu kali, serta copy tombol/loading yang akurat dan konsisten.

### Modified Capabilities
- `dynamic-brackets-and-roster-upgrades`: Mode tim mendukung penetapan tim manual
  maupun acak otomatis (sebelumnya hanya acak saat start), dan penamaan tim
  diseragamkan menjadi "Team 1"/"Team 2" di roster maupun bracket.

## Impact

- **Frontend:**
  - `events/create/page.tsx`: hapus opsi/akses "Public", default `password`,
    perbaiki copy tombol submit.
  - `events/[id]/page.tsx`: copy loading, panel drafting tim manual/auto,
    label tim 1-based, migrasi konfirmasi/error ke modal.
  - `events/[id]/vote/page.tsx`: copy loading konsisten, migrasi error/konfirmasi
    distribusi ke modal.
  - `components/Toast.tsx`: perbaikan updater agar toast tidak dobel.
  - Komponen baru: modal popup reusable (mis. `components/Modal.tsx`).
- **Backend (`routes/events.js`):**
  - `/start`: hormati penetapan tim manual (mis. via `team_id` peserta yang sudah
    diset) sebelum jatuh ke acak.
  - Penyimpanan penetapan tim manual sebelum start (perluas alur `draft-bracket`
    atau endpoint penetapan tim baru).
- **Tidak berubah:** kontrak & logika settlement (perubahan claim ditangani di
  change terpisah `winner-claim-payout`).

## Non-Goals

- Perubahan kontrak / model payout (claim) — itu change terpisah.
- Menghapus rendering event publik lama yang sudah terlanjur dibuat.
- Tim lebih dari 2 (hanya 2 tim yang didukung saat ini).
