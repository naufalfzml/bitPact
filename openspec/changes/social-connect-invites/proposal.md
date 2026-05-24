## Why

Saat ini, bitPatch masih memperbolehkan pembuatan turnamen dengan tipe akses "Public". Namun, demi menjaga keintiman dan eksklusivitas kompetisi komunitas retro di bitPact, seluruh turnamen diubah menjadi privat (baik dilindungi password atau khusus undangan). 

Selain itu, saat membuat turnamen tipe "Invite-Only", kreator masih harus memasukkan alamat wallet secara manual yang sangat merepotkan. Dengan mengintegrasikan Social Connect (mock ODIS resolver), kreator dapat dengan mudah mengundang peserta hanya dengan memasukkan nomor telepon atau email mereka, yang secara otomatis akan diterjemahkan menjadi alamat wallet Celo tujuan.

## What Changes

- **PENGHAPUSAN EVENT PUBLIK (BREAKING)**: Menghapus opsi tipe akses "Public" dari pembuatan turnamen. Seluruh turnamen harus bertipe "Password" atau "Invite-Only".
- **INTEGRASI SOCIAL CONNECT PADA FORM UNDANGAN**: Menambahkan antarmuka pencarian (lookup) Social Connect pada pembuatan/manajemen whitelist turnamen bertipe "Invite-Only", memungkinkan input berupa nomor telepon (misal: `+6281234567890`) atau email (misal: `user@example.com`).
- **VALIDASI FORM DAN AUTO-RESOLVE**: Frontend akan secara otomatis memanggil endpoint backend `/api/social-connect/lookup` untuk menerjemahkan nomor telepon/email menjadi alamat wallet Celo dan memvalidasinya sebelum ditambahkan ke daftar whitelist.
- **RESTRIKSI BACKEND**: Memperbarui backend untuk hanya menerima turnamen dengan tipe akses `password` atau `invite_only`.

## Capabilities

### New Capabilities
- `social-connect-lookup`: Kapabilitas untuk menerjemahkan identitas sosial (nomor telepon, email) menjadi alamat dompet Celo secara presisi menggunakan ODIS mock service.

### Modified Capabilities
- `event-access-control`: Memodifikasi kontrol akses turnamen dengan menghapus akses tipe "Public", sehingga hanya menyisakan "Password" dan "Invite-Only".

## Impact

- **Frontend**:
  - `/frontend/src/app/events/create/page.tsx`: Hapus opsi "Public" dari dropdown tipe akses. Perbarui komponen whitelist builder untuk mendukung input nomor telepon/email dengan tombol "■ CARI DAN UNDANG ■".
  - `/frontend/src/app/events/[id]/page.tsx`: Perbarui panel manajemen whitelist untuk kreator agar mendukung pencarian Social Connect.
- **Backend**:
  - `/backend/routes/events.js`: Perbarui validasi pembuatan event agar menolak tipe akses selain `password` or `invite_only`.
