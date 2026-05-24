## 1. Setup Dependensi & Variabel Lingkungan

- [x] 1.1 Tambahkan pustaka SDK resmi `@celo/identity` ke dalam file `backend/package.json`.
- [x] 1.2 Jalankan perintah `npm install` pada direktori `backend` untuk menyinkronkan pustaka baru.
- [x] 1.3 Perbarui berkas `backend/.env` (atau file konfigurasi lingkungan) dengan variabel baru yang diperlukan untuk ODIS (`ODIS_SERVICE_URL`, `ODIS_ISSUER_ADDRESS`, `ODIS_ISSUER_PRIVATE_KEY`, `ODIS_DEK_PRIVATE_KEY`).

## 2. Refaktorisasi Backend (Lookup Asli ODIS & Caching)

- [x] 2.1 Refaktorisasi berkas `backend/lib/socialConnect.js` untuk mengimpor `@celo/identity` ODIS client dan mengonfigurasi instance Issuer.
- [x] 2.2 Implementasikan logika pencarian hybrid pada `resolveSocialIdentifier(identifier)`: pertama kueri ke database Supabase `social_mappings`, jika ditemukan langsung kembalikan.
- [x] 2.3 Jika tidak ditemukan di database lokal, buat hash tersamar (*obfuscated identifier*) menggunakan ODIS SDK, lalu kueri smart contract `FederatedAttestations` on-chain milik Celo.
- [x] 2.4 Setelah mendapatkan alamat wallet yang terasosiasi secara on-chain, simpan pemetaan tersebut (email/no. telepon -> wallet) ke tabel database `social_mappings` Supabase sebagai cache lokal untuk kueri berikutnya.
- [x] 2.5 Pastikan error handling diatur dengan baik, dan jika ODIS query gagal karena isu balance kuota atau konektivitas, log error secara presisi tanpa menjatuhkan server API.

## 3. Penyesuaian Frontend & UI Feedback

- [x] 3.1 Perbarui teks indikator memuat (loading) pada halaman pembuatan & detail turnamen (`frontend/src/app/events/create/page.tsx` & `[id]/page.tsx`) saat lookup sedang berjalan untuk menyajikan feedback retro 8-bit bertuliskan "■ MENGHUBUNGI DECENTRALIZED IDENTITY NETWORK... ■".
- [x] 3.2 Pastikan visual UI bersih dari ikon panah atau chevron (patuh pada pedoman visual Retro 8-bit, NO ARROWS).

## 4. Verifikasi & Pengujian

- [x] 4.1 Lakukan uji coba lookup dengan data yang belum di-cache untuk memastikan modul ODIS terpanggil dengan benar.
- [x] 4.2 Verifikasi data yang berhasil didapatkan dari ODIS secara otomatis ter-cache di tabel `social_mappings` Supabase.
- [x] 4.3 Jalankan perintah kompilasi `next build` pada frontend dan verifikasi server backend berjalan dengan baik tanpa ada *broken import* atau peringatan tipe data.
