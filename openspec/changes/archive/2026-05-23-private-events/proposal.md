## Why

Platform bitPact saat ini hanya mendukung turnamen publik yang terbuka untuk siapa saja. Untuk kasus penggunaan turnamen antar-komunitas, pertandingan persahabatan tertutup, atau kompetisi korporat eksklusif, dibutuhkan mekanisme kontrol akses yang membatasi siapa saja yang dapat mendaftar. Selain itu, kreator turnamen saat ini diperbolehkan ikut bertanding di turnamen yang ia buat sendiri, menciptakan potensi konflik kepentingan karena kreator juga bertindak sebagai juri yang menentukan pemenang dan distribusi dana hadiah (cUSD).

## What Changes

- Menambahkan tiga tipe aksesibilitas turnamen: **Public**, **Private (Password)**, dan **Private (Invite-Only)**.
- Turnamen bertipe **Password** memungkinkan kreator menetapkan kode rahasia yang harus dimasukkan peserta sebelum mendaftar. Validasi dilakukan di sisi backend untuk menghindari kebocoran password di mempool blockchain publik.
- Turnamen bertipe **Invite-Only** memungkinkan kreator menentukan daftar peserta yang diizinkan (whitelist) menggunakan alamat dompet atau integrasi Social Connect (email/telepon).
- **BREAKING**: Kreator turnamen dilarang mendaftar sebagai peserta pada turnamen yang ia buat sendiri. Tombol pendaftaran akan dinonaktifkan secara total bagi dompet kreator, dengan pesan "Penyelenggara/Juri Tidak Dapat Berpartisipasi".
- Menambahkan kolom `access_type` dan `password_hash` pada tabel database `events`.
- Memperbarui alur pendaftaran backend untuk memvalidasi akses sebelum meneruskan transaksi on-chain.

## Capabilities

### New Capabilities
- `event-access-control`: Mekanisme kontrol akses turnamen (public, password-protected, invite-only) mencakup validasi backend, penyimpanan konfigurasi akses di database, dan integrasi UI formulir akses di frontend.
- `creator-restriction`: Pembatasan keikutsertaan kreator sebagai peserta turnamen yang ia buat, mencakup validasi di frontend (nonaktifkan tombol register) dan backend (tolak pendaftaran kreator).

### Modified Capabilities
_(Tidak ada perubahan pada spesifikasi kapabilitas yang sudah ada)_

## Impact

- **Database (Supabase)**: Migrasi skema tabel `events` — menambahkan kolom `access_type` (enum: `public`, `password`, `invite_only`) dan `password_hash` (nullable text). Menambahkan tabel `event_whitelist` untuk menyimpan daftar dompet yang diizinkan pada turnamen invite-only.
- **Backend API**: Endpoint `POST /api/events` diperbarui untuk menerima konfigurasi akses. Endpoint `POST /api/events/:id/register` diperbarui untuk memvalidasi password atau status whitelist sebelum meneruskan pendaftaran.
- **Frontend (Next.js)**: Halaman pembuatan event (`/events/create`) menambahkan formulir input tipe akses. Halaman detail event (`/events/[id]`) menambahkan formulir input password retro dan menonaktifkan tombol register bagi kreator.
- **Smart Contract**: Tidak ada perubahan pada `BitPatchVault.sol` — validasi akses dilakukan sepenuhnya di layer backend/database sebelum mengeksekusi transaksi on-chain.
