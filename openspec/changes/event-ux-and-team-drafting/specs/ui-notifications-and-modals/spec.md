## ADDED Requirements

### Requirement: Notifikasi terpicu tepat satu kali
Sistem notifikasi toast MUST menampilkan tepat satu toast per pemanggilan
`push`/`toast.*`, baik di mode development (React StrictMode) maupun production.
Implementasi `push` MUST TIDAK melakukan efek samping (mis. menambah toast) di
dalam updater state yang bisa di-invoke ganda oleh React.

#### Scenario: Satu aksi menghasilkan satu toast
- **GIVEN** aplikasi berjalan di mode development (StrictMode aktif)
- **WHEN** sebuah aksi memanggil `toast.success(...)` satu kali
- **THEN** hanya satu toast yang muncul (bukan dua)

#### Scenario: Aksi bracket tidak menggandakan notifikasi
- **WHEN** kreator menjalankan aksi pembuatan/penyimpanan bracket yang memicu
  notifikasi sukses
- **THEN** hanya satu toast sukses yang muncul

### Requirement: Modal popup terpusat untuk konfirmasi & error
Sistem MUST menyediakan komponen modal popup terpusat yang reusable untuk
menampilkan konfirmasi aksi penting dan pesan error. Modal MUST muncul di tengah
layar dengan overlay, dan menyediakan aksi tutup (serta konfirmasi bila modal
bersifat konfirmasi). Pesan sukses transien dan notifikasi tx hash MUST tetap
memakai toast pojok, bukan modal.

#### Scenario: Error tampil sebagai modal
- **WHEN** sebuah aksi penting gagal (mis. distribusi/registrasi) dan perlu
  perhatian pengguna
- **THEN** pesan error ditampilkan dalam modal popup terpusat dengan tombol tutup

#### Scenario: Sukses & tx hash tetap toast
- **WHEN** sebuah aksi sukses dan/atau menghasilkan tx hash
- **THEN** notifikasi ditampilkan sebagai toast di pojok layar (bukan modal)

### Requirement: Copy tombol & loading akurat dan konsisten
Copy aksi dan loading MUST akurat secara teknis dan konsisten antar halaman.
Tombol submit Create Event MUST TIDAK menyiratkan deploy kontrak (vault bersifat
tunggal, membuat event tidak men-deploy kontrak baru). Teks loading detail event
MUST memakai gaya yang konsisten dengan halaman lain.

#### Scenario: Tombol Create Event tidak menyebut deploy kontrak
- **WHEN** kreator membuka form Create Event
- **THEN** tombol submit bertuliskan "■ Create Tournament" (idle) dan
  "CREATING TOURNAMENT..." saat proses berjalan
- **AND** tidak ada teks "Deploy Contract" atau "INITIALIZING_ON_CHAIN_CONTRACT"

#### Scenario: Loading detail event konsisten
- **WHEN** halaman detail event sedang memuat
- **THEN** teks loading memakai copy yang bersih dan konsisten (bukan
  "LOADING_DASHBOARD_PANEL...")
