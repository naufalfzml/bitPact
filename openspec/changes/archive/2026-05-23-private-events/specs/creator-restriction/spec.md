## ADDED Requirements

### Requirement: Kreator dilarang mendaftar ke turnamen buatan sendiri
Sistem HARUS memblokir upaya pendaftaran turnamen jika alamat dompet peserta yang mendaftar sama dengan alamat dompet kreator turnamen tersebut. Pembatasan ini HARUS diterapkan di layer frontend (antarmuka pengguna) dan layer backend (validasi API).

#### Scenario: Backend menolak pendaftaran kreator sendiri
- **GIVEN** turnamen memiliki alamat kreator `0xCREATOR...111`
- **WHEN** peserta dengan alamat dompet `0xCREATOR...111` mengirimkan permintaan pendaftaran ke turnamen tersebut
- **THEN** backend memvalidasi dan mendeteksi bahwa peserta adalah kreator turnamen
- **AND** backend mengembalikan respons error 403 Forbidden dengan pesan "Kreator tidak diizinkan untuk mendaftar ke turnamen buatan sendiri" dan transaksi pendaftaran di-abort

#### Scenario: Frontend menonaktifkan tombol pendaftaran untuk kreator
- **GIVEN** pengguna yang masuk (logged-in user) adalah pemilik/kreator turnamen yang sedang dilihat
- **WHEN** halaman detail turnamen dimuat
- **THEN** sistem menonaktifkan (disable) tombol registrasi turnamen
- **AND** sistem menampilkan teks informasi "■ KREATUR TIDAK BISA IKUT BERMAIN ■" bergaya retro di atas atau di dalam tombol pendaftaran
