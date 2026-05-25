## Context

Saat ini, bitPact menggunakan modul mock (`backend/lib/socialConnect.js`) untuk mensimulasikan pencarian Social Connect (email/no. telepon ke wallet Celo) dengan membaca data statis dari tabel `social_mappings` Supabase. Untuk beralih ke lingkungan produksi desentralisasi penuh, kita perlu menggunakan SDK `@celo/identity` secara asli untuk memanggil layanan ODIS (Oblivious Decentralized Identifier Service) Celo dan menanyakan mapping pada contract `FederatedAttestations` on-chain Celo.

## Goals / Non-Goals

**Goals:**
- Mengintegrasikan pustaka SDK resmi `@celo/identity` pada sisi backend bitPact.
- Melakukan kueri ODIS untuk mengambil *pepper* kriptografis berdasarkan email atau nomor telepon secara aman.
- Melakukan kueri on-chain ke smart contract `FederatedAttestations` milik Celo menggunakan Viem/Ethers (lewat dependensi Celo SDK) untuk menyelesaikan pemetaan identitas ke wallet address Celo.
- Membangun mekanisme caching hybrid: setiap resolusi yang sukses dari ODIS akan disimpan di database lokal Supabase `social_mappings` agar pencarian selanjutnya untuk identitas yang sama dapat diselesaikan secara instan tanpa biaya gas ODIS query.

**Non-Goals:**
- Membangun UI pendaftaran (attestation) nomor telepon/email pengguna di frontend (fokus perubahan pada resolusi pencarian/lookup sisi backend untuk whitelisting turnamen). Pendaftaran attestation diasumsikan telah dilakukan oleh pengguna melalui aplikasi dompet Celo (seperti Valora).

## Decisions

### 1. Integrasi `@celo/identity` SDK untuk ODIS
* **Pilihan**: Menggunakan paket SDK resmi `@celo/identity` di backend.
* **Alasan**: Paket ini menyediakan pustaka enkripsi ODIS yang teruji, mempermudah kalkulasi hash identitas tersamarkan (*obfuscated identifier*) menggunakan *pepper* kriptografis yang disediakan oleh server ODIS Celo secara desentralisasi.
* **Alternatif**: Menulis ulang fungsi kriptografi kustom. Hal ini sangat berisiko, rawan kesalahan matematika enkripsi (BLS threshold signatures), dan rentan celah keamanan.

### 2. Mekanisme Caching Hibrida di Supabase (`social_mappings`)
* **Pilihan**: Kueri lookup pertama kali akan memicu ODIS on-chain, lalu hasilnya di-cache ke tabel `social_mappings` Supabase. Lookup berikutnya langsung mengambil dari database lokal.
* **Alasan**: ODIS query di mainnet memakan biaya kuota kueri (gas/fee) dan waktu respons (1–3 detik). Dengan caching, kita mendapatkan yang terbaik dari kedua dunia: keaslian & privasi data ODIS, serta kecepatan & efisiensi biaya (0 gas fee) database tradisional.
* **Alternatif**: Selalu melakukan kueri ke ODIS. Ini sangat mahal, boros kuota kueri, dan memperlambat UI frontend bitPact.

### 3. Konfigurasi Variabel Lingkungan untuk Kredensial Issuer
* **Pilihan**: Menambahkan variabel lingkungan `.env` berikut:
  * `ODIS_ISSUER_ADDRESS`: Alamat wallet backend yang terdaftar sebagai issuer.
  * `ODIS_ISSUER_PRIVATE_KEY`: Kunci privat issuer untuk tanda tangan transaksi/kueri ODIS.
  * `ODIS_DEK_PRIVATE_KEY`: Kunci privat Data Encryption Key (DEK) issuer yang terdaftar secara on-chain di Celo.
  * `ODIS_SERVICE_URL`: URL API ODIS (Alfajores / Mainnet).
* **Alasan**: Memisahkan kredensial sensitif dari repositori kode untuk mencegah kebocoran kunci privat.

## Risks / Trade-offs

- **[Risk]** Saldo kuota kueri Issuer ODIS habis → **[Mitigasi]** Backend memantau saldo kuota kueri dan mengirimkan notifikasi. Jika ODIS gagal diakses karena masalah kuota, sistem akan memberikan fallback pencarian manual alamat wallet 0x langsung di frontend.
- **[Trade-off]** Proses lookup pertama kali dari ODIS membutuhkan waktu respons lebih lambat (~2 detik) dibanding mock lokal → **[Mitigasi]** Frontend menampilkan indikator loading retro 8-bit yang interaktif bertuliskan "■ MENGHUBUNGI DECENTRALIZED IDENTITY NETWORK... ■" selama proses berlangsung.
