## Context

Kontrak `BitPactVault` dibuat pada era awal proyek saat masih memakai cUSD
(Celo Dollar). Migrasi ke USDC native sudah dilakukan di level konfigurasi
& UI (lihat openspec/specs/usdc-integration), tetapi identifier internal di
Solidity tidak pernah disentuh. Saat ini:

- `IERC20 public immutable cUSD` — di-set di konstruktor dari parameter `_cUSD`.
- Variable ini dipakai 4 kali di kontrak: konstruktor, `register` (line 110),
  `distributePrize` (line 150), `emergencyRefund` (line 176).
- Karena `public`, Solidity auto-generates getter `function cUSD() returns (address)`.
- Test menggunakan helper sendiri, tidak membaca getter `cUSD()` langsung.
- Backend (`backend/lib/blockchain.js`) tidak memuat getter `cUSD()` di ABI;
  hanya fungsi mutating + `getEventInfo` + `isParticipant`.
- Frontend (`frontend/src/constants/index.ts`) **memuat** getter `cUSD()`
  di VAULT_ABI (line 22-27) tetapi tidak pernah memanggilnya. Dead entry.

USDC native Celo (alamat lihat openspec/specs/usdc-integration) adalah token
yang sama dengan USDC mainnet Ethereum — diatur Circle, bisa blacklist alamat.
Kontrak USDC mainnet sudah pernah mem-blacklist alamat (mis. sanksi OFAC).
Dampak ke `distributePrize`/`emergencyRefund`: bila `transfer` ke alamat
ter-blacklist gagal, `if (!success) revert TransferFailed();` → seluruh tx
batal → dana tetap di vault.

## Goals / Non-Goals

**Goals:**
- Identifier kontrak konsisten dengan branding "USDC".
- Risiko blacklist USDC ter-dokumentasi DAN ter-tes (characterization).
- Alamat USDC di README cocok dengan openspec/specs/usdc-integration (single
  source of truth).

**Non-Goals:**
- Refactor pull-payment (pisahkan di-roadmap, post-hackathon).
- Mengubah ABI fungsi mutating (akan break frontend/backend).
- Redeploy kontrak production (rename ini tidak butuh redeploy darurat).
- Mengganti currency ke CELO native (sudah diputuskan tetap USDC).

## Decisions

### D1: Rename `cUSD` → `usdc` (lower-case)
Solidity convention untuk state variable adalah camelCase lower-first.
`IERC20 public immutable cUSD` → `IERC20 public immutable usdc`. Parameter
konstruktor `_cUSD` → `_usdc`. NatSpec & komentar diperbarui ke "USDC".

**Alternatif ditolak**:
- `USDC` UPPERCASE: dianggap konstanta (immutable), tetapi konvensi Solidity
  modern adalah constant/immutable pakai SCREAMING_SNAKE_CASE. `usdc`
  camelCase lebih lazim dipakai (lihat Compound, Aave, Uniswap convention).
  Pilih `usdc` agar konsisten dengan `admin` (lowercase) yang juga immutable.

### D2: Getter publik berubah dari `cUSD()` ke `usdc()`
Konsekuensi dari D1. Audit pemanggil:
- Backend: tidak pakai.
- Frontend constants: ada di ABI tapi tidak ada pemanggil. Aman update.
- Foundry test: cek apakah ada `vault.cUSD()` literal.

### D3: Dokumentasi risiko blacklist + characterization test
Tambah section di `contracts/README.md`:

```md
## Known Risks

### USDC Blacklist (Whole-Batch Revert)

`distributePrize` and `emergencyRefund` perform `usdc.transfer()` in a loop and
revert the entire transaction on any single failure. USDC (Circle native) can
blacklist addresses; if a winner or participant is blacklisted, the whole batch
fails and funds remain locked in the vault.

**Mitigations available today**
- Backend `settleEvent` records the failure as `settlement_failed` and exposes
  `POST /api/events/:id/retry-settlement` (see `escrow-payout-integrity` spec).
- Creator can edit winners during `disputed` state via `/appeal`, avoiding a
  blacklisted address.

**Planned (post-hackathon)**: refactor to pull-payment (`claim()` per winner)
so a single bad address cannot DoS the rest.
```

Characterization test (Foundry):
```solidity
function test_flow_blacklistedRecipient_revertsBatchTransfer() public {
    // Setup vault + 3 participants register normally.
    // Replace token with a mock that reverts on transfer to a specific address.
    // Call distributePrize with [A, B, C] where B is blacklisted.
    // Assert: tx reverts; vault.distributed() stays false; balances unchanged.
}
```

Test pakai `MockBlacklistedUSDC` (file baru di `contracts/test/mocks/`) yang
extends ERC20 minimal dan revert `transfer` ke alamat blacklisted.

### D4: README alamat USDC = openspec sebagai sumber kebenaran
README saat ini menulis di section "Alamat-Alamat Kontrak & Konfigurasi
Jaringan":

```
Celo Mainnet (Official Address): 0x765DE816845861e75A25fCA122bb6898B8B1282a
Celo Sepolia / Alfajores Testnet: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
```

Yang benar (per openspec/specs/usdc-integration/spec.md & kode):

```
Celo Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
Celo Sepolia: 0x01C5C0122039549AD1493B8220cABEdD739BC44E
```

