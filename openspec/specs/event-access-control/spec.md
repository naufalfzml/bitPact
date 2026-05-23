# event-access-control Specification

## Purpose
TBD - created by archiving change private-events. Update Purpose after archive.
## Requirements
### Requirement: Kreator dapat memilih tipe akses saat membuat turnamen
Sistem HARUS menyediakan tiga pilihan tipe akses saat pembuatan turnamen: `public`, `password`, dan `invite_only`. Tipe akses HARUS disimpan di kolom `access_type` pada tabel `events` di database.

#### Scenario: Kreator membuat turnamen publik
- **GIVEN** kreator sedang mengisi formulir pembuatan turnamen
- **WHEN** kreator memilih tipe akses "Public"
- **THEN** turnamen dibuat dengan `access_type = 'public'` dan tidak ada konfigurasi akses tambahan yang disimpan

#### Scenario: Kreator membuat turnamen dengan password
- **GIVEN** kreator sedang mengisi formulir pembuatan turnamen
- **WHEN** kreator memilih tipe akses "Private (Password)" dan memasukkan password "RETRO2026"
- **THEN** turnamen dibuat dengan `access_type = 'password'` dan hash bcrypt dari password disimpan di kolom `password_hash`

#### Scenario: Kreator membuat turnamen invite-only
- **GIVEN** kreator sedang mengisi formulir pembuatan turnamen
- **WHEN** kreator memilih tipe akses "Private (Invite-Only)" dan menambahkan daftar alamat dompet peserta
- **THEN** turnamen dibuat dengan `access_type = 'invite_only'` dan setiap alamat dompet yang dimasukkan disimpan ke tabel `event_whitelist`

---

### Requirement: Peserta harus memasukkan password untuk mendaftar ke turnamen bertipe password
Sistem HARUS memvalidasi password yang dimasukkan peserta terhadap hash password turnamen sebelum mengizinkan pendaftaran. Validasi HARUS dilakukan di backend.

#### Scenario: Password benar
- **GIVEN** turnamen memiliki `access_type = 'password'` dengan password "RETRO2026"
- **WHEN** peserta mengirimkan permintaan pendaftaran dengan password "RETRO2026"
- **THEN** backend memvalidasi password berhasil dan melanjutkan proses pendaftaran

#### Scenario: Password salah
- **GIVEN** turnamen memiliki `access_type = 'password'` dengan password "RETRO2026"
- **WHEN** peserta mengirimkan permintaan pendaftaran dengan password "WRONG123"
- **THEN** backend mengembalikan respons error 403 dengan pesan "Password turnamen tidak valid" dan pendaftaran ditolak

#### Scenario: Password tidak disertakan
- **GIVEN** turnamen memiliki `access_type = 'password'`
- **WHEN** peserta mengirimkan permintaan pendaftaran tanpa menyertakan field password
- **THEN** backend mengembalikan respons error 400 dengan pesan "Password diperlukan untuk turnamen ini"

---

### Requirement: Hanya alamat dompet yang masuk whitelist yang dapat mendaftar ke turnamen invite-only
Sistem HARUS memeriksa keberadaan alamat dompet peserta di tabel `event_whitelist` sebelum mengizinkan pendaftaran pada turnamen bertipe `invite_only`.

#### Scenario: Alamat dompet ada di whitelist
- **GIVEN** turnamen memiliki `access_type = 'invite_only'` dan alamat `0xABC...123` terdaftar di `event_whitelist`
- **WHEN** peserta dengan alamat `0xABC...123` mengirimkan permintaan pendaftaran
- **THEN** backend memvalidasi whitelist berhasil dan melanjutkan proses pendaftaran

#### Scenario: Alamat dompet tidak ada di whitelist
- **GIVEN** turnamen memiliki `access_type = 'invite_only'` dan alamat `0xDEF...456` TIDAK terdaftar di `event_whitelist`
- **WHEN** peserta dengan alamat `0xDEF...456` mengirimkan permintaan pendaftaran
- **THEN** backend mengembalikan respons error 403 dengan pesan "Anda tidak diundang ke turnamen ini"

---

### Requirement: Kreator dapat menambahkan peserta ke whitelist melalui Social Connect
Sistem HARUS memungkinkan kreator untuk mencari alamat dompet peserta menggunakan email atau nomor telepon melalui endpoint Social Connect, dan menambahkan alamat yang ditemukan ke whitelist turnamen.

#### Scenario: Pencarian Social Connect berhasil dan ditambahkan ke whitelist
- **GIVEN** kreator berada di halaman detail turnamen bertipe `invite_only` yang berstatus `setup`
- **WHEN** kreator memasukkan email "player@example.com" di formulir Social Connect dan sistem menemukan alamat dompet terkait `0xABC...123`
- **THEN** alamat `0xABC...123` ditambahkan ke tabel `event_whitelist` untuk turnamen tersebut dan ditampilkan di daftar roster undangan

#### Scenario: Pencarian Social Connect tidak menemukan hasil
- **GIVEN** kreator berada di halaman detail turnamen bertipe `invite_only`
- **WHEN** kreator memasukkan email "unknown@example.com" dan sistem tidak menemukan alamat dompet terkait
- **THEN** sistem menampilkan pesan "Identitas tidak ditemukan di Social Connect. Coba masukkan alamat dompet secara manual."

---

### Requirement: Frontend menampilkan formulir password retro untuk turnamen bertipe password
Antarmuka pengguna HARUS menampilkan formulir input password bergaya 8-bit retro pada halaman detail turnamen ketika turnamen bertipe `password` dan peserta belum terdaftar. Formulir TIDAK BOLEH menggunakan ikon panah atau chevron.

#### Scenario: Peserta melihat formulir password
- **GIVEN** peserta mengunjungi halaman detail turnamen bertipe `password` dan belum terdaftar
- **WHEN** halaman dimuat
- **THEN** sistem menampilkan input field password bergaya retro dengan tombol "■ ENTER ROOM CODE ■" (tanpa ikon panah) menggantikan tombol register biasa

#### Scenario: Turnamen publik tidak menampilkan formulir password
- **GIVEN** peserta mengunjungi halaman detail turnamen bertipe `public`
- **WHEN** halaman dimuat
- **THEN** sistem menampilkan tombol "■ Register & Lock cUSD" standar tanpa formulir password

---

### Requirement: Frontend menampilkan indikator tipe akses pada kartu turnamen
Antarmuka pengguna HARUS menampilkan badge tipe akses (Public / Password / Invite-Only) pada kartu informasi turnamen di halaman detail dan daftar turnamen.

#### Scenario: Badge ditampilkan pada turnamen password
- **GIVEN** turnamen memiliki `access_type = 'password'`
- **WHEN** halaman detail turnamen dimuat
- **THEN** badge "■ PRIVATE: PASSWORD ■" ditampilkan di header kartu turnamen dengan gaya piksel retro

#### Scenario: Badge ditampilkan pada turnamen invite-only
- **GIVEN** turnamen memiliki `access_type = 'invite_only'`
- **WHEN** halaman detail turnamen dimuat
- **THEN** badge "■ PRIVATE: INVITE ONLY ■" ditampilkan di header kartu turnamen dengan gaya piksel retro

