## Context

Saat ini, bitPatch membolehkan pembuatan turnamen tipe "Public" yang bertentangan dengan kebutuhan keintiman komunitas. Selain itu, fitur "Invite-Only" yang ada sangat merepotkan karena kreator harus menyalin alamat wallet Celo heksadesimal 42 karakter (0x) satu per satu secara manual.

Untuk mengatasinya:
1. Kita akan menghapus tipe akses "Public", sehingga turnamen hanya bertipe "Password" atau "Invite-Only".
2. Kita mengintegrasikan fitur pencarian (lookup) Social Connect (mock ODIS) yang memungkinkan kreator mencari alamat wallet calon peserta dengan mengetikkan email atau nomor telepon, lalu menambahkannya langsung ke whitelist.

## Goals / Non-Goals

**Goals:**
- Menghapus opsi pembuatan turnamen publik di frontend dan backend secara aman.
- Mengintegrasikan antarmuka pencarian Social Connect (nomor telepon & email) pada pembuatan whitelist turnamen.
- Memproses resolusi identitas sosial menjadi wallet address Celo secara mulus di sisi frontend dan memvalidasinya di sisi backend.

**Non-Goals:**
- Mengintegrasikan ODIS SDK rilisan Celo secara on-chain langsung pada tahap ini (kita akan menggunakan Mock ODIS Service berbasis Supabase `social_mappings` yang sudah diimplementasikan di `/backend/lib/socialConnect.js`).
- Mengubah fungsi atau logika on-chain di smart contract `BitPatchVault.sol`.

## Decisions

1. **Pemberhentian Tipe Akses Public (Breaking Change)**:
   * Seluruh referensi tipe "Public" di Dropdown pembuatan event akan dihapus.
   * Di backend `/backend/routes/events.js`, skema validasi Joi/kustom untuk `access_type` hanya akan menerima `password` atau `invite_only`. Jika payload menyertakan `public` atau tipe lainnya, backend akan melempar kode error 400.
2. **Desain Komponen Social Connect Invite Builder**:
   * Di frontend `/frontend/src/app/events/create/page.tsx`, bagian whitelist builder akan memuat input teks retro bertuliskan "■ MASUKKAN EMAIL / NO. TELEPON PESERTA ■" dengan tombol retro berlabel "■ CARI DAN UNDANG ■" (tanpa ikon panah).
   * Ketika tombol ditekan, frontend akan memanggil endpoint backend `POST /api/social-connect/lookup` dengan payload `{ identifier }`.
   * Jika resolved, alamat wallet yang ditemukan akan dimasukkan ke daftar whitelist event. Jika tidak resolved, sistem menampilkan pesan peringatan 8-bit retro bertuliskan "■ IDENTITAS TIDAK TERDAFTAR DI CELO SOCIAL CONNECT ■" dengan tombol "■ MASUKKAN SECARA MANUAL ■" untuk cadangan.
3. **Desain Endpoint Database & Backend**:
   * Endpoint `POST /api/social-connect/lookup` sudah tersedia di `backend/routes/socialConnect.js` dan menggunakan table Supabase `social_mappings`. Kreator dapat menggunakan table ini untuk menyelesaikan pencarian secara instan.

## Risks / Trade-offs

- **Privasi & Penggunaan Mock**: Penggunaan database tersentralisasi di Supabase untuk mencocokkan nomor telepon/email dengan dompet merupakan bentuk mock. Di masa mendatang, kita harus bermigrasi menggunakan layanan ODIS Celo secara desentralisasi.
