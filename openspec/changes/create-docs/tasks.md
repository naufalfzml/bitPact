## 1. Pembuatan Direktori dan Struktur Dasar Dokumentasi (Landing Page)

- [ ] 1.1 Membuat direktori `/docs` di root workspace jika belum ada.
- [ ] 1.2 Membuat berkas `/docs/README.md` sebagai landing page utama bitPatch.
- [ ] 1.3 Menulis penjelasan konsep, identitas visual 8-bit retro (tanpa panah/ikon), dan alur utama (core loop) di `/docs/README.md`.
- [ ] 1.4 Menyediakan indeks navigasi (directory guide) yang menautkan seluruh dokumen pendukung di `/docs/README.md`.

## 2. Dokumentasi Arsitektur Sistem Terintegrasi

- [ ] 2.1 Membuat berkas `/docs/ARCHITECTURE.md`.
- [ ] 2.2 Menulis diagram visual dan narasi batas-batas sistem (system boundaries) antara frontend, backend, database, dan blockchain.
- [ ] 2.3 Mendokumentasikan diagram alur sekuensial (sequencing diagram) untuk alur pembuatan event turnamen hingga klaim hadiah.
- [ ] 2.4 Menjelaskan transisi state utama pada turnamen (`setup` -> `active` -> `voting` -> `ended` / `disputed`).

## 3. Dokumentasi Referensi Smart Contract Celo

- [ ] 3.1 Membuat berkas `/docs/SMART-CONTRACT.md`.
- [ ] 3.2 Mendokumentasikan struktur data utama (seperti `EventInfo`) dan variabel state di dalam `BitPatchVault.sol`.
- [ ] 3.3 Menyusun dokumentasi lengkap untuk fungsi pendaftaran turnamen `register(bytes32 eventId)` beserta parameter dan validasinya.
- [ ] 3.4 Menyusun dokumentasi fungsi distribusi hadiah `distributePrize(bytes32 eventId, address[] memory winners, uint256[] memory shares)` lengkap dengan aturan kuorum.
- [ ] 3.5 Menyusun dokumentasi fungsi pengembalian dana darurat `emergencyRefund(bytes32 eventId)` beserta syarat pemicunya.
- [ ] 3.6 Menyusun daftar event emisi (seperti `EventCreated`, `PrizeDistributed`, `FundsRefunded`) beserta parameter index-nya.

## 4. Dokumentasi Skema Database PostgreSQL / Supabase

- [ ] 4.1 Membuat berkas `/docs/DATABASE.md`.
- [ ] 4.2 Mendokumentasikan skema lengkap tabel `events` beserta tipe data, default value, dan status state.
- [ ] 4.3 Mendokumentasikan skema lengkap tabel `participants` beserta relasi foreign key ke tabel `events`.
- [ ] 4.4 Mendokumentasikan skema lengkap tabel `votes` untuk melacak suara konsensus peserta.
- [ ] 4.5 Mendokumentasikan skema lengkap tabel `brackets` (untuk mode 1v1 dan Team) dan tabel `reputation_tracking` (untuk Minority Penalty).
- [ ] 4.6 Menyusun contoh script DDL SQL lengkap yang siap dieksekusi langsung di SQL editor Supabase.

## 5. Dokumentasi API Backend Express.js

- [ ] 5.1 Membuat berkas `/docs/API.md`.
- [ ] 5.2 Mendokumentasikan endpoint pembuatan turnamen `POST /api/events` beserta schema request JSON dan response.
- [ ] 5.3 Mendokumentasikan endpoint voting konsensus `POST /api/events/:id/vote` beserta aturan penanganan auto-abstain.
- [ ] 5.4 Mendokumentasikan endpoint input pemenang oleh creator `POST /api/events/:id/winners`.
- [ ] 5.5 Mendokumentasikan endpoint resolusi sengketa dan banding kedua `POST /api/events/:id/appeal`.
- [ ] 5.6 Menyusun spesifikasi standardisasi HTTP status codes dan format payload error yang seragam.

## 6. Dokumentasi Konfigurasi Mode Game & Algoritma Bagan

- [ ] 6.1 Membuat berkas `/docs/GAME-MODES.md`.
- [ ] 6.2 Menjelaskan spesifikasi teknis Solo PvP (1v1) termasuk validasi jumlah peserta 2^n dan algoritma single-elimination.
- [ ] 6.3 Menjelaskan spesifikasi teknis Team PvP (X vs X) termasuk opsi pendaftaran solo (random shuffle) vs tim utuh (registered).
- [ ] 6.4 Menjelaskan spesifikasi Free-For-All (FFA) leaderboard scoring dan antarmuka input juara manual oleh creator.

## 7. Dokumentasi Sistem Konsensus & Anti-Troll (Edge Cases)

- [ ] 7.1 Membuat berkas `/docs/CONSENSUS.md`.
- [ ] 7.2 Menjelaskan alur validasi voting konsensus peserta terhadap pilihan juri berdasarkan threshold yang ditentukan.
- [ ] 7.3 Mendokumentasikan mekanisme batas waktu tegas 24 jam dan eksekusi cron job auto-abstain.
- [ ] 7.4 Mendokumentasikan mekanisme penanganan situasi seimbang 50/50 (tie) menjadi status disputed beserta alur banding kedua.
- [ ] 7.5 Mendokumentasikan aturan pemotongan reputasi menggunakan sistem Minority Penalty bagi pelaku trolling yang berulang.

## 8. Panduan Setup Lingkungan Developer & Deployment

- [ ] 8.1 Membuat berkas `/docs/SETUP.md`.
- [ ] 8.2 Menyusun panduan instalasi dependencies lokal (Node.js LTS, Foundry/Anvil, Supabase CLI).
- [ ] 8.3 Menyusun daftar konfigurasi environment variable (.env) lengkap untuk frontend, backend, dan smart contract.
- [ ] 8.4 Menyusun langkah-langkah menjalankan platform secara lokal untuk pengujian end-to-end.
- [ ] 8.5 Menyusun panduan deployment ke Celo Alfajores testnet dan Supabase cloud dashboard.
