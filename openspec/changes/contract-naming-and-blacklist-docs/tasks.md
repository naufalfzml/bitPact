## 1. Audit pemanggil getter `cUSD()`

- [x] 1.1 `grep -rn "cUSD()" contracts/ backend/ frontend/` — konfirmasi tidak ada
      pemanggil getter eksternal selain ABI dead-entry di frontend constants.
- [x] 1.2 Catat hasil audit di bawah commit message rename agar reviewer paham
      "no external caller".

## 2. Rename `cUSD` → `usdc` di kontrak

- [x] 2.1 [contracts/src/BitPactVault.sol](../../../contracts/src/BitPactVault.sol):
      `IERC20 public immutable cUSD` → `IERC20 public immutable usdc`.
- [x] 2.2 Konstruktor: parameter `address _cUSD` → `address _usdc`; require
      `_usdc != address(0)` (pesan "usdc zero").
- [x] 2.3 Semua pemanggil internal `cUSD.transferFrom(...)`, `cUSD.transfer(...)` →
      `usdc.transferFrom(...)`, `usdc.transfer(...)` (3 lokasi: register, distribute,
      refund).
- [x] 2.4 Komentar & NatSpec: ganti "cUSD" → "USDC" di header file (line 8),
      konstruktor NatSpec (line 67-73), dan komentar `register`/inline.

## 3. Update test Foundry

- [x] 3.1 `cd contracts && forge build` — pastikan compile sukses tanpa warning baru.
- [x] 3.2 Cek test file: `grep -n "cUSD" contracts/test/*.sol`. Update pemanggil
      `vault.cUSD()` (jika ada) → `vault.usdc()`. Update nama parameter di setup
      helper.
- [x] 3.3 `cd contracts && forge test` — pastikan 25 test eksisting tetap hijau.

## 4. Mock token & characterization test blacklist

- [x] 4.1 Buat `contracts/test/mocks/MockBlacklistedUSDC.sol` — ERC20 minimal
      yang menerima daftar `blacklisted` di konstruktor dan revert `transfer`
      ke address di daftar.
- [x] 4.2 Tambah `test_flow_blacklistedRecipient_revertsBatchDistribute` di
      [contracts/test/BitPactVaultFlow.t.sol](../../../contracts/test/BitPactVaultFlow.t.sol):
      - Deploy vault dengan mock token.
      - 3 peserta register.
      - Blacklist 1 address.
      - Panggil `distributePrize` dengan 3 winners (termasuk yang ter-blacklist).
      - Assert: revert; `vault.getEventInfo(...).distributed === false`; saldo
        peserta lain tidak berubah.
- [x] 4.3 Tambah test analog `test_flow_blacklistedRecipient_revertsBatchRefund`:
      `emergencyRefund` dengan satu peserta blacklisted → revert.
- [x] 4.4 `forge test` — 27 test pass (25 lama + 2 baru). Verified.

## 5. Update Deploy script

- [x] 5.1 Di [contracts/script/Deploy.s.sol](../../../contracts/script/Deploy.s.sol):
      - Hapus konstanta `CUSD_ALFAJORES`.
      - Tambah komentar daftar alamat USDC (mainnet & sepolia) per
        `openspec/specs/usdc-integration`.
      - `vm.envAddress("CUSD_TOKEN_ADDRESS")` → `vm.envAddress("USDC_TOKEN_ADDRESS")`.
      - Rename variable lokal `cUSDToken` → `usdcToken`.
      - Update log `"cUSD token:"` → `"USDC token:"`.
- [x] 5.2 Update `backend/.env.example` — variable sudah `USDC_TOKEN_ADDRESS` (no change needed).

## 6. Update frontend ABI constants

- [x] 6.1 Di [frontend/src/constants/index.ts](../../../frontend/src/constants/index.ts):
      ABI entry `name: "cUSD"` (line 22-27) → `name: "usdc"`.
      Constructor input parameter `_cUSD` → `_usdc` agar konsisten.
- [x] 6.2 `cd frontend && npm run build` — pastikan type check lulus.

## 7. Update README alamat USDC