Update README sesuai. (Alamat lama yang ditulis sebagai "mainnet" =
`0x765DE8...` adalah cUSD lama — bukan USDC. Confusion ini yang ingin dihilangkan.)

### D5: Redeploy Sepolia di change ini, mainnet di change `mainnet-cutover`
Konteks: kontrak mainnet `0xC2375c25...` sudah deploy tetapi **belum ada
event / dana live**. Aman untuk redeploy ke alamat baru.

Walau fungsi mutating + view utama (createEvent, register, distribute, refund,
getEventInfo, isParticipant) keeps the same selector dan signature setelah
rename, kita memilih **redeploy** karena:

- Konsistensi source ↔ deployed bytecode (audit nanti tidak bingung).
- Getter `cUSD()` (selector `0xfb0a47b6`) berubah jadi `usdc()` (selector
  `0x3e413bee`) — meskipun tidak ada caller eksternal saat ini, ABI ter-export
  ke frontend constants. Lebih bersih kalau on-chain match source.
- Storage layout TIDAK berubah (slot 0 admin, slot 1 usdc/cUSD, dst.
  dialokasikan berdasar urutan deklarasi). Aman.

**Scope change ini**: Sepolia redeploy + verify smoke test. Mainnet redeploy
adalah tanggung jawab change terpisah `mainnet-cutover` yang dieksekusi
setelah semua 5 spec lain landed.

**Update yang perlu di-script deploy**:
```diff
// contracts/script/Deploy.s.sol
- address constant CUSD_ALFAJORES = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
+ // USDC native addresses per openspec/specs/usdc-integration:
+ //   Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
+ //   Sepolia: 0x01C5C0122039549AD1493B8220cABEdD739BC44E

  function run() external {
      address adminWallet = vm.envAddress("ADMIN_WALLET_ADDRESS");
-     address cUSDToken = vm.envAddress("CUSD_TOKEN_ADDRESS");
+     address usdcToken = vm.envAddress("USDC_TOKEN_ADDRESS");

      vm.startBroadcast();
-     BitPactVault vault = new BitPactVault(adminWallet, cUSDToken);
+     BitPactVault vault = new BitPactVault(adminWallet, usdcToken);
      console.log("BitPactVault deployed at:", address(vault));
      console.log("Admin wallet:", adminWallet);
-     console.log("cUSD token:", cUSDToken);
+     console.log("USDC token:", usdcToken);
      vm.stopBroadcast();
  }
```

## Risks / Trade-offs

- **Kontrak deployed di mainnet masih punya getter `cUSD()`** → backend/frontend
  tidak membaca getter ini, jadi tidak break. Konsumen pihak ketiga (jika ada
  yang baca getter) akan break — dianggap acceptable karena kontrak ini bukan
  public library.
- **Audit eksternal nanti** → reviewer akan mendapati identifier `usdc` yang
  jelas, bukan `cUSD` yang misleading. Net positive.
- **Test characterization blacklist** → menambah waktu CI ~beberapa ratus ms.
  Worth it untuk dokumentasi risiko.

## Migration Plan

### Code rename
1. Buat `contracts/test/mocks/MockBlacklistedUSDC.sol`.
2. Update `BitPactVault.sol` (rename + komentar).
3. Update test files yang menyentuh getter `cUSD()` (jika ada).
4. Update `contracts/script/Deploy.s.sol` (env var name + comments).
5. Update `frontend/src/constants/index.ts` ABI entry `cUSD` → `usdc`.
6. Tambah `test_flow_blacklistedRecipient_revertsBatchTransfer` +
   `test_flow_blacklistedRecipient_revertsBatchRefund` di `BitPactVaultFlow.t.sol`.
7. Update `contracts/README.md` dengan Known Risks section.
8. Update `README.md` alamat USDC.

### Smoke test Sepolia
9. Run `forge test` (target: 27 contract tests pass — 25 lama + 2 baru).
10. Run `cd backend && npm test` — 88 tests harus tetap hijau.
11. Set env: `USDC_TOKEN_ADDRESS=0x01C5C0122039549AD1493B8220cABEdD739BC44E`
    (USDC native Celo Sepolia).
12. Run `forge script script/Deploy.s.sol:DeployBitPactVault --rpc-url
    $CELO_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY -vvvv`.
    Catat alamat vault baru.
13. Update `backend/.env` dan `frontend/.env` di environment dev /
    staging dengan alamat vault Sepolia yang baru.
14. Smoke test E2E di Sepolia: create event → register (test wallet) →
    start → vote → settle.
15. Verifikasi: tx `register` ke vault baru sukses, `getEventInfo`
    mengembalikan data yang diharapkan.

### Mainnet redeploy
**Out of scope change ini.** Lihat change `mainnet-cutover` yang
dieksekusi setelah semua 5 spec lain (termasuk yang ini) landed.

Rollback (untuk change ini):
- Kalau ada masalah sebelum cutover mainnet: revert PR + restore env ke
  alamat vault Sepolia lama. Tidak ada migrasi DB. Mainnet kontrak lama
  belum disentuh sama sekali.

## Open Questions

- Apakah perlu menambah event `BlacklistDetected` di kontrak? **Tidak untuk
  saat ini** — recovery via `settlement_failed` di backend sudah memberikan
  observability cukup.
