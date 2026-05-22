## 1. Pembuatan Direktori dan Struktur Dasar Dokumentasi (Landing Page)

- [x] 1.1 Membuat direktori `/docs` di root workspace jika belum ada.
- [x] 1.2 Membuat berkas `/docs/README.md` sebagai landing page utama bitPatch.
- [x] 1.3 Menulis penjelasan konsep, identitas visual 8-bit retro (tanpa panah/ikon), dan alur utama (core loop) di `/docs/README.md`.
- [x] 1.4 Menyediakan indeks navigasi (directory guide) yang menautkan seluruh dokumen pendukung di `/docs/README.md`.

## 2. Dokumentasi Arsitektur Sistem Terintegrasi

- [x] 2.1 Membuat berkas `/docs/ARCHITECTURE.md`.
- [x] 2.2 Menulis diagram visual dan narasi batas-batas sistem (system boundaries) antara frontend, backend, database, dan blockchain.
- [x] 2.3 Mendokumentasikan diagram alur sekuensial (sequencing diagram) untuk alur pembuatan event turnamen hingga klaim hadiah.
- [x] 2.4 Menjelaskan transisi state utama pada turnamen (`setup` -> `active` -> `voting` -> `ended` / `disputed`).

## 3. Dokumentasi Referensi Smart Contract Celo

- [x] 3.1 Membuat berkas `/docs/SMART-CONTRACT.md`.
- [x] 3.2 Mendokumentasikan struktur data utama (seperti `EventInfo`) dan variabel state di dalam `BitPatchVault.sol`.
- [x] 3.3 Menyusun dokumentasi lengkap untuk fungsi pendaftaran turnamen `register(bytes32 eventId)` beserta parameter dan validasinya.
- [x] 3.4 Menyusun dokumentasi fungsi distribusi hadiah `distributePrize(bytes32 eventId, address[] memory winners, uint256[] memory shares)` lengkap dengan aturan kuorum.
- [x] 3.5 Menyusun dokumentasi fungsi pengembalian dana darurat `emergencyRefund(bytes32 eventId)` beserta syarat pemicunya.
- [x] 3.6 Menyusun daftar event emisi (seperti `EventCreated`, `PrizeDistributed`, `FundsRefunded`) beserta parameter index-nya.

## 4. Dokumentasi Skema Database PostgreSQL / Supabase

- [x] 4.1 Membuat berkas `/docs/DATABASE.md`.
- [x] 4.2 Mendokumentasikan skema lengkap tabel `events` beserta tipe data, default value, dan status state.
- [x] 4.3 Mendokumentasikan skema lengkap tabel `participants` beserta relasi foreign key ke tabel `events`.
- [x] 4.4 Mendokumentasikan skema lengkap tabel `votes` untuk melacak suara konsensus peserta.
- [x] 4.5 Mendokumentasikan skema lengkap tabel `brackets` (untuk mode 1v1 dan Team) dan tabel `reputation_tracking` (untuk Minority Penalty).
- [x] 4.6 Menyusun contoh script DDL SQL lengkap yang siap dieksekusi langsung di SQL editor Supabase.

## 5. Dokumentasi API Backend Express.js

- [x] 5.1 Membuat berkas `/docs/API.md`.
- [x] 5.2 Mendokumentasikan endpoint pembuatan turnamen `POST /api/events` beserta schema request JSON dan response.
- [x] 5.3 Mendokumentasikan endpoint voting konsensus `POST /api/events/:id/vote` beserta aturan penanganan auto-abstain.
- [x] 5.4 Mendokumentasikan endpoint input pemenang oleh creator `POST /api/events/:id/winners`.
- [x] 5.5 Mendokumentasikan endpoint resolusi sengketa dan banding kedua `POST /api/events/:id/appeal`.
- [x] 5.6 Menyusun spesifikasi standardisasi HTTP status codes dan format payload error yang seragam.

## 6. Dokumentasi Konfigurasi Mode Game & Algoritma Bagan

- [x] 6.1 Membuat berkas `/docs/GAME-MODES.md`.
- [x] 6.2 Menjelaskan spesifikasi teknis Solo PvP (1v1) termasuk validasi jumlah peserta 2^n dan algoritma single-elimination.
- [x] 6.3 Menjelaskan spesifikasi teknis Team PvP (X vs X) termasuk opsi pendaftaran solo (random shuffle) vs tim utuh (registered).
- [x] 6.4 Menjelaskan spesifikasi Free-For-All (FFA) leaderboard scoring dan antarmuka input juara manual oleh creator.

## 7. Dokumentasi Sistem Konsensus & Anti-Troll (Edge Cases)

- [x] 7.1 Membuat berkas `/docs/CONSENSUS.md`.
- [x] 7.2 Menjelaskan alur validasi voting konsensus peserta terhadap pilihan juri berdasarkan threshold yang ditentukan.
- [x] 7.3 Mendokumentasikan mekanisme batas waktu tegas 24 jam dan eksekusi cron job auto-abstain.
- [x] 7.4 Mendokumentasikan mekanisme penanganan situasi seimbang 50/50 (tie) menjadi status disputed beserta alur banding kedua.
- [x] 7.5 Mendokumentasikan aturan pemotongan reputasi menggunakan sistem Minority Penalty bagi pelaku trolling yang berulang.

## 8. Panduan Setup Lingkungan Developer & Deployment

- [x] 8.1 Membuat berkas `/docs/SETUP.md`.
- [x] 8.2 Menyusun panduan instalasi dependencies lokal (Node.js LTS, Foundry/Anvil, Supabase CLI).
- [x] 8.3 Menyusun daftar konfigurasi environment variable (.env) lengkap untuk frontend, backend, dan smart contract.
- [x] 8.4 Menyusun langkah-langkah menjalankan platform secara lokal untuk pengujian end-to-end.
- [x] 8.5 Menyusun panduan deployment ke Celo Alfajores testnet dan Supabase cloud dashboard.
- [x] 8.6 Menyusun panduan instalasi dan integrasi Celo MCP Server untuk IDE (Cursor/VS Code) guna memudahkan asisten AI berinteraksi dengan blockchain.
