> Dependency: terapkan/commit `protocol-fee` lebih dulu (change ini memakai
> `feePool` + pengiriman fee ke admin).
> Tiap section = satu commit terpisah (per feature/fix).

## 1. Contract — pull-payment (commit: `feat(contracts): pull-payment claim for prizes`)

- [x] 1.1 `EventInfo`: tambah `mapping(address => uint256) claimable`.
- [x] 1.2 Tambah error `NothingToClaim` + event `PrizeClaimed(bytes32 indexed
      eventId, address indexed winner, uint256 amount)`.
- [x] 1.3 `distributePrize()`: ganti loop transfer ke pemenang menjadi
      `e.claimable[winners[i]] += shares[i]`; tetap validasi `sum==prizePool`,
      set `distributed=true`, kirim `feePool` ke admin + `FeeCollected`,
      emit `PrizeDistributed` (kini bermakna finalized/claimable set).
- [x] 1.4 Tambah `claim(bytes32 eventId)`: ambil `claimable[msg.sender]`,
      revert `NothingToClaim` bila 0, set 0, transfer, emit `PrizeClaimed`.
- [x] 1.5 Tambah view `claimableOf(bytes32 eventId, address account)`.
- [x] 1.6 Update NatSpec (distributePrize sekarang record; claim; claimableOf).

## 2. Contract tests (commit: digabung dgn #1 atau `test(contracts): claim + isolation`)

- [x] 2.1 `BitPactVault.t.sol`: ubah test distribute → saldo pemenang tak berubah,
      `claimableOf == share`; tambah test `claim` sukses, double-claim revert,
      non-winner revert.
- [x] 2.2 `BitPactVaultFee.t.sol`: admin tetap dapat fee saat distribute;
      pemenang dapat pool penuh **setelah claim**.
- [x] 2.3 `BitPactVaultFlow.t.sol`: update test blacklist — distribute tidak
      revert lagi; `claim` pemenang lain tetap sukses, hanya pemenang
      ter-blacklist yang gagal.
- [x] 2.4 `cd contracts && forge test` — semua hijau.

## 3. Frontend ABI/constants (commit: `feat(frontend): claim ABI + helpers`)

- [ ] 3.1 `constants/index.ts`: tambah ke `VAULT_ABI` fungsi `claim(bytes32)`,
      view `claimableOf(bytes32,address)`, dan event `PrizeClaimed`.

## 4. Frontend Claim UI (commit: `feat(frontend): winner claim button + tx hash toast`)

- [ ] 4.1 `events/[id]/page.tsx`: saat `status === "ended"`, baca
      `claimableOf(eventId, address)`.
- [ ] 4.2 Bila claimable > 0: tampilkan tombol "■ Claim Prize ■" (+ jumlah);
      klik → `writeContractAsync` `claim`, `waitForTransactionReceipt`,
      `toast.success` berisi tautan tx hash (`getTxExplorerUrl`) di pojok.
- [ ] 4.3 Setelah sukses, refresh; tampilkan status "Claimed" bila claimable 0
      untuk pemenang.

## 5. Vote page copy (commit: `fix(frontend): clarify finalize-enables-claim copy`)

- [ ] 5.1 `events/[id]/vote/page.tsx`: perjelas copy tombol "DISTRIBUTE PRIZE"
      menjadi finalisasi yang mengaktifkan claim (bukan transfer langsung), dan
      teks penjelas terkait.

## 6. Verifikasi + docs (commit: `docs(contracts): pull-payment claim`)

- [ ] 6.1 `contracts/README.md`: pindahkan pull-payment dari "Planned" ke
      implemented; perbarui catatan risiko blacklist (kini isolasi per claim).
- [ ] 6.2 `cd backend && npm test` — 76 tetap hijau (logika settlement tak
      berubah).
- [ ] 6.3 `cd frontend && npm run build` — sukses.
- [ ] 6.4 *(user)* Redeploy Sepolia (bytecode berubah), smoke test: distribute →
      pemenang claim → cek tx hash & saldo.
