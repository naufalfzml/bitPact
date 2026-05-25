## ADDED Requirements

### Requirement: Setiap baris peserta wajib punya deposit on-chain terverifikasi
Sistem MUST NOT membuat baris pada tabel `participants` tanpa verifikasi deposit
on-chain. Cabang bypass `tx_hash === "social-connect-invite"` di endpoint register MUST
dihapus seluruhnya. Verifikasi on-chain (Blockscout, RPC, dan `isParticipant`) MUST
berlaku untuk SEMUA registrasi tanpa pengecualian.

#### Scenario: Registrasi tanpa deposit terverifikasi ditolak
- **WHEN** seseorang memanggil `/register` dengan `tx_hash` yang tidak dapat
  diverifikasi on-chain (termasuk nilai placeholder seperti `social-connect-invite`)
- **THEN** backend menolak permintaan dan TIDAK membuat baris `participants`

#### Scenario: Invariant peserta
- **GIVEN** sebuah event dengan peserta terdaftar
- **THEN** setiap baris `participants` memiliki deposit on-chain terverifikasi
  (`isParticipant === true` untuk alamat tersebut)

### Requirement: Social Connect hanya mengisi whitelist
Untuk turnamen invite-only, alur Social Connect MUST hanya menambahkan alamat hasil
lookup ke whitelist event (`POST /api/events/:id/whitelist`). Sistem MUST NOT
memasukkan alamat yang diundang ke roster (`participants`) sebelum yang bersangkutan
melakukan `register` + deposit on-chain secara normal.

#### Scenario: Creator mengundang via Social Connect
- **WHEN** creator melakukan lookup Social Connect dan menambahkan alamat hasilnya
- **THEN** alamat tersebut masuk ke whitelist event saja
- **AND** tidak ada baris `participants` yang dibuat untuk alamat itu

#### Scenario: Peserta yang diundang mendaftar
- **GIVEN** sebuah alamat ada di whitelist event invite-only
- **WHEN** peserta tersebut mendaftar
- **THEN** ia tetap harus approve + deposit on-chain sebelum menjadi peserta
- **AND** baris `participants` baru dibuat setelah deposit on-chain terverifikasi

#### Scenario: Frontend tidak lagi mendaftarkan invite ke roster
- **WHEN** halaman detail event menangani hasil lookup Social Connect
- **THEN** UI memakai jalur whitelist (`handleAddToWhitelist`)
- **AND** tidak memanggil `/register` dengan `tx_hash: "social-connect-invite"`
