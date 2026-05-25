## ADDED Requirements

### Requirement: Mode FFA dapat dipilih dan mem-persist tanpa bracket
Endpoint `POST /api/events/:id/select-game-mode` MUST menerima `game_mode === "ffa"`
sebagai mode sah, mem-persist `game_mode = "ffa"` pada event, dan MUST NOT membuat baris
bracket apa pun untuk FFA. Respons MUST melaporkan `matches_count: 0` tanpa error.

#### Scenario: Creator memilih FFA
- **GIVEN** event berstatus `setup` dengan roster terkunci
- **WHEN** creator memanggil `select-game-mode` dengan `game_mode: "ffa"`
- **THEN** `event.game_mode` menjadi `"ffa"`
- **AND** tidak ada baris bracket yang dibuat untuk event tersebut
- **AND** respons mengembalikan `matches_count: 0` tanpa error

### Requirement: `/start` melewati syarat bracket untuk FFA
Endpoint `POST /api/events/:id/start` MUST mengizinkan event `game_mode === "ffa"`
beralih ke `active` tanpa adanya baris bracket. Untuk FFA, sistem MUST NOT menolak
karena "draf bagan belum di-generate" dan MUST NOT menjalankan validasi slot bracket
1v1. Validasi umum lain (status `setup`, roster terkunci, minimal 2 peserta) tetap
berlaku untuk FFA.

#### Scenario: Start FFA tanpa bracket berhasil
- **GIVEN** event `game_mode = "ffa"` berstatus `setup`, roster terkunci, dengan ≥ 2
  peserta dan 0 bracket
- **WHEN** creator memanggil `/start`
- **THEN** status event menjadi `active`
- **AND** tidak ada error terkait bracket kosong

#### Scenario: Guard bracket tetap berlaku untuk 1v1
- **GIVEN** event `game_mode = "1v1"` berstatus `setup`, roster terkunci, dengan ≥ 2
  peserta dan 0 bracket
- **WHEN** creator memanggil `/start`
- **THEN** permintaan ditolak dengan error bahwa draf bagan belum di-generate
- **AND** status event tetap `setup`

#### Scenario: Syarat minimal peserta tetap berlaku untuk FFA
- **GIVEN** event `game_mode = "ffa"` berstatus `setup`, roster terkunci, dengan hanya 1
  peserta
- **WHEN** creator memanggil `/start`
- **THEN** permintaan ditolak karena peserta kurang dari 2
- **AND** status event tetap `setup`

### Requirement: UI menyediakan FFA sebagai mode dan jalur start
Halaman detail event MUST menampilkan opsi `ffa` pada selector `select-game-mode`, dan
tipe state mode terpilih MUST mencakup `"ffa"`. Karena FFA tak memiliki draf bracket,
UI MUST menyediakan aksi untuk memulai turnamen FFA langsung (mem-persist mode lalu
memanggil `/start`) alih-alih hanya men-generate draf bracket.

#### Scenario: Creator memilih FFA lalu memulai dari UI
- **WHEN** creator memilih `ffa` pada selector mode dan menekan tombol start
- **THEN** UI mem-persist `game_mode = "ffa"` lalu memanggil `/start`
- **AND** setelah sukses, event berpindah ke tampilan state `active` FFA (input top-3
  winner)

### Requirement: FFA mencapai status akhir lewat top-3 dan voting
Setelah FFA `active`, submit top-3 winner MUST memindahkan event ke `voting`, dan jalur
penyelesaian (konsensus normal maupun timeout) MUST membawa event ke status akhir
(`ended`/`disputed`) sama seperti mode lain — sehingga FFA tak pernah macet di `setup`
atau `active`.

#### Scenario: FFA dari active ke voting
- **GIVEN** event FFA berstatus `active`
- **WHEN** creator submit daftar winner (1-3 alamat) lalu menutup babak (`/end`)
- **THEN** status event menjadi `voting`
- **AND** event tunduk pada resolusi konsensus yang sama dengan mode lain
