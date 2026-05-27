## ADDED Requirements

### Requirement: Kontrak mainnet hasil cutover ter-verify di explorer
Setelah cutover mainnet, alamat vault baru MUST punya source code yang
terverifikasi di Celo Blockscout (atau Celoscan equivalent). Verified source
MUST mencerminkan identifier `usdc` (post-rename) bukan `cUSD`.

#### Scenario: Verified source menampilkan identifier baru
- **GIVEN** kontrak baru terdeploy di alamat `V`
- **WHEN** reviewer buka Blockscout `https://celo.blockscout.com/address/V`
- **THEN** tab "Contract" memuat source `BitPactVault.sol`
- **AND** state variable yang ditampilkan adalah `IERC20 public immutable usdc`
- **AND** TIDAK ada identifier `cUSD` dalam source publik

### Requirement: Smoke test E2E mainnet sukses sebelum cutover diumumkan
Sebelum env produksi diumumkan publik / di-merge ke repo, MUST ada smoke
test minimal 1 event di mainnet (ticket ≤ 0.01 USDC) yang menjalani
seluruh siklus: register → start → vote → distribute. Smoke MUST sukses
(saldo USDC pemenang bertambah) sebelum repo README diupdate ke alamat baru.

#### Scenario: Smoke test gagal
- **WHEN** salah satu langkah smoke test mainnet gagal (mis. tx revert
  saat distribute)
- **THEN** PR update repo TIDAK boleh di-merge
- **AND** env produksi MUST di-rollback ke alamat vault lama sementara
  perbaikan dilakukan

#### Scenario: Smoke test sukses
- **WHEN** seluruh langkah smoke E2E selesai dan saldo pemenang berubah
  sesuai
- **THEN** PR update repo boleh di-merge
- **AND** alamat lama ditandai deprecated di CHANGELOG / docs

### Requirement: Single source of truth alamat vault setelah cutover
Setelah cutover, repo MUST menyajikan **satu** alamat vault Mainnet di
seluruh dokumen (README, docs/SMART-CONTRACT.md, openspec, env example).
Tidak boleh ada referensi alamat lama `0xC2375c25...` sebagai canonical;
boleh muncul sebagai entry deprecated di CHANGELOG.

#### Scenario: Audit konsistensi alamat
- **WHEN** `grep -rn "0xC2375c25" .` dijalankan setelah cutover
- **THEN** hasil hanya muncul di:
  - `CHANGELOG.md` (sebagai entry "deprecated")
  - File arsip openspec changes (historis, tidak diubah)
- **AND** TIDAK muncul di README aktif, env example, docs/SMART-CONTRACT.md,
  atau kode aplikasi
