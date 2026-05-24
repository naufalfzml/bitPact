## ADDED Requirements

### Requirement: Validasi Transaksi Registrasi On-Chain Ketat
Sistem HARUS memvalidasi transaksi deposit tiket pendaftaran turnamen secara ketat pada sisi frontend dan backend sebelum pendaftaran dianggap sukses di database. 

#### Scenario: Validasi transaksi registrasi sukses di frontend dan backend
- **GIVEN** peserta telah menandatangani transaksi pembayaran tiket di dompet Web3 mereka
- **WHEN** transaksi blockchain berhasil di-mine (success) dan frontend memverifikasi receipt menggunakan `waitForTransactionReceipt`, lalu mengirimkan hash transaksi ke backend untuk diverifikasi ulang melalui RPC Celo Sepolia
- **THEN** backend memverifikasi status blockchain adalah sukses, mencocokkan parameter kontrak, dan menyimpan peserta ke database Supabase, lalu menampilkan pesan sukses retro di frontend

#### Scenario: Transaksi gagal di blockchain diblokir oleh sistem
- **GIVEN** peserta mengirimkan hash transaksi pendaftaran yang gagal/reverted atau tidak valid
- **WHEN** backend memeriksa receipt transaksi tersebut di blockchain Celo Sepolia
- **THEN** backend mendeteksi status transaksi gagal, menolak menyimpan data pendaftaran ke Supabase, dan mengembalikan status error 400 ke frontend

---

## MODIFIED Requirements

### Requirement: Hanya alamat dompet yang masuk whitelist yang dapat mendaftar ke turnamen invite-only
Sistem HARUS memeriksa keberadaan alamat dompet peserta di tabel `event_whitelist` sebelum mengizinkan pendaftaran pada turnamen bertipe `invite_only` dan HARUS menampilkan banner feedback visual hijau **`■ ANDA TERDAFTAR DI WHITELIST ■`** di frontend jika terdaftar.

#### Scenario: Alamat dompet ada di whitelist dan banner feedback ditampilkan
- **GIVEN** turnamen memiliki `access_type = 'invite_only'` dan alamat `0xABC...123` terdaftar di `event_whitelist`
- **WHEN** peserta dengan dompet terhubung `0xABC...123` membuka halaman detail turnamen
- **THEN** sistem menampilkan banner feedback hijau **`■ ANDA TERDAFTAR DI WHITELIST ■`** dan mengaktifkan tombol registrasi tanpa ikon panah atau chevron

#### Scenario: Alamat dompet tidak ada di whitelist dan pendaftaran ditolak
- **GIVEN** turnamen memiliki `access_type = 'invite_only'` dan alamat `0xDEF...456` TIDAK terdaftar di `event_whitelist`
- **WHEN** peserta dengan alamat `0xDEF...456` memuat halaman turnamen atau mengirimkan permintaan pendaftaran
- **THEN** sistem menampilkan banner merah **`■ AKSES TERBATAS: ANDA TIDAK DIUNDANG ■`**, menonaktifkan tombol registrasi, dan backend mengembalikan respons error 403 jika pendaftaran ditembus langsung
