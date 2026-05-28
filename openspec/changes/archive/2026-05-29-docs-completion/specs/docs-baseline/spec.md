## ADDED Requirements

### Requirement: Dokumentasi arsitektur tersedia & sinkron
Repository MUST menyediakan file `docs/ARCHITECTURE.md` yang berisi:
- Komponen utama (Smart Contract, Backend, Frontend, Database) dan tanggung
  jawab masing-masing.
- Diagram Mermaid yang menggambarkan komunikasi antar komponen.
- State machine Mermaid event lifecycle yang mencakup status `setup`,
  `active`, `voting`, `ended`, `disputed`, dan `settlement_failed`.
- Trust model singkat (admin wallet, creator authorization).
- Link relatif ke openspec/specs/ yang relevan untuk requirement formal.

#### Scenario: Reviewer membuka ARCHITECTURE.md
- **WHEN** reviewer membuka file
- **THEN** ada diagram Mermaid yang ter-render
- **AND** state `settlement_failed` muncul di state machine
- **AND** ada link ke minimal satu file di `openspec/specs/`

### Requirement: Smart contract reference tersedia
Repository MUST menyediakan file `docs/SMART-CONTRACT.md` yang menggambarkan
fungsi-fungsi `BitPactVault`:
- Alamat deployed (mainnet & sepolia) sinkron dengan README & openspec.
- Daftar fungsi mutating + parameter + revert reasons + event yang di-emit.
- Daftar fungsi view.
- Referensi ke risiko (Known Risks USDC blacklist).
- Link ke source file `contracts/src/BitPactVault.sol`.

#### Scenario: Membaca referensi register
- **WHEN** reader membuka section `register`
- **THEN** terlihat signature `function register(bytes32 eventId)`
- **AND** revert reasons `EventNotFound`, `EventAlreadyDistributed`,
  `AlreadyRegistered`, `InvalidTicketPrice`, `TransferFailed` tercantum
- **AND** event `ParticipantRegistered` disebut

### Requirement: REST API reference tersedia & sinkron dengan kode
Repository MUST menyediakan file `docs/API.md` yang mendokumentasikan
seluruh endpoint REST aktif di backend, dengan struktur konsisten (path,
method, body / query, status codes, response shape, catatan auth).
Endpoint yang sudah dihapus (mis. `/leaderboard/reputation`) TIDAK boleh
ada di dokumen.

#### Scenario: Endpoint yang dihapus tidak ada di docs
- **GIVEN** backend tidak lagi memuat `GET /api/events/leaderboard/reputation`
- **WHEN** reviewer mencari endpoint tersebut di `docs/API.md`
- **THEN** endpoint tidak ditemukan

#### Scenario: Endpoint baru `my_vote` terdokumentasi
- **GIVEN** `GET /api/events/:id` menerima query `?wallet=`
- **THEN** dokumen mencantumkan parameter optional `wallet` + behavior
  field `my_vote` di response

### Requirement: docs/README.md bersih dari placeholder yang aktif
File `docs/README.md` MUST tidak menampilkan tag "(belum tersedia)" untuk
dokumen yang sudah dibuat (`ARCHITECTURE.md`, `SMART-CONTRACT.md`, `API.md`).
Dokumen yang belum lengkap (DATABASE / GAME-MODES / CONSENSUS / SETUP)
MUST tetap memiliki entry index dengan stub link aktif (h1 + TODO), bukan
link broken.

#### Scenario: Index docs/README.md
- **WHEN** reader membuka `docs/README.md`
- **THEN** entry untuk ARCHITECTURE / SMART-CONTRACT / API memiliki link relatif aktif
- **AND** entry untuk DATABASE / GAME-MODES / CONSENSUS / SETUP punya link
  ke stub (bukan placeholder mati)
