## 1. Audit pemanggil getter `cUSD()`

- [ ] 1.1 `grep -rn "cUSD()" contracts/ backend/ frontend/` — konfirmasi tidak ada
      pemanggil getter eksternal selain ABI dead-entry di frontend constants.
- [ ] 1.2 Catat hasil audit di bawah commit message rename agar reviewer paham
      "no external caller".

## 2. Rename `cUSD` → `usdc` di kontrak

- [ ] 2.1 [contracts/src/BitPactVault.sol](../../../contracts/src/BitPactVault.sol):
      `IERC20 public immutable cUSD` → `IERC20 public immutable usdc`.
- [ ] 2.2 Konstruktor: parameter `address _cUSD` → `address _usdc`; require
      `_usdc != address(0)` (pesan "usdc zero").
- [ ] 2.3 Semua pemanggil internal `cUSD.transferFrom(...)`, `cUSD.transfer(...)` →
      `usdc.transferFrom(...)`, `usdc.transfer(...)` (3 lokasi: register, distribute,
      refund).
- [ ] 2.4 Komentar & NatSpec: ganti "cUSD" → "USDC" di header file (line 8),
      konstruktor NatSpec (line 67-73), dan komentar `register`/inline.

## 3. Update test Foundry

- [ ] 3.1 `cd contracts && forge build` — pastikan compile sukses tanpa warning baru.
- [ ] 3.2 Cek test file: `grep -n "cUSD" contracts/test/*.sol`. Update pemanggil
      `vault.cUSD()` (jika ada) → `vault.usdc()`. Update nama parameter di setup
      helper.
- [ ] 3.3 `cd contracts && forge test` — pastikan 25 test eksisting tetap hijau.

## 4. Mock token & characterization test blacklist

- [ ] 4.1 Buat `contracts/test/mocks/MockBlacklistedUSDC.sol` — ERC20 minimal
      yang menerima daftar `blacklisted` di konstruktor dan revert `transfer`
      ke address di daftar.
- [ ] 4.2 Tambah `test_flow_blacklistedRecipient_revertsBatchTransfer` di
      [contracts/test/BitPactVaultFlow.t.sol](../../../contracts/test/BitPactVaultFlow.t.sol):
      - Deploy vault dengan mock token.
      - 3 peserta register.
      - Blacklist 1 address.
      - Panggil `distributePrize` dengan 3 winners (termasuk yang ter-blacklist).
      - Assert: revert; `vault.getEventInfo(...).distributed === false`; saldo
        peserta lain tidak berubah.
- [ ] 4.3 Tambah test analog `test_flow_blacklistedRecipient_revertsBatchRefund`:
      `emergencyRefund` dengan satu peserta blacklisted → revert.
- [ ] 4.4 `forge test` — pastikan 27 test pass (25 lama + 2 baru).

## 5. Update Deploy script

- [ ] 5.1 Di [contracts/script/Deploy.s.sol](../../../contracts/script/Deploy.s.sol):
      - Hapus konstanta `CUSD_ALFAJORES`.
      - Tambah komentar daftar alamat USDC (mainnet & sepolia) per
        `openspec/specs/usdc-integration`.
      - `vm.envAddress("CUSD_TOKEN_ADDRESS")` → `vm.envAddress("USDC_TOKEN_ADDRESS")`.
      - Rename variable lokal `cUSDToken` → `usdcToken`.
      - Update log `"cUSD token:"` → `"USDC token:"`.
- [ ] 5.2 Update `backend/.env.example` — variable sudah `USDC_TOKEN_ADDRESS` (OK),
      pastikan komentarnya jelas.

## 6. Update frontend ABI constants

- [ ] 6.1 Di [frontend/src/constants/index.ts](../../../frontend/src/constants/index.ts):
      ABI entry `name: "cUSD"` (line 22-27) → `name: "usdc"`.
      Constructor input parameter `_cUSD` → `_usdc` agar konsisten.
- [ ] 6.2 `cd frontend && npm run build` — pastikan type check lulus.

## 7. Update README alamat USDC

- [ ] 7.1 Di [README.md](../../../README.md) section "Token USDC (Stablecoin Celo)":
      - Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
      - Sepolia: `0x01C5C0122039549AD1493B8220cABEdD739BC44E`
      - Hapus referensi "Alfajores" yang berbagi alamat dengan Sepolia (mereka
        berbeda chain). Jika perlu alfajores, sebut alamat resmi terpisah.
- [ ] 7.2 Cross-check dengan [openspec/specs/usdc-integration/spec.md](../../specs/usdc-integration/spec.md)
      — sumber kebenaran. Konsisten? Iya.
- [ ] 7.3 Jangan update `VAULT_CONTRACT_ADDRESS` Mainnet di README dulu —
      itu akan di-update di change `mainnet-cutover`.

## 8. Dokumentasi risiko blacklist

- [ ] 8.1 Buat / update `contracts/README.md` dengan section "Known Risks" yang
      menjelaskan whole-batch revert risk, mitigasi (`settlement_failed` +
      retry, `appeal` flow), dan rencana refactor pull-payment.
- [ ] 8.2 Tambah cross-reference link ke `escrow-payout-integrity` archive dan
      ke change ini.

## 9. Verifikasi local

- [ ] 9.1 `cd contracts && forge test -vv` — 27 test pass.
- [ ] 9.2 `cd backend && npm test` — 88 test pass.
- [ ] 9.3 `cd frontend && npm run build` — type check + build sukses.

## 10. Redeploy & smoke test Sepolia

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

- [ ] 11.1 `refactor(contracts): rename cUSD storage and parameter to usdc` (task 2 + 3)
- [ ] 11.2 `test(contracts): characterize whole-batch revert on USDC blacklist` (task 4 + mock)
- [ ] 11.3 `chore(contracts): update Deploy.s.sol to use USDC env name` (task 5)
- [ ] 11.4 `chore(frontend): align VAULT_ABI getter name with contract (usdc)` (task 6)
- [ ] 11.5 `docs: sync USDC token addresses with usdc-integration spec` (task 7)
- [ ] 11.6 `docs(contracts): document USDC blacklist risk and recovery path` (task 8)
- [ ] 11.7 *(no commit)* Sepolia redeploy + smoke test (task 10) — alamat
      baru disimpan internal, tidak masuk repo sampai `mainnet-cutover`.
