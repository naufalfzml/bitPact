## Why

Kontrak `BitPactVault` di Celo Mainnet (alamat existing `0xC2375c25...`)
masih memakai source identifier `cUSD`. Setelah change
`contract-naming-and-blacklist-docs` merename source ke `usdc` dan
deployment Sepolia membuktikan rename + smoke test E2E sukses, kita perlu
melakukan **cutover mainnet final**: redeploy kontrak ke alamat baru,
propagasi alamat ke seluruh env produksi, dan update dokumentasi.

Konteks penting (per konfirmasi user):
- Kontrak mainnet existing **belum dipakai event live / dana user**.
  Cutover aman — tidak ada peserta yang terdampak.
- Cutover dijadwalkan **setelah 5 change lain landed** supaya source yang
  dideploy ke mainnet adalah versi yang sudah lengkap polish-nya
  (settlement UI, English, etc.), bukan partial.

Risiko kalau cutover tidak dilakukan: source code repo akan permanen
"berbohong" relatif terhadap kontrak mainnet (source `usdc`, deployed
`cUSD`). Audit eksternal nanti akan flag ini.

## What Changes

- **Pre-flight gate**: konfirmasi semua 5 change lain merged ke `main`
  (escrow-payout-integrity assumed already, settlement-failed-recovery-ui,
  contract-naming-and-blacklist-docs, backend-correctness-cleanup,
  frontend-polish-and-english, docs-completion).
- **Deploy mainnet**: jalankan `forge script Deploy.s.sol` dengan env
  Mainnet: `CELO_RPC_URL=https://forno.celo.org`,
  `USDC_TOKEN_ADDRESS=0xcebA9300f2b948710d2653dD7B07f33A8B32118C`,
  `ADMIN_WALLET_ADDRESS=0x003DC53295c2849Aec366F8D07fE5519C5605C19`
  (per README). Verify di Celoscan / Blockscout Mainnet.
- **Verify on-chain source**: submit verifikasi source code via Etherscan/
  Blockscout API supaya kontrak baru fully verified dan ABI publik
  match dengan source di repo.
- **Update env produksi**: `VAULT_CONTRACT_ADDRESS=<alamat mainnet baru>`
  di backend & frontend production env.
- **Update repo**:
  - `README.md` section "bitPact Vault Smart Contract" → alamat mainnet baru.
  - `openspec/specs/usdc-integration` — jika menyimpan alamat vault
    (tidak menyimpan saat ini), pastikan tetap konsisten.
  - `docs/SMART-CONTRACT.md` (dari change `docs-completion`) → alamat mainnet
    baru.
- **Smoke test mainnet ringan**: 1 event minimal dengan ticket kecil
  (mis. 0.01 USDC) untuk validasi flow E2E real di mainnet. Refund
  sendiri setelah smoke.
- **Pengarsipan**: kontrak lama `0xC2375c25...` ditandai deprecated di
  catatan internal (Blockscout note jika ada). Tidak ada migrasi data
  karena belum ada event.

## Capabilities

### New Capabilities
- `mainnet-cutover`: Proses cutover yang ter-dokumentasi dan ter-verifikasi
  untuk transisi kontrak mainnet `BitPactVault` ke alamat baru hasil rename
  `cUSD → usdc`. Setelah cutover, sumber kebenaran alamat vault produksi
  ada di repo (README, env contoh, docs).

## Impact

- **Smart contract**: tidak ada source change baru di change ini (rename
  sudah dilakukan di change 2). Deployment-only.
- **Config produksi**: env `VAULT_CONTRACT_ADDRESS` diperbarui di backend
  & frontend deployment.
- **Docs**: README + docs/SMART-CONTRACT.md update alamat.
- **Risk**: rendah karena tidak ada user impact (no live events).
- **Tests**: tidak ada test code baru. Smoke test manual E2E.

## Acceptance

- Kontrak baru ter-deploy di Celo Mainnet dengan source code verified
  di explorer (Blockscout / Celoscan).
- `forge verify-contract` atau alternative berhasil menampilkan source
  identifier `usdc` di explorer.
- Backend produksi memakai alamat baru dan endpoint `GET /api/health`
  serta `getEventInfo` ke vault baru sukses.
- Smoke test 1 event di mainnet selesai sukses (register → vote →
  distribute / refund).
- Tidak ada referensi alamat lama `0xC2375c25...` di repo selain catatan
  historis di CHANGELOG (jika ada).
