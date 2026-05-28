## ADDED Requirements

### Requirement: Validasi off-chain sebelum deposit
Semua validasi kelayakan registrasi yang bisa dilakukan off-chain (status
event, roster lock, kapasitas, larangan creator mendaftar, ambang reputasi,
password, whitelist, duplikat) MUST dijalankan SEBELUM peserta melakukan
transaksi deposit on-chain. Sistem MUST menyediakan endpoint
`POST /api/events/:id/verify-access` yang menjalankan validasi tersebut tanpa
memerlukan `tx_hash`/deposit. Frontend MUST memanggil endpoint ini dan hanya
melanjutkan ke approve+register on-chain jika validasi lolos.

#### Scenario: Password salah tidak menyebabkan deposit
- **GIVEN** event ber-`access_type = "password"`
- **WHEN** user memasukkan password yang salah dan menekan register
- **THEN** frontend memanggil `verify-access`, menerima `403`
- **AND** menampilkan error
- **AND** TIDAK menjalankan approve maupun `register()` on-chain (tidak ada
  deposit USDC)

#### Scenario: Password benar lanjut deposit
- **GIVEN** event password dan user memasukkan password benar
- **WHEN** register ditekan
- **THEN** `verify-access` mengembalikan `200 { ok: true }`
- **AND** frontend melanjutkan approve + `register()` on-chain
- **AND** backend `/register` tetap memvalidasi ulang kelayakan + verifikasi
  on-chain sebelum membuat baris peserta

#### Scenario: verify-access tanpa wallet_address
- **WHEN** `POST /api/events/:id/verify-access` dipanggil tanpa `wallet_address`
- **THEN** respons `400`

#### Scenario: /register tetap aman jika dipanggil langsung
- **GIVEN** caller memanggil `POST /api/events/:id/register` langsung dengan
  password salah
- **THEN** respons `403` (defense-in-depth)
- **AND** tidak ada baris peserta dibuat

### Requirement: Peserta yang sudah deposit tidak dihapus sepihak
Karena setiap baris peserta merepresentasikan deposit on-chain terverifikasi
dan kontrak tidak menyediakan refund per-user, sistem MUST TIDAK menyediakan
endpoint untuk menghapus peserta secara sepihak (yang akan menyebabkan dana
peserta terkunci tanpa jalur refund). Endpoint `POST /api/events/:id/remove-participant`
MUST dihapus, dan UI MUST tidak menampilkan aksi hapus peserta di roster.

#### Scenario: Endpoint remove-participant tidak tersedia
- **WHEN** `POST /api/events/:id/remove-participant` dipanggil
- **THEN** route tidak ada (404), bukan menghapus baris peserta

#### Scenario: Roster tidak menampilkan tombol hapus
- **WHEN** creator membuka roster pada fase setup
- **THEN** tidak ada tombol "DEL" / aksi hapus peserta
