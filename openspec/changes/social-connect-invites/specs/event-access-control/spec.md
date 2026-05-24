## MODIFIED Requirements

### Requirement: Kreator dapat memilih tipe akses saat membuat turnamen
Sistem HARUS menyediakan dua pilihan tipe akses privat saat pembuatan turnamen: `password` dan `invite_only`. Pilihan tipe akses `public` harus sepenuhnya DIHAPUS. Tipe akses HARUS disimpan di kolom `access_type` pada tabel `events` di database.

#### Scenario: Kreator membuat turnamen dengan password
- **GIVEN** kreator sedang mengisi formulir pembuatan turnamen
- **WHEN** kreator memilih tipe akses "Private (Password)" dan memasukkan password "RETRO2026"
- **THEN** turnamen dibuat dengan `access_type = 'password'` dan hash bcrypt dari password disimpan di kolom `password_hash`

#### Scenario: Kreator membuat turnamen invite-only
- **GIVEN** kreator sedang mengisi formulir pembuatan turnamen
- **WHEN** kreator memilih tipe akses "Private (Invite-Only)" dan menambahkan daftar alamat dompet peserta
- **THEN** turnamen dibuat dengan `access_type = 'invite_only'` dan setiap alamat dompet yang dimasukkan disimpan ke tabel `event_whitelist`

---

### Requirement: Frontend menampilkan indikator tipe akses pada kartu turnamen
Antarmuka pengguna HARUS menampilkan badge tipe akses privat (Password / Invite-Only) pada kartu informasi turnamen di halaman detail dan daftar turnamen. Opsi atau badge bertipe "Public" dilarang keras untuk ditampilkan.

#### Scenario: Badge ditampilkan pada turnamen password
- **GIVEN** turnamen memiliki `access_type = 'password'`
- **WHEN** halaman detail turnamen dimuat
- **THEN** badge "■ PRIVATE: PASSWORD ■" ditampilkan di header kartu turnamen dengan gaya piksel retro

#### Scenario: Badge ditampilkan pada turnamen invite-only
- **GIVEN** turnamen memiliki `access_type = 'invite_only'`
- **WHEN** halaman detail turnamen dimuat
- **THEN** badge "■ PRIVATE: INVITE ONLY ■" ditampilkan di header kartu turnamen dengan gaya piksel retro
