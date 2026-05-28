## 1. Supabase Database Migration

- [ ] 1.1 Membuat berkas DDL SQL `backend/migrations/002_add_roster_locked_and_max_participants.sql` untuk menambahkan kolom `roster_locked` (Boolean, default `false`) dan `max_participants` (Integer, default `16`) pada tabel `events`.
- [ ] 1.2 Menjalankan berkas DDL tersebut pada Supabase SQL Editor.

## 2. Implementasi Backend API

- [ ] 2.1 Memperbarui rute `POST /api/events` agar menerima `max_participants` dan menyetel default placeholder `game_mode: '1v1'` saat inisialisasi turnamen.
- [ ] 2.2 Memperbarui rute `POST /api/events/:id/lock-roster` agar HANYA mengubah kolom `roster_locked = true` tanpa mengubah status event (tetap `'setup'`) untuk menutup pendaftaran.
- [ ] 2.3 Membuat rute baru `POST /api/events/:id/select-game-mode` untuk memperbarui kolom `game_mode` asli pilihan Kreator (misal: `'1v1'` atau `'team'`) dan membuat draf bracket kosong awal di database `brackets`.
- [ ] 2.4 Membuat rute baru `POST /api/events/:id/draft-bracket` (POST) untuk menyimpan sementara susunan draf bracket yang dibuat Kreator di database tabel `brackets`.
- [ ] 2.5 Memperbarui rute `POST /api/events/:id/start` agar memvalidasi `roster_locked = true`, memvalidasi kelengkapan bagan draf final, dan secara resmi memulai turnamen dengan mengubah status turnamen menjadi `'active'`.

## 3. Implementasi Antarmuka Frontend (Vibe & UX)

- [ ] 3.1 Memperbarui halaman Pembuatan Turnamen (`frontend/src/app/events/create/page.tsx`) untuk menggantikan pilihan dropdown Game Mode dengan input kolom **MAX PARTICIPANTS** (retro number input/dropdown).
- [ ] 3.2 Memperbarui Halaman Detail Turnamen (`frontend/src/app/events/[id]/page.tsx`) untuk mendukung alur progresif 3-fase:
  - **Fase 1 (Pendaftaran Terbuka):** Menampilkan tombol **■ CLOSE SIGNUPS ■** bagi Kreator. Menghalangi pemain baru mendaftar jika `max_participants` telah tercapai.
  - **Fase 2 (Pendaftaran Ditutup & Drafting):**
    - Menampilkan panel pemilihan Game Mode dinamis bagi Kreator jika game mode belum difinalisasi pasca-kunci.
    - Menampilkan antarmuka visual draf bagan pertandingan (Match 1, Match 2, dst.) yang berisi dropdown select retro interaktif untuk mengisi slot Pemain A dan Pemain B secara manual dari sisa peserta terdaftar.
    - Elemen dropdown select retro tidak boleh memiliki simbol panah atau chevron (`<`, `>`, `▲`, `▼`, `→`, dll.) sesuai aturan visual bitPact.
    - Menghubungkan tombol **■ AUTO SHUFFLE ■** di fase draf untuk mengacak seluruh peserta secara acak ke dalam slot draf bagan di database dan memperbarui UI.
    - Menghubungkan tombol **■ START EVENT ■** di fase draf untuk memfinalisasi draf bagan dan memulai turnamen secara resmi.
  - **Fase 3 (Turnamen Aktif):** Menampilkan bagan pertandingan final yang terkunci dan panel manajemen seperti sebelumnya.
- [ ] 3.3 **Penyelesaian Item 4 (Manual Quorum Payout):** Menambahkan tombol **■ DISTRIBUTE PRIZE ■** pada panel konsol Kreator di halaman detail event ketika event berada pada fase voting (`status === 'voting'`) dan kuorum suara pemilih telah melebihi >51%.
- [ ] 3.4 **Penyelesaian Item 6 (Select Stage Filter):** Memperbarui halaman utama (`frontend/src/app/page.tsx`) dengan menambahkan kolom filter arcade retro **"SELECT STAGE"** (Search input + filter status tombol: All, Setup, Active, Ended) untuk mempermudah pencarian turnamen.

## 4. Pengujian & Verifikasi (Verification)

- [ ] 4.1 Memverifikasi pembatasan pendaftaran berfungsi secara otomatis saat jumlah peserta mencapai kuota `max_participants`.
- [ ] 4.2 Menguji alur penutupan registrasi dan memastikan `roster_locked` berubah menjadi `true` di database.
- [ ] 4.3 Menguji pemilihan Game Mode pasca-registrasi ditutup dan memastikan draf bagan kosong terbuat dengan benar.
- [ ] 4.4 Menguji pengacakan otomatis (*Auto Shuffle*) dan penyusunan manual via dropdown select retro berjalan mulus tanpa duplikasi pemain.
- [ ] 4.5 Memverifikasi tombol **■ START EVENT ■** berhasil mengunci bagan final dan mengubah status turnamen menjadi `active`.
- [ ] 4.6 Memverifikasi tombol manual **■ DISTRIBUTE PRIZE ■** muncul dan berfungsi dengan baik saat fase voting mencapai kuorum >51%.
- [ ] 4.7 Memverifikasi bar pencarian dan filter **"SELECT STAGE"** di beranda berfungsi menyortir turnamen secara presisi.