> **Deferred to `mainnet-cutover` change** (per user decision: "ga perlu update
> readme, buat apa? kan testnet"). README USDC token addresses + mainnet vault
> address akan di-sync sekaligus saat mainnet cutover, agar README selalu
> mencerminkan state mainnet kanonik (bukan testnet WIP).

- [ ] 7.1 *(deferred to mainnet-cutover)* Di [README.md](../../../README.md) section "Token USDC (Stablecoin Celo)":
      - Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
      - Sepolia: `0x01C5C0122039549AD1493B8220cABEdD739BC44E`
      - Hapus referensi "Alfajores" yang berbagi alamat dengan Sepolia (mereka
        berbeda chain). Jika perlu alfajores, sebut alamat resmi terpisah.
- [ ] 7.2 *(deferred to mainnet-cutover)* Cross-check dengan [openspec/specs/usdc-integration/spec.md](../../specs/usdc-integration/spec.md)
      — sumber kebenaran. Konsisten? Iya.
- [ ] 7.3 *(deferred to mainnet-cutover)* Jangan update `VAULT_CONTRACT_ADDRESS` Mainnet di README dulu —
      itu akan di-update di change `mainnet-cutover`.

## 8. Dokumentasi risiko blacklist

- [x] 8.1 Buat / update `contracts/README.md` dengan section "Known Risks" yang
      menjelaskan whole-batch revert risk, mitigasi (`settlement_failed` +
      retry, `appeal` flow), dan rencana refactor pull-payment.
- [x] 8.2 Tambah cross-reference link ke `escrow-payout-integrity` archive dan
      ke change ini.

## 9. Verifikasi local

- [x] 9.1 `cd contracts && forge test -vv` — 27 test pass.
- [x] 9.2 `cd backend && npm test` — 63 test pass (turun dari 88 karena ada test
      yang di-update di change sebelumnya; tidak ada test backend yang diubah di sini).
- [x] 9.3 `cd frontend && npm run build` — type check + build sukses.

## 10. Redeploy & smoke test Sepolia

> **User-driven manual step** (per user decision: "saya deploy manual aja").
> Tasks di-leave unchecked sampai user konfirmasi deploy + smoke selesai.

- [ ] 10.1 Set env Sepolia: `USDC_TOKEN_ADDRESS=0x01C5C0122039549AD1493B8220cABEdD739BC44E`,
      `ADMIN_WALLET_ADDRESS=<backend admin>`, `CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org`,
      `DEPLOYER_PRIVATE_KEY=<deployer key>`.
- [ ] 10.2 Run `forge script script/Deploy.s.sol:DeployBitPactVault --rpc-url
      $CELO_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY -vvvv`.
      Catat alamat vault baru.
- [ ] 10.3 Update `backend/.env` & `frontend/.env` (Sepolia / dev / staging):
      `VAULT_CONTRACT_ADDRESS=<alamat baru>`.
- [ ] 10.4 Restart backend dev server. Buka frontend dev. Jalankan smoke
      E2E: create event → register (test wallet kedua) → lock roster →
      pilih mode 1v1 → start → input pemenang → vote → distribute → cek
      saldo USDC pemenang bertambah di Blockscout Sepolia.
- [ ] 10.5 Catat alamat vault baru di catatan internal (akan dimasukkan ke
      docs setelah `mainnet-cutover` selesai).

## 11. Commit plan (per logical unit)

- [x] 11.1 `refactor(contracts): rename cUSD storage and parameter to usdc` — `cb53b54`
- [x] 11.2 `test(contracts): characterize whole-batch revert on USDC blacklist` — `5e90166`
- [x] 11.3 `chore(contracts): update Deploy.s.sol to use USDC env name` — `2b47df1`
- [x] 11.4 `chore(frontend): align VAULT_ABI getter name with contract (usdc)` — `35fac0d`
- [ ] 11.5 *(skipped — deferred to mainnet-cutover)* `docs: sync USDC token addresses with usdc-integration spec`
- [x] 11.6 `docs(contracts): document USDC blacklist risk and recovery path` — `2a4d63c`
- [ ] 11.7 *(no commit yet)* Sepolia redeploy + smoke test — pending user.
