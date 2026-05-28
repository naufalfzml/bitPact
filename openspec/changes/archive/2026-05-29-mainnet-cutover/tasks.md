## 1. Pre-flight: konfirmasi semua change lain landed

- [ ] 1.1 Cek `git log --oneline main` — verifikasi 5 change ini sudah merged:
      - `contract-naming-and-blacklist-docs`
      - `settlement-failed-recovery-ui`
      - `backend-correctness-cleanup`
      - `frontend-polish-and-english`
      - `docs-completion`
- [ ] 1.2 `cd contracts && forge test -vv` — 27 test pass (atau jumlah aktual setelah change 2).
- [ ] 1.3 `cd backend && npm test` — 88+ test pass.
- [ ] 1.4 `cd frontend && npm run build` — sukses.
- [ ] 1.5 Sepolia smoke test masih jalan (test wallet bisa register → vote
      → distribute). Catat alamat vault Sepolia aktual yang dipakai.
- [ ] 1.6 Konfirmasi `0xC2375c25...` (kontrak mainnet existing) memang
      tidak ada event live: cek via Blockscout Mainnet `eventExists` /
      events / saldo USDC vault = 0. Aman untuk deprecation.

## 2. Funding deployer

- [ ] 2.1 Identifikasi `DEPLOYER_PRIVATE_KEY` wallet untuk mainnet deploy
      (TIDAK boleh sama dengan admin wallet runtime — pisahkan key
      deployer dari key operasional supaya admin key tidak perlu
      di-expose ke laptop saat deploy).
- [ ] 2.2 Top up deployer wallet dengan CELO secukupnya untuk deploy
      (estimasi ~0.05 CELO untuk deploy + verify + 1 smoke event).
- [ ] 2.3 Top up creator wallet untuk smoke test dengan ~0.05 USDC + 0.05
      CELO (untuk gas).

## 3. Deploy ke Celo Mainnet

- [ ] 3.1 Set env mainnet di shell deploy:
      ```bash
      export CELO_RPC_URL=https://forno.celo.org
      export USDC_TOKEN_ADDRESS=0xcebA9300f2b948710d2653dD7B07f33A8B32118C
      export ADMIN_WALLET_ADDRESS=0x003DC53295c2849Aec366F8D07fE5519C5605C19
      export DEPLOYER_PRIVATE_KEY=<deployer key>
      ```
- [ ] 3.2 Dry run dulu (tanpa `--broadcast`) untuk konfirmasi parameter:
      ```bash
      forge script script/Deploy.s.sol:DeployBitPactVault --rpc-url $CELO_RPC_URL -vvvv
      ```
- [ ] 3.3 Eksekusi nyata dengan broadcast:
      ```bash
      forge script script/Deploy.s.sol:DeployBitPactVault \
        --rpc-url $CELO_RPC_URL \
        --broadcast \
        --private-key $DEPLOYER_PRIVATE_KEY \
        -vvvv
      ```
- [ ] 3.4 Catat alamat vault mainnet baru di catatan operasi (variabel kerja
      `$VAULT_MAINNET_NEW` untuk task selanjutnya).
- [ ] 3.5 Verifikasi langsung: panggil view function via cast:
      ```bash
      cast call $VAULT_MAINNET_NEW "admin()(address)" --rpc-url $CELO_RPC_URL
      cast call $VAULT_MAINNET_NEW "usdc()(address)" --rpc-url $CELO_RPC_URL
      ```
      Pastikan `admin()` = `$ADMIN_WALLET_ADDRESS` dan `usdc()` = USDC mainnet.

## 4. Verify source code di explorer

- [ ] 4.1 Jalankan verify (Blockscout):
      ```bash
      forge verify-contract \
        --rpc-url $CELO_RPC_URL \
        --verifier blockscout \
        --verifier-url https://celo.blockscout.com/api \
        --constructor-args $(cast abi-encode "constructor(address,address)" \
          $ADMIN_WALLET_ADDRESS $USDC_TOKEN_ADDRESS) \
        $VAULT_MAINNET_NEW \
        contracts/src/BitPactVault.sol:BitPactVault
      ```
