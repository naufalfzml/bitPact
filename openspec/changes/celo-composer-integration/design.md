## Context

bitPact saat ini menggunakan Ethers.js pada Express.js backend API server untuk melakukan kueri data *on-chain* dan memicu transaksi pengiriman hadiah (payouts). Di sisi lain, pendaftaran turnamen masih memerlukan input manual berupa alamat wallet 0x yang panjang dan rentan kesalahan ketik. Untuk membawa platform bitPact ke tingkat produksi yang selaras dengan standar resmi **Celo Composer** dan **Opera MiniPay**, kita perlu memigrasikan backend ke **Viem** dan menyediakan layanan lookup peserta menggunakan identitas sosial nomor telepon/email melalui protokol **Social Connect (ODIS)**.

## Goals / Non-Goals

**Goals:**
- Mengeliminasi pustaka `ethers` dari backend dan menggantinya 100% dengan `viem` sebagai SDK blockchain.
- Membuat modul resolusi identitas `backend/lib/socialConnect.js` untuk pencarian nama/email/nomor telepon peserta.
- Menyediakan endpoint `POST /api/social-connect/lookup` untuk mencocokkan input teks pengguna ke alamat wallet 0x.
- Mengintegrasikan antarmuka pencarian peserta di konsol arena frontend Next.js menggunakan input nomor telepon/email.
- Mengaktifkan deteksi platform MiniPay di frontend untuk mengoptimalkan visual mobile.

**Non-Goals:**
- Melakukan verifikasi SMS attestation ODIS secara live di backend (menggunakan simulasi mock kueri/database karena keterbatasan issuer key dan biaya gas kueri ODIS testnet).

## Decisions

### 1. Migrasi Penuh Ethers.js ke Viem di Backend
* **Pilihan**: Mengganti `ethers` dengan `viem` & `viem/chains` & `@celo/connect` (bawaan Celo Composer).
* **Alasan**: Viem memiliki performa serialisasi transaksi yang jauh lebih cepat, konsumsi memori rendah, dan tipe data yang sepenuhnya seragam dengan frontend Next.js (Wagmi).

### 2. Simulasi Kueri Social Connect (ODIS) berbasis Database
* **Pilihan**: Membuat database relasional mock pemetaan identitas di Supabase (tabel baru `social_mappings`) untuk melayani kueri `/api/social-connect/lookup` secara instan, aman, dan tanpa biaya gas kueri ODIS yang mahal untuk fase pengembangan awal.
* **Alasan**: Memudahkan tim developer melakukan simulasi pengujian "invite by phone number" secara lokal tanpa harus melakukan *live attestation* yang rumit.

### 3. Deteksi Mobile MiniPay Injected Bridge
* **Pilihan**: Menggunakan `window.ethereum?.isMiniPay` di dalam `providers.tsx` untuk menyederhanakan Connect Button RainbowKit saat mendeteksi browser Opera MiniPay secara otomatis.
* **Alasan**: Meningkatkan kenyamanan pengguna dengan menyembunyikan opsi koneksi dompet lain yang tidak relevan di dalam MiniPay browser.

## Risks / Trade-offs

- **[Risk]** Pihak juri memasukkan email yang belum terdaftar di Social Connect → **[Mitigasi]** Sistem backend akan memberikan pesan status `NOT_RESOLVED` sehingga juri dapat memilih opsi alternatif berupa pengisian alamat wallet 0x secara manual.
- **[Trade-off]** Penggunaan kueri mock Social Connect mempersingkat waktu testing lokal, namun membutuhkan penggantian API URL ODIS asli saat naik ke produksi live mainnet. Kami mengisolasi fungsionalitas ini di satu modul `lib/socialConnect.js` agar penggantian ke modul ODIS asli sangat mudah dilakukan di kemudian hari.
