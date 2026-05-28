## Why

Keputusan currency telah dikunci: **bitPact tetap memakai USDC native Celo**
sebagai token escrow (stabilitas hadiah, kompatibilitas MiniPay, kontrak sudah
ter-deploy & teruji). Tapi penamaan internal di kontrak masih `cUSD` dan
alamat USDC yang dipublikasikan di README **berbeda** dari sumber kebenaran
spec `usdc-integration` & kode (temuan N3 & N6 di [AUDIT.md](../../../AUDIT.md)).

Masalah konkret hari ini:

1. **`BitPactVault.sol` masih bernama `cUSD`**: state variable `IERC20 public
   immutable cUSD` ([Vault.sol:28](../../../contracts/src/BitPactVault.sol#L28)),
   konstruktor parameter `_cUSD`, dan beberapa komentar/NatSpec masih merujuk
   cUSD ([Vault.sol:8](../../../contracts/src/BitPactVault.sol#L8),
   [Vault.sol:67-73](../../../contracts/src/BitPactVault.sol#L67-L73)). Confusing
   untuk audit pihak ketiga dan kontradiksi dengan branding & openspec
   `usdc-integration`.
2. **Risiko USDC blacklist tidak terdokumentasi**: `distributePrize` &
   `emergencyRefund` melakukan loop transfer dalam satu transaksi
   ([Vault.sol:149-152](../../../contracts/src/BitPactVault.sol#L149-L152) &
   [Vault.sol:175-179](../../../contracts/src/BitPactVault.sol#L175-L179)).
   USDC native bisa mem-blacklist alamat — jika 1 peserta/pemenang
   ter-blacklist, **seluruh** distribusi/refund revert.
3. **Alamat USDC di README salah/inkonsisten**: README menampilkan
   - Mainnet `0x765DE816845861e75A25fCA122bb6898B8B1282a` (itu **cUSD lama**, bukan USDC)
   - Sepolia `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` (tidak cocok dengan
     env example & frontend constants `0x01C5C0122039549AD1493B8220cABEdD739BC44E`)
   - Sementara openspec/specs/usdc-integration/spec.md mencantumkan
     `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (Mainnet) dan
     `0x01C5C0122039549AD1493B8220cABEdD739BC44E` (Sepolia).

## What Changes

- **Rename internal kontrak** (NON-BREAKING ABI untuk fungsi mutating):
  state `IERC20 public immutable cUSD` → `IERC20 public immutable usdc`,
  parameter konstruktor `_cUSD` → `_usdc`, NatSpec & komentar diperbarui
  ke "USDC". `frontend/src/constants/index.ts` ABI getter `cUSD()` → `usdc()`
  (BREAKING bila ada caller yang membaca getter ini — kita audit dan
  konfirmasi tidak ada).
- **Dokumentasi risiko blacklist**: tambah section "Known Risks" di
  `contracts/README.md` yang menjelaskan: USDC bisa blacklist alamat,
  satu blacklist menyebabkan whole-batch revert, mitigasi jangka pendek
  (pre-flight check), refactor pull-payment di-roadmap-kan.
- **Test karakterisasi**: tambah Foundry test yang mensimulasikan transfer
  gagal di tengah loop → assert keseluruhan transaksi revert (mendokumentasikan
  perilaku saat ini sebagai test).
- **Sinkronisasi alamat USDC**: README dijadikan match dengan
  `openspec/specs/usdc-integration/spec.md` (sumber kebenaran). Mainnet
  `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`, Sepolia
  `0x01C5C0122039549AD1493B8220cABEdD739BC44E`. Backend admin wallet &
  vault address di README direview ulang.

## Capabilities

### Modified Capabilities
- `usdc-integration`: tetap berlaku; clarification bahwa kontrak `BitPactVault`
  menyebut tokennya `usdc` (huruf kecil) sebagai nama variable dan **bukan**
  `cUSD`. Spec eksisting tidak menyebut nama variable, jadi tidak ada konflik
  requirement — kita tambah requirement penamaan untuk menutup gap.

### New Capabilities
- `usdc-blacklist-risk-acknowledged`: Risiko blacklist USDC didokumentasikan
  secara eksplisit di repo, diuji lewat characterization test, dan jalur
  recovery (settlement_failed + retry) sudah disediakan.

## Impact

- **Contract**:
  - `contracts/src/BitPactVault.sol`: rename `cUSD` → `usdc` di state, parameter
    konstruktor, NatSpec, komentar. Tidak ada perubahan logic.
  - `contracts/test/BitPactVault.t.sol` & `BitPactVaultFlow.t.sol`: update test
    yang membaca `vault.cUSD()` (jika ada) menjadi `vault.usdc()`.
  - `contracts/test/BitPactVaultFlow.t.sol`: tambah test baru
    `test_flow_blacklistedRecipient_revertsBatchTransfer` yang memakai mock
    token revert-on-transfer untuk satu alamat tertentu.
- **Backend**:
  - `backend/lib/blockchain.js`: VAULT_ABI hanya berisi fungsi yang dipakai
    (createEvent/distribute/refund/getEventInfo/isParticipant) — TIDAK
    membaca `cUSD()`/`usdc()`, jadi tidak perlu update. Verifikasi.
- **Frontend**:
  - `frontend/src/constants/index.ts`: VAULT_ABI saat ini menyertakan fungsi
    `cUSD()` (lines 23-27). Update ke `usdc()`. Audit pemanggil — saat ini
    **tidak ada** pemanggil getter ini di codebase; bila masih ada, hapus.
- **Docs / config**:
  - `README.md`: update alamat USDC mainnet & testnet sesuai
    openspec/specs/usdc-integration/spec.md.
  - `contracts/README.md`: tambah section "Known Risks: USDC blacklist".
- **Tests**:
  - Forge: +1 test characterization blacklist behavior.
  - Backend: tidak berubah (88 test tetap hijau).
- **Deployment**:
  - Source rename **mengubah bytecode** (auto-generated getter `cUSD()` →
    `usdc()` punya function selector berbeda). Walau fungsi mutating
    (`createEvent`, `register`, `distributePrize`, `emergencyRefund`) +
    view (`getEventInfo`, `isParticipant`, `eventExists`) tetap sama
    selector & signature-nya, source-deployed inconsistency tidak bisa
    diterima untuk kontrak yang akan dipakai mainnet (audit + operasional).
  - **Skenario yang berlaku** (per konfirmasi user): kontrak mainnet
    `0xC2375c25...` sudah deploy tetapi belum ada event live → aman
    redeploy ke alamat baru.
  - **Redeploy SEPOLIA** sebagai bagian change ini (smoke test rename).
  - **Redeploy MAINNET** dilakukan terpisah di change `mainnet-cutover`
    sebagai langkah final setelah semua 5 spec lain landed.
  - Update `contracts/script/Deploy.s.sol` untuk membaca env
    `USDC_TOKEN_ADDRESS` (bukan `CUSD_TOKEN_ADDRESS`) dan hilangkan
    konstanta `CUSD_ALFAJORES`.
  - Storage layout tidak berubah (slot dialokasikan based on urutan deklarasi),
    sehingga test eksisting tetap valid.