- [ ] 4.2 Buka Blockscout mainnet di `https://celo.blockscout.com/address/<vault-baru>`
      → tab "Contract" → konfirmasi source code muncul + identifier `usdc`
      ada di state variables.
- [ ] 4.3 Kalau verify gagal: catat error, retry dengan flag yang
      disesuaikan; bisa diselesaikan setelah deploy success (tidak block
      cutover).

## 5. Update env produksi (operator manual)

- [ ] 5.1 Backend production env (`VAULT_CONTRACT_ADDRESS`) → `$VAULT_MAINNET_NEW`.
- [ ] 5.2 Frontend production env
      (`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS`) → `$VAULT_MAINNET_NEW`.
- [ ] 5.3 Restart kedua service. Tunggu beberapa saat. Cek
      `GET /api/health` backend = 200.

## 6. Smoke test mainnet 0.01 USDC

- [ ] 6.1 Frontend production: connect creator wallet → create event
      dengan ticket 0.01 USDC, mode 1v1, max_participants 2, public.
- [ ] 6.2 Connect wallet kedua → register (approve + deposit 0.01 USDC).
- [ ] 6.3 Kembali sebagai creator → lock roster → pilih 1v1 → start.
- [ ] 6.4 Submit winner = wallet kedua. Status → voting.
- [ ] 6.5 Wallet kedua login → vote AGREE. Backend auto-resolve karena
      semua peserta sudah vote (1/1 = 100%).
- [ ] 6.6 Verify status event = `ended` di UI + DB. Verify saldo USDC
      wallet kedua bertambah 0.01 USDC (deposit kembali penuh karena
      pemenang tunggal).
- [ ] 6.7 Cek tx di Blockscout mainnet: `distributePrize` sukses.

## 7. Update repo

- [ ] 7.1 Update [README.md](../../../README.md) section "bitPact Vault Smart
      Contract": ganti `0xC2375c25...` ke `$VAULT_MAINNET_NEW`. Tambah note
      kecil "(deployed [tanggal] after `cUSD → usdc` rename)".
- [ ] 7.2 Update [docs/SMART-CONTRACT.md](../../../docs/SMART-CONTRACT.md)
      (dibuat di change `docs-completion`): alamat deployed mainnet.
- [ ] 7.3 (Optional) Buat `CHANGELOG.md` di root dengan entry pertama:
      ```md
      ## [v0.1.0-mainnet] — <tanggal>
      ### Changed
      - Redeployed BitPactVault to mainnet at `0x...` after renaming
        `cUSD → usdc` source identifier. Old vault `0xC2375c25...`
        is deprecated (no live data).
      ```
- [ ] 7.4 Commit semua sebagai PR `chore(deployment): cutover mainnet vault
      to renamed contract`.

## 8. Tag release & komunikasi

- [ ] 8.1 Setelah PR merged, buat git tag: `git tag -a v0.1.0-mainnet -m
      "Mainnet cutover: BitPactVault redeployed"` dan push.
- [ ] 8.2 Jika ada README "demo URL" atau channel komunikasi (Discord/
      Twitter), umumkan alamat baru sebagai canonical.

## 9. Rollback (kalau perlu)

- [ ] 9.1 Kalau smoke test (task 6) gagal dengan cara yang menunjukkan bug
      kode (bukan deploy salah): rollback env produksi ke alamat lama
      `0xC2375c25...`. Fix bug → ulangi deploy + smoke.
- [ ] 9.2 Kalau smoke gagal karena deployer typo (env salah saat deploy):
      redeploy lagi dengan parameter benar; alamat baru sekali lagi (alamat
      yang typo dianggap deprecated).

## 10. Commit plan

Cutover ini hanya menghasilkan 1 commit ke repo (selain tag):

- [ ] 10.1 `chore(deployment): cutover mainnet vault to renamed contract` (task 7)

Tag git terpisah: `v0.1.0-mainnet`.
