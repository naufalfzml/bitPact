## 1. Migrasi Database & Konfigurasi Blockchain

- [x] 1.1 Menambahkan kolom `username` opsional dan kolom `reputation_score` (default 100) pada tabel `participants` di Supabase.
- [x] 1.2 Memperbarui file konfigurasi backend `backend/lib/blockchain.js` untuk memastikan parameter default chain menggunakan `celoSepolia` dengan RPC Sepolia yang aktif.
- [x] 1.3 Menambahkan mapping untuk `CUSD_TOKEN_ADDRESS` Sepolia (`0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`) dan ABI yang sesuai pada constants frontend `frontend/src/constants/index.ts`.

## 2. Implementasi Layanan Backend (API)

- [x] 2.1 Memodifikasi route registrasi `/api/events/:id/register` di backend untuk memvalidasi hash transaksi menggunakan `viem` dengan memanggil `getTransactionReceipt`.
- [x] 2.2 Menolak registrasi di backend dan mengembalikan status 400 jika status transaksi gagal (reverted), jika `to` bukan alamat kontrak vault, atau jika parameter input tidak valid.
- [x] 2.3 Membuat endpoint `/api/events/:id/distribute` yang memvalidasi apakah jumlah suara yang masuk (voters) telah mencapai kuorum >= 51% dari peserta aktif sebelum memicu pembagian hadiah escrow.
- [x] 2.4 Memperbarui logika penutupan pendaftaran di backend untuk menghasilkan bagan pertandingan (brackets) dinamis yang menyisipkan virtual slot **"BYE"** jika jumlah peserta ganjil.
- [x] 2.5 Mengimplementasikan aturan pembagian tim kustom tidak seimbang (asymmetrical) di mana ukuran satu tim maksimal $\lceil N/2 \rceil$ pada backend ketika event bertipe tim dikunci.

## 3. Komponen Antarmuka RPG Header & Gamer Tag

- [x] 3.1 Melakukan audit komprehensif pada UI frontend untuk menstandardisasi semua simbol dan label mata uang menjadi **`cUSD`** secara konsisten.
- [x] 3.2 Memodifikasi layout dApp untuk menyertakan panel status RPG retro 8-bit di samping tombol connect wallet.
- [x] 3.3 Menambahkan query saldo di frontend (`ConnectButtonClient.tsx`) untuk membaca saldo cUSD (`BAG`) dan CELO (`GAS`) pengguna aktif pada jaringan Sepolia.
- [x] 3.4 Mengimplementasikan utility penghasil Gamer Tag otomatis bergaya retro 8-bit (`HERO_XXXX` / `PLAYER_XXXX`) berdasarkan 4 karakter terakhir alamat dompet jika `username` kosong di database.
- [x] 3.5 Menampilkan visual HP reputasi (`HP: [Reputasi]/100`) di header RPG status bar.

## 4. Roster & Kontrol Turnamen Frontend

- [x] 4.1 Menambahkan tombol **■ LOCK ROSTER ■** pada panel admin turnamen yang mengirimkan request penutupan pendaftaran ke backend.
- [x] 4.2 Menambahkan tombol kontrol bagan **■ AUTO SHUFFLE BRACKETS ■** dan opsi **■ MANUAL INPUT ■** dengan kemampuan drag-and-drop atau select box retro untuk menyusun pemain ke bagan.
- [x] 4.3 Menyediakan tombol **■ DELETE PLAYER ■** di samping baris peserta pada daftar roster admin untuk mengeluarkan peserta secara off-chain sebelum event dikunci.
- [x] 4.4 Mengelompokkan tabel peserta turnamen berdasarkan tim (Tim A/Tim B atau Merah/Biru) dengan pembatas garis retro double border retro dan warna kontras retro yang berbeda di detail event.
- [x] 4.5 Menambahkan banner visual hijau retro **`■ ANDA TERDAFTAR DI WHITELIST ■`** di halaman detail event untuk peserta yang terdaftar di whitelist turnamen *invite-only*.
- [x] 4.6 Menampilkan banner merah **`■ AKSES TERBATAS: ANDA TIDAK DIUNDANG ■`** dan menonaktifkan tombol registrasi jika peserta tidak masuk whitelist.

## 5. Panel Voting & Papan Peringkat (Leaderboard)

- [x] 5.1 Menambahkan banner peringatan penalti minoritas retro berwarna kuning double border: **`■ WARNING: MEMILIH DI MINORITAS AKAN MENGURANGI 10 HP REPUTASI ANDA ■`** pada halaman voting turnamen.
- [x] 5.2 Menambahkan tombol **■ DISTRIBUTE PRIZE ■** di panel creator halaman voting yang aktif secara dinamis ketika kuorum voting >= 51% tercapai.
- [x] 5.3 Membuat halaman Papan Peringkat (Leaderboard) `/leaderboard` bergaya arcade retro 8-bit yang menampilkan peringkat reputasi pemain tertinggi (HP) dari database.
- [x] 5.4 Memastikan seluruh elemen UI yang baru dibuat bebas dari ikon panah atau chevron (NO ARROWS/CHEVRONS).

## 6. Verifikasi & Pengujian

- [x] 6.1 Melakukan pengujian alur registrasi dari frontend ke backend dengan menyimulasikan transaksi sukses dan gagal untuk memastikan validasi receipt berjalan dengan aman.
- [x] 6.2 Menguji pembuatan bagan ganjil (simulasi 5 peserta) dan memajukan peserta yang mendapatkan status **BYE** hingga babak final.
- [x] 6.3 Menguji skenario voting dengan 3 pemilih aktif dari 4 peserta terdaftar (75% kuorum) untuk memverifikasi tombol **■ DISTRIBUTE PRIZE ■** aktif dan dapat mengeksekusi distribusi secara manual.
- [x] 6.4 Melakukan verifikasi tampilan di browser untuk memastikan status bar RPG, gamer tag otomatis, dan papan peringkat tampil dengan estetika retro 8-bit yang sempurna tanpa adanya error hidrasi.
