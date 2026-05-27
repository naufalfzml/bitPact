## Context

Kontrak `BitPactVault` adalah immutable (bukan upgradeable proxy). Rename
identifier `cUSD → usdc` mengubah bytecode → harus redeploy untuk konsistensi
source ↔ on-chain. Karena target mainnet, cutover butuh kehati-hatian
ekstra walau kondisi sekarang ringan (no live data).

Konteks deployment existing per README:
- Vault Mainnet: `0xC2375c25f402e83ce2b6F148146D6A8b47c0e62F` (akan deprecated).
- Admin wallet: `0x003DC53295c2849Aec366F8D07fE5519C5605C19`.
- USDC Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (per
  openspec/specs/usdc-integration).

Tool yang dipakai: Foundry `forge script`, Blockscout / Celoscan verify
API (atau `forge verify-contract` jika RPC mendukung).

## Goals / Non-Goals

**Goals:**
- Cutover mainnet aman, terverifikasi, ter-dokumentasi.
- Source code di repo MATCH dengan kontrak deployed setelah cutover.
- Env produksi diperbarui dengan alamat baru.
- Smoke test E2E pasca-deploy memastikan flow nyata bekerja.

**Non-Goals:**
- Migrasi data event dari kontrak lama → baru (tidak ada data).
- Mengembalikan dana dari kontrak lama (tidak ada dana).
- Audit eksternal formal (di luar scope hackathon ini).

## Decisions

### D1: Gate eksekusi — semua 5 change harus landed
Tidak boleh cutover sebelum:
- `contract-naming-and-blacklist-docs` (rename source + Sepolia smoke pass)
- `settlement-failed-recovery-ui`
- `backend-correctness-cleanup`
- `frontend-polish-and-english`
- `docs-completion` (minimal ARCHITECTURE.md + SMART-CONTRACT.md ready)

Alasan: kalau cutover dilakukan setengah jalan, ada risiko ditemukan
masalah yang butuh re-deploy lagi → buang gas mainnet + waktu.

### D2: Smoke test minimal dengan dana kecil
Sebelum mengumumkan kontrak baru "production":
1. Creator wallet buat event dengan ticket 0.01 USDC.
2. 1 wallet sekunder register (deposit 0.01 USDC).
3. Lock roster → pilih 1v1 → start.
4. Submit winner = wallet sekunder.
5. Vote (cuma 1 voter, otomatis quorum).
6. Verify distribusi: backend admin call `distributePrize` → cek wallet
   sekunder dapet 0.01 USDC.
7. Cleanup: tidak perlu — event sudah ended.

Total spend mainnet: ~0.01 USDC + gas. Acceptable untuk validasi.

**Alternatif ditolak:** skip smoke test → risiko ada bug deployment-specific
(mis. env salah, RPC misconfig) yang baru ketahuan saat user pertama
register. Mahal kalau dana mereka stuck.

### D3: Verifikasi source di explorer
Setelah deploy, source code wajib diverifikasi di Blockscout / Celoscan
agar publik bisa baca ABI + source — bukti transparansi escrow.

Command pattern (Blockscout):
```bash
forge verify-contract \
  --rpc-url $CELO_RPC_URL \
  --verifier blockscout \
  --verifier-url https://celo.blockscout.com/api \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    $ADMIN_WALLET_ADDRESS $USDC_MAINNET_ADDRESS) \
  <vault-address-baru> \
  contracts/src/BitPactVault.sol:BitPactVault
```

(Detail flag bisa disesuaikan dengan versi forge.)

### D4: Update repo dilakukan ATOMIK satu PR
PR `chore(deployment): cutover mainnet vault to renamed contract` berisi:
- Update `README.md` alamat vault mainnet.
- Update `backend/.env.example` (kalau alamat vault disebut sebagai
  contoh).
- Update `docs/SMART-CONTRACT.md` alamat deployed.
- (Optional) CHANGELOG entry mencatat deprecation kontrak lama.

Backend & frontend production env (di hosting platform, bukan repo)
diupdate manual oleh operator sebagai bagian deploy.

### D5: Tidak ada self-destruct kontrak lama
BitPactVault tidak punya `selfdestruct`. Kontrak lama akan tetap di
mainnet selamanya — itu sifat blockchain. Cukup tandai deprecated di
dokumentasi internal; tidak ada aksi on-chain yang perlu diambil.

## Risks / Trade-offs

- **Verify gagal di explorer**: kalau Blockscout API down atau ada
  inkonsistensi compiler version → coba ulang, atau tunda verify
  beberapa jam. Tidak block cutover; verify bisa dilakukan kemudian.
- **Smoke test 0.01 USDC**: butuh creator wallet punya saldo USDC mainnet
  + sedikit CELO untuk gas. Operator pastikan funding sebelum start.
- **Race condition env update**: backend admin & frontend ke vault baru
  HARUS sinkron. Kalau backend masih point ke vault lama tapi FE sudah ke
  baru → user register di vault baru via FE, tapi backend gagal verify
  `isParticipant` karena baca alamat lama → DB row gagal dibuat. Mitigasi:
  update kedua env dalam window singkat, atau short maintenance window.

## Migration Plan

Lihat tasks.md untuk checklist eksekusi step-by-step. Highlights:

1. **Pre-flight checks** (semua tests green, semua change merged).
2. **Funding deployer wallet** dengan cukup CELO untuk gas.
3. **Deploy** ke mainnet.
4. **Verify** source di Blockscout.
5. **Update env produksi** (backend + frontend simultan).
6. **Smoke test mainnet** 0.01 USDC.
7. **Update repo docs** (PR).
8. **Tag release** `v1.0.0` atau setara.

Rollback:
- Kalau smoke test gagal: env produksi di-revert ke alamat lama
  `0xC2375c25...` (kontrak lama masih live). Tidak ada user terdampak.
- Kalau bug di smoke ditemukan: fix kode → kembali eksekusi change
  perbaikan → cutover ulang dengan alamat baru lagi.

## Open Questions

- Apakah perlu juga deploy ulang ke Alfajores testnet? **Tidak** — Sepolia
  sudah jadi testnet utama per `CELO_NETWORK=sepolia` default. Alfajores
  tinggalan lama, skip.
- Tag git release pakai semver? **Default**: `v0.1.0-mainnet` untuk
  hackathon. Bisa di-bump kemudian.
