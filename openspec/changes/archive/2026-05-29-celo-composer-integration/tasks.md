## 1. Migrasi Blockchain Client Backend ke Viem

- [x] 1.1 Hapus dependensi `ethers` dari `backend/package.json` dan tambahkan `viem` dengan versi terbaru.
- [x] 1.2 Jalankan `npm install` di direktori `backend` untuk menyinkronkan dependensi baru.
- [x] 1.3 Refaktorisasi `backend/lib/blockchain.js` untuk mengganti Ethers.js dengan Viem Public Client dan Wallet Client yang dikonfigurasi menggunakan chain `celo` (atau `celoAlfajores` jika testnet).
- [x] 1.4 Sesuaikan modul `uuidToBytes32` menggunakan utilitas serialisasi `keccak256` dan `toHex` dari Viem.
- [x] 1.5 Perbarui `backend/routes/events.js` untuk menggunakan pemanggilan `writeContract` dan `waitForTransactionReceipt` dari Viem Public Client menggantikan instance contract Ethers.js pada endpoint pembuatan turnamen (`POST /api/events`).
- [x] 1.6 Perbarui pemanggilan fungsi `distributePrize` dan `emergencyRefund` di `backend/routes/events.js` agar menggunakan interaksi contract berbasis Viem.
- [x] 1.7 Uji integrasi backend dengan menjalankan server lokal dan pastikan tidak ada sisa impor dari `ethers`.

## 2. Simulasi Integrasi Celo Social Connect (ODIS)

- [x] 2.1 Buat skema tabel baru `social_mappings` di database PostgreSQL Supabase melalui script DDL SQL (kolom: `id`, `identifier` (unique), `wallet_address`, `created_at`).
- [x] 2.2 Buat modul backend baru `backend/lib/socialConnect.js` yang mengekspos fungsi `resolveSocialIdentifier(identifier)` dengan alur query ke tabel `social_mappings` Supabase, serta fallback data statis/lokal untuk kebutuhan testing.
- [x] 2.3 Buat route API backend baru `POST /api/social-connect/lookup` di `backend/routes/socialConnect.js` (atau langsung di `backend/routes/events.js` / file rute terpisah) yang menerima body payload `{ identifier }` dan mengembalikan data alamat wallet 0x yang terasosiasi.
- [x] 2.4 Daftarkan endpoint lookup baru di server Express utama (`backend/server.js` atau file index utama).

## 3. Integrasi Roster & Rencana Tampilan Antarmuka Frontend

- [x] 3.1 Perbarui `frontend/src/app/providers.tsx` untuk mendeteksi keberadaan objek provider MiniPay (`window.ethereum?.isMiniPay === true`) secara eksplisit di tingkat client-side.
- [x] 3.2 Tambahkan state dan visual penyesuaian (tampilan mobile-first, penyederhanaan tombol Connect Wallet) jika browser terdeteksi sebagai MiniPay.
- [x] 3.3 Tambahkan komponen pencarian & validasi identitas sosial baru di area "Registered Roster" pada halaman detail turnamen (`frontend/src/app/events/[id]/page.tsx`) jika pengguna yang masuk adalah sang pembuat turnamen (Creator) dan turnamen dalam status `setup`.
- [x] 3.4 Pastikan input form pencarian identitas sosial ini bersih dari segala bentuk ikon panah atau chevron (patuh pada pedoman visual Retro 8-bit, NO ARROWS).
- [x] 3.5 Terapkan penanganan aksi form: panggil endpoint `POST /api/social-connect/lookup` saat tombol ditekan, dan jika teresolusi, izinkan Creator menambahkan alamat wallet tersebut ke roster peserta secara langsung.

## 4. Verifikasi Akhir

- [x] 4.1 Lakukan pengujian end-to-end pendaftaran peserta turnamen menggunakan email/nomor telepon melalui antarmuka Creator.
- [x] 4.2 Verifikasi transaksi on-chain payouts via Viem backend dengan memicu pembagian hadiah (distributePrize) pada turnamen yang berakhir.
- [x] 4.3 Jalankan linter dan pastikan semua kode terkompilasi bersih tanpa peringatan/kesalahan tipe data.
