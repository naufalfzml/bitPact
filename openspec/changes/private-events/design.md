## Context

Platform bitPact saat ini hanya mendukung turnamen publik. Semua pengguna dengan dompet Celo (MiniPay) dapat mendaftar ke turnamen mana pun selama status turnamen masih `setup` dan mereka memiliki saldo cUSD yang cukup. Tidak ada mekanisme pembatasan akses.

Selain itu, smart contract `BitPatchVault.sol` tidak membedakan antara alamat `creator` dan peserta biasa pada fungsi `register()`. Artinya kreator yang juga bertindak sebagai juri dapat mendaftar ke turnamen buatannya sendiri, menciptakan potensi konflik kepentingan dalam distribusi hadiah.

Perubahan ini menambahkan kontrol akses turnamen pada layer backend/database (bukan smart contract) dan memblokir pendaftaran kreator di layer frontend dan backend.

## Goals / Non-Goals

**Goals:**
- Menambahkan tiga tipe akses turnamen: `public`, `password`, dan `invite_only`.
- Memvalidasi akses peserta di backend sebelum mengeksekusi transaksi pendaftaran on-chain.
- Memblokir pendaftaran kreator baik di frontend (UX) maupun backend (API guard).
- Menjaga kompatibilitas penuh dengan smart contract yang sudah terdeploy — tidak ada perubahan Solidity.

**Non-Goals:**
- Menambahkan whitelist on-chain (Merkle Tree / mapping) di smart contract. Validasi akses cukup dilakukan di layer backend yang terpercaya (admin-only contract).
- Mengimplementasikan sistem undangan berbasis email/SMS notifikasi aktif. Fitur invite-only hanya berupa whitelist alamat dompet secara manual atau melalui Social Connect lookup.
- Menambahkan opsi "Player-Organizer Mode" di mana kreator bisa ikut bertanding. Fitur ini ditangguhkan untuk iterasi selanjutnya.

## Decisions

### 1. Validasi Akses di Backend, Bukan di Smart Contract

**Keputusan**: Kontrol akses (password & whitelist) diimplementasikan sepenuhnya di layer backend Express.js dan database Supabase. Smart contract `BitPatchVault.sol` tidak dimodifikasi.

**Alasan**: 
- Smart contract sudah terdeploy di Celo Mainnet (`0xC2375c25f402e83ce2b6F148146D6A8b47c0e62F`) dan menghindari redeployment menjaga kontinuitas alamat kontrak.
- Fungsi `register()` pada smart contract hanya dapat dipanggil oleh pengguna akhir (peserta) setelah mereka menyetujui transfer cUSD. Backend bertanggung jawab atas validasi pre-condition sebelum frontend mengeksekusi transaksi blockchain.
- Karena backend admin wallet adalah satu-satunya entitas yang memanggil `createEvent()` dan `distributePrize()`, kepercayaan terhadap validasi backend sudah tertanam dalam arsitektur.

**Alternatif dipertimbangkan**: Menambahkan `mapping(bytes32 => mapping(address => bool)) whitelist` di smart contract — ditolak karena membutuhkan redeployment kontrak dan menambah biaya gas per pendaftaran.

### 2. Hashing Password dengan bcrypt di Backend

**Keputusan**: Password turnamen di-hash menggunakan `bcrypt` (salt rounds: 10) dan disimpan di kolom `password_hash` tabel `events` Supabase.

**Alasan**:
- Bcrypt adalah standar industri untuk hashing password yang tahan terhadap serangan brute-force dan rainbow table.
- Peserta mengirimkan password plaintext ke backend melalui HTTPS. Backend memverifikasi password terhadap hash yang tersimpan menggunakan `bcrypt.compare()`.
- Password tidak pernah dikirimkan ke blockchain atau disimpan dalam bentuk plaintext.

**Alternatif dipertimbangkan**: Keccak256 on-chain — ditolak karena membutuhkan modifikasi smart contract dan password akan terekspos di calldata transaksi publik.

### 3. Tabel Terpisah `event_whitelist` untuk Invite-Only

**Keputusan**: Membuat tabel baru `event_whitelist` dengan kolom `event_id` dan `wallet_address` daripada menyimpan array JSON di kolom tabel `events`.

**Alasan**:
- Tabel terpisah memungkinkan query efisien (`SELECT EXISTS`) untuk memvalidasi apakah alamat dompet tertentu masuk dalam whitelist.
- Mendukung penambahan dan penghapusan alamat secara individual tanpa membaca/menulis ulang seluruh array.
- Memungkinkan indeks pada `(event_id, wallet_address)` untuk pencarian O(1).

### 4. Blokir Kreator di Dua Layer (Frontend + Backend)

**Keputusan**: Pendaftaran kreator diblokir di frontend (tombol dinonaktifkan) DAN di backend (API mengembalikan error 403).

**Alasan**: Defense-in-depth. Validasi frontend saja tidak aman karena pengguna bisa memanggil API secara langsung. Validasi backend menjadi lapisan keamanan utama.

## Risks / Trade-offs

- **[Risiko] Password bocor via MITM** → Mitigasi: Semua komunikasi frontend-backend menggunakan HTTPS. Password tidak pernah dikirim ke blockchain.
- **[Risiko] Kreator mem-bypass blokir dengan dompet berbeda** → Mitigasi: Ini adalah batasan arsitektural yang disadari. Tanpa KYC on-chain, tidak mungkin mencegah kreator membuat akun dompet kedua. Namun, mekanisme voting konsensus peserta tetap menjadi lapisan keamanan akhir terhadap kecurangan juri.
- **[Trade-off] Validasi off-chain vs on-chain** → Validasi akses off-chain lebih fleksibel dan murah (tanpa gas cost), tetapi bergantung pada integritas backend. Untuk platform dengan model admin terpusat seperti bitPact, ini adalah trade-off yang dapat diterima.
- **[Trade-off] Tidak ada notifikasi undangan aktif** → Peserta yang di-whitelist harus mengetahui URL turnamen secara manual (dibagikan oleh kreator). Sistem notifikasi email/push ditangguhkan untuk iterasi selanjutnya.
