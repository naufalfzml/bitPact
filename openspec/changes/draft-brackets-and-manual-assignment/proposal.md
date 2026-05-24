## Why

Saat ini, pembuatan turnamen (*Create Tournament*) pada platform bitPatch mengharuskan Kreator menentukan mode permainan (*Game Mode*) sejak awal. Hal ini sangat membatasi kegunaan (*utility*) jika jumlah pendaftar di lapangan tidak sesuai dengan perkiraan awal (misal, merencanakan mode tim 2v2 namun jumlah pendaftar ganjil atau sedikit). 

Pembaruan ini memperluas nilai utilitas bitPatch secara drastis dengan memindahkan keputusan penentuan *Game Mode* ke saat pendaftaran ditutup. Saat pembuatan turnamen, Kreator hanya menentukan batas kuota maksimum peserta (*Max Participants*). Format pertandingan asli baru ditentukan secara dinamis setelah daftar pendaftar dikunci, memberikan fleksibilitas penuh untuk beradaptasi dengan turnout pendaftar.

## What Changes

Kami memperkenalkan alur penutupan registrasi dan penyusunan draf pertandingan yang dinamis bagi Kreator:

- **Pembuatan Turnamen Tanpa Batasan Mode Kaku:** Menghilangkan pemilihan *Game Mode* pada form inisialisasi turnamen, menggantikannya dengan input batas kuota maksimum peserta (**`max_participants`**). Pendaftaran berjalan secara bebas hingga kapasitas ini terpenuhi atau Kreator menutup pendaftaran secara manual.
- **Fase Penutupan Pendaftaran (Close Signups):** Penutupan pendaftaran menyetel status **`roster_locked = true`** pada turnamen, mengunci pendaftaran secara permanen tanpa langsung mengaktifkan turnamen (status tetap `'setup'`).
- **Fase Penentuan Mode Permainan Pasca-Kunci:** Setelah roster terkunci, konsol Kreator menampilkan pilihan **Game Mode** (seperti `1v1 PvP` atau `Team Mode`) yang disesuaikan dengan jumlah peserta aktual. Setelah dipilih, sistem men-generate draf bagan kosong.
- **Penyusunan Bagan Manual & Auto-Shuffle (Drafting):** Kreator dapat mengacak draf bagan secara otomatis (*auto-shuffle*) atau memilih pemain untuk setiap slot secara manual dari dropdown retro.
- **Finalisasi (Start Event):** Tombol khusus "■ START EVENT ■" mengunci susunan draf final di database dan secara resmi memulai turnamen (mengubah status menjadi `'active'`).

## Capabilities

### New Capabilities
- `draft-brackets-and-manual-assignment`: Kemampuan menyusun draf bagan turnamen secara otomatis maupun manual dengan dropdown pilihan peserta setelah pendaftaran ditutup (`roster_locked = true`) dan game mode dipilih secara dinamis.

### Modified Capabilities
- `dynamic-brackets-and-roster-upgrades`: Mengubah tombol lock roster menjadi tombol penutupan pendaftaran yang mengunci roster terlebih dahulu, disusul pemilihan game mode dinamis dan fase draf bagan.

## Impact

- **Database:**
  - Penambahan kolom `roster_locked` (Boolean, default `false`) pada tabel `events`.
  - Penambahan kolom `max_participants` (Integer, default `16`) pada tabel `events`.
- **Backend API:**
  - `POST /api/events` diubah agar menerima `max_participants` dan menyetel `game_mode: '1v1'` sebagai placeholder awal (untuk memenuhi constraint database).
  - `/api/events/:id/lock-roster` diubah menjadi pemicu murni untuk menyetel `roster_locked = true` dan menutup pendaftaran.
  - Penambahan endpoint baru `POST /api/events/:id/select-game-mode` untuk memperbarui format game_mode asli pilihan Kreator setelah roster dikunci dan menghasilkan draf bracket kosong.
  - Penambahan rute baru `POST /api/events/:id/draft-bracket` untuk menyimpan susunan draf bagan sementara yang sedang dirancang secara manual oleh Kreator.
  - `POST /api/events/:id/start` diubah untuk memvalidasi `roster_locked = true`, menyimpan susunan draf final, dan mengubah status event menjadi `'active'`.
- **Frontend UI:**
  - Form pembuatan turnamen (`frontend/src/app/events/create/page.tsx`) diperbarui untuk mengganti dropdown Game Mode dengan input kuota **Max Participants**.
  - Halaman detail event (`frontend/src/app/events/[id]/page.tsx`) diperbarui dengan konsol Kreator progresif:
    1. Fase 1: `Close Signups` (Menyetel `roster_locked = true`).
    2. Fase 2 (Baru terbuka setelah lock): Panel pemilihan Game Mode dinamis, disusul visualisasi draf bagan interaktif (Auto-Shuffle / Dropdowns manual).
    3. Fase 3: `Start Event` untuk mengaktifkan pertandingan.
