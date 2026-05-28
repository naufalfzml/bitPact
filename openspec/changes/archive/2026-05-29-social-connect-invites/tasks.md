## 1. Penghapusan Akses Publik di Frontend dan Backend

- [x] 1.1 Hapus pilihan 'Public' dari dropdown jenis akses di formulir pembuatan turnamen `/frontend/src/app/events/create/page.tsx`
- [x] 1.2 Ubah inisialisasi default tipe akses dari 'public' menjadi 'password' di formulir pembuatan
- [x] 1.3 Perbarui validasi input pembuatan event di backend `/backend/routes/events.js` agar hanya menerima 'password' atau 'invite_only', dan kembalikan error status 400 jika payload bertipe 'public'
- [x] 1.4 Hapus logika rendering penanda (badge) bertipe 'public' di frontend event card `/frontend/src/app/page.tsx` dan detail event `/frontend/src/app/events/[id]/page.tsx`

## 2. Integrasi UI Social Connect Lookup pada Whitelist Pembuatan Event

- [x] 2.1 Tambahkan input pencarian Social Connect (email / nomor telepon) di bagian Whitelist Builder pada `/frontend/src/app/events/create/page.tsx`
- [x] 2.2 Hubungkan tombol "■ CARI DAN UNDANG ■" di whitelist builder dengan endpoint backend `POST /api/social-connect/lookup`
- [x] 2.3 Implementasikan auto-resolve: saat tombol ditekan, cari alamat dompet terkait dan masukkan ke daftar whitelist peserta secara otomatis jika statusnya "RESOLVED"
- [x] 2.4 Tampilkan pesan kegagalan retro "■ IDENTITAS TIDAK TERDAFTAR DI CELO SOCIAL CONNECT ■" jika status "NOT_RESOLVED", dengan tombol opsi "■ MASUKKAN SECARA MANUAL ■" sebagai cadangan

## 3. Integrasi UI Social Connect Lookup pada Detail Event (Panel Manajemen Whitelist)

- [x] 3.1 Perbarui panel manajemen whitelist bagi kreator pada `/frontend/src/app/events/[id]/page.tsx` untuk menyertakan input pencarian Social Connect yang sama
- [x] 3.2 Hubungkan tombol pencarian di halaman detail tersebut dengan API lookup backend
- [x] 3.3 Pastikan alamat dompet yang berhasil ter-resolve otomatis diposting ke endpoint backend `/api/events/:id/whitelist` untuk memperbarui database Supabase secara real-time

## 4. Verifikasi dan Pengujian

- [x] 4.1 Pastikan frontend Next.js dapat melakukan kompilasi (`next build`) tanpa error tipe data TypeScript
- [x] 4.2 Lakukan pengujian pembuatan event privat (Password & Invite-Only) untuk memastikan fungsionalitas berjalan lancar
- [x] 4.3 Pastikan antarmuka UI sepenuhnya bersih dari ikon/bentuk panah atau chevron (NO ARROWS/CHEVRONS)
