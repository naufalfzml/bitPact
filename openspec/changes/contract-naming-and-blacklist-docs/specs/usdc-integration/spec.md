## ADDED Requirements

### Requirement: Identifier kontrak konsisten dengan USDC
Smart contract `BitPactVault` MUST menggunakan identifier `usdc` (lower-case
camelCase) untuk state variable yang menyimpan referensi ke token escrow,
parameter konstruktor, dan semua komentar/NatSpec. Identifier `cUSD` tidak
boleh digunakan sebagai nama variable / parameter / komentar di file
`contracts/src/BitPactVault.sol`.

#### Scenario: Audit identifier kontrak
- **WHEN** reviewer memeriksa `contracts/src/BitPactVault.sol`
- **THEN** state variable token ditulis `IERC20 public immutable usdc`
- **AND** parameter konstruktor bernama `_usdc`
- **AND** NatSpec & komentar merujuk "USDC" (bukan "cUSD")

### Requirement: Risiko blacklist USDC ter-dokumentasi & ter-tes
Repo MUST mendokumentasikan secara eksplisit risiko "whole-batch revert" dari
USDC blacklist di `contracts/README.md` (atau dokumen `contracts/` setara),
mencakup penjelasan risiko, mitigasi yang ada (`settlement_failed` status +
retry endpoint, alur `appeal`), dan rencana refactor pull-payment. Test suite
Foundry MUST mengandung minimal satu characterization test yang mendokumentasikan
perilaku "blacklisted recipient menyebabkan distribusi/refund batal".

#### Scenario: Distribusi dengan satu pemenang blacklisted
- **GIVEN** 3 peserta terdaftar dan 1 di antaranya ter-blacklist oleh mock USDC
- **WHEN** `distributePrize` dipanggil dengan ketiga alamat
- **THEN** transaksi revert
- **AND** flag `distributed` tetap `false`
- **AND** saldo USDC peserta lain tidak berubah

#### Scenario: Refund dengan satu peserta blacklisted
- **GIVEN** 3 peserta terdaftar dan 1 ter-blacklist
- **WHEN** `emergencyRefund` dipanggil
- **THEN** transaksi revert
- **AND** dana tetap tertahan di vault
- **AND** event tetap belum `distributed`

#### Scenario: Dokumentasi tersedia di repo
- **WHEN** reader membuka `contracts/README.md`
- **THEN** ada section "Known Risks" yang menjelaskan blacklist whole-batch revert
- **AND** ada referensi ke status `settlement_failed` + endpoint retry sebagai
  mitigasi yang ada

### Requirement: Alamat USDC di README cocok dengan spec sumber
File `README.md` proyek MUST mencantumkan alamat USDC native untuk Celo
Mainnet dan Celo Sepolia yang **sama persis** dengan yang ditetapkan di
`openspec/specs/usdc-integration/spec.md`. Tidak boleh ada inkonsistensi
alamat antara README, openspec, `frontend/src/constants/index.ts`,
`frontend/.env`, dan `backend/.env.example`.

#### Scenario: README sinkron dengan spec
- **GIVEN** `openspec/specs/usdc-integration/spec.md` mencantumkan
  Mainnet `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` dan
  Sepolia `0x01C5C0122039549AD1493B8220cABEdD739BC44E`
- **WHEN** reader membuka `README.md`
- **THEN** alamat Mainnet & Sepolia tertulis identik (case-insensitive)
- **AND** tidak ada alamat lama `0x765DE816845861e75A25fCA122bb6898B8B1282a`
  (itu cUSD, bukan USDC) atau alamat lain selain yang ditetapkan spec
