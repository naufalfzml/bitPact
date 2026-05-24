## 1. Supabase Database Migration

- [ ] 1.1 Membuat berkas DDL SQL untuk menambahkan kolom `roster_locked` (Boolean, default `false`) pada tabel `events` di Supabase SQL Editor.

## 2. Implementasi Backend API

- [ ] 2.1 Memperbarui route `/api/events/:id/lock-roster` (atau membuat `/close-signups`) agar mengubah kolom `roster_locked = true` tanpa mengubah status event (tetap `setup`).
- [ ] 2.2 Membuat rute baru `/api/events/:id/draft-bracket` (POST) untuk menyimpan sementara susunan draf bracket di database tabel `brackets`.
- [ ] 2.3 Memperbarui rute `/api/events/:id/start` agar memvalidasi `roster_locked = true` terlebih dahulu, mengunci susunan bracket draf final, dan mengubah status event menjadi `active`.

## 3. Implementasi Antarmuka Frontend (Vibe & UX)

- [ ] 3.1 Mengubah panel Creator Control Console di halaman detail event (`frontend/src/app/events/[id]/page.tsx`) untuk mendukung alur progresif 3-fase: `setup` (open signups) $\rightarrow$ `setup & roster_locked = true` (drafting) $\rightarrow$ `active` (playing).
- [ ] 3.2 Mengganti tombol "LOCK ROSTER" dengan tombol "■ CLOSE SIGNUPS ■" yang menutup pendaftaran dan membuka fase draf.
- [ ] 3.3 Membuat antarmuka visual draf bagan pertandingan (Match 1, Match 2, dst.) yang berisi Dropdown Select retro interaktif untuk mengisi slot Pemain A dan Pemain B secara manual dari sisa peserta terdaftar.
- [ ] 3.4 Menghubungkan tombol "■ AUTO SHUFFLE ■" di fase draf agar secara otomatis mengacak seluruh peserta terdaftar ke dalam slot dropdown bagan.
- [ ] 3.5 Menghubungkan tombol "■ START EVENT ■" di fase draf agar mengirim susunan draf bagan final ke database backend dan mengaktifkan turnamen secara resmi.

## 4. Pengujian & Verifikasi (Verification)

- [ ] 4.1 Melakukan verifikasi bahwa ketika pendaftaran ditutup, formulir registrasi dan lock cUSD bagi peserta terkunci dan tidak bisa diakses.
- [ ] 4.2 Menguji proses pengacakan otomatis dan penyusunan manual via dropdown slot pemain terisi secara presisi.
- [ ] 4.3 Memastikan finalisasi draf bagan sukses menyimpan seluruh brackets Ronde 1 ke database dan mengaktifkan turnamen dengan sempurna.
