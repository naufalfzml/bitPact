## Context

`BitPactVault` (Solidity, Foundry) menyimpan deposit USDC per event. Setelah
`protocol-fee`, `register` menarik `ticket + fee` (`prizePool += ticket`,
`feePool += fee`) dan `distributePrize` mem-push shares ke pemenang lalu
mengirim `feePool` ke admin. Backend `settleEvent` (Express) memanggil
`distributePrize` dengan winners+shares yang dihitung dari konsensus/bracket,
shares diturunkan dari `prizePool` on-chain agar `sum(shares) == prizePool`.

Risiko yang ada: distribusi push dalam loop → satu pemenang ter-blacklist USDC
me-revert seluruh batch (dana terkunci). `contracts/README.md` sudah mencatat
rencana V2: ubah ke pull-payment (`claim`).

Kontrak **belum** deploy mainnet, jadi mengubah semantik & struct aman (redeploy).

## Goals / Non-Goals

**Goals:**
- Pemenang menarik hadiah sendiri via `claim()` (bayar gas sendiri, dapat tx hash).
- Distribusi mencatat saldo claimable per pemenang; fee tetap ke treasury (admin).
- Kegagalan transfer terisolasi per pemenang (mitigasi blacklist).
- Backend tetap valid (tak ada perubahan logika settlement; 76 test hijau).

**Non-Goals:**
- Mengubah `emergencyRefund` (tetap push refund semua).
- Mengubah perhitungan pemenang/shares.
- Mengubah pemicu finalisasi (boleh tetap otomatis saat konsensus).

## Decisions

### D1: Pertahankan nama `distributePrize`, ubah jadi pencatat claimable
`distributePrize(eventId, winners[], shares[])` (admin-only) tetap memvalidasi
`sum(shares) == prizePool` dan `distributed = true`, tetapi alih-alih transfer:
```solidity
for (i) claimable[eventId][winners[i]] += shares[i];
emit PrizeDistributed(eventId, prizePool); // kini berarti "finalized/claimable set"
// fee tetap dikirim ke admin
uint256 fee = e.feePool;
if (fee > 0) { e.feePool = 0; usdc.transfer(admin, fee); emit FeeCollected(...); }
```
- *Alasan:* sesuai rencana V2 di README; meminimalkan churn backend (settleEvent
  tetap memanggil `distributePrize`) & frontend (ABI fungsi sama).
- *Alternatif ditolak:* rename ke `finalizeDistribution` → churn lebih besar tanpa
  manfaat berarti.

### D2: `claim(eventId)` — pull-payment
```solidity
function claim(bytes32 eventId) external {
    if (!eventExists[eventId]) revert EventNotFound();
    uint256 amount = claimable[eventId][msg.sender];
    if (amount == 0) revert NothingToClaim();
    claimable[eventId][msg.sender] = 0;            // effects sebelum interaction
    bool ok = usdc.transfer(msg.sender, amount);
    if (!ok) revert TransferFailed();
    emit PrizeClaimed(eventId, msg.sender, amount);
}
```
Checks-effects-interactions dipertahankan (zero dulu, transfer kemudian).
Tidak perlu `onlyAdmin`. Double-claim otomatis ter-revert via `NothingToClaim`.

### D3: Struktur penyimpanan claimable
Tambah `mapping(bytes32 => mapping(address => uint256)) private claimable;`
(level kontrak, di-key event lalu address) ATAU `mapping(address=>uint256)
claimable` di dalam `EventInfo`. Karena `EventInfo` punya mapping di dalam struct
(sudah ada `isRegistered`), menambah `mapping(address => uint256) claimable` ke
struct konsisten dengan pola yang ada. Pilih: **di dalam `EventInfo`**.

### D4: View `claimableOf`
```solidity
function claimableOf(bytes32 eventId, address account) external view returns (uint256) {
    return events[eventId].claimable[account];
}
```
Dipakai frontend untuk memutuskan tampil/aktif tombol Claim dan jumlahnya.

### D5: Lifecycle event di backend
`settleEvent` (isDistribute) memanggil `distributePrize` (kini mencatat
claimable). Pada receipt sukses, event → `ended` seperti sekarang. Makna `ended`
menjadi "hasil final, hadiah claimable". Tidak ada perubahan kode logika; cukup
sesuaikan komentar. `emergencyRefund` path tak berubah.
- *Catatan:* finalisasi tetap bisa terpicu otomatis (resolveConsensus). Yang baru
  & memenuhi permintaan user ("jangan auto-distributed, ada tombol claim") adalah
  transfer ke pemenang kini butuh aksi **claim** eksplisit.

### D6: Frontend Claim UX
Di `events/[id]/page.tsx`, saat `status === "ended"`:
- Baca `claimableOf(eventId, address)` (wagmi `useReadContract`/publicClient).
- Jika `> 0`: tampilkan tombol **■ Claim Prize ■** (+ jumlah). Klik:
  `writeContractAsync({ functionName: "claim", args: [eventIdBytes32] })`,
  `waitForTransactionReceipt`, lalu `toast.success` berisi link tx hash
  (`getTxExplorerUrl`) di pojok. Setelah sukses, refresh agar tombol jadi
  "Claimed".
- Jika `== 0` dan user pemenang yang sudah claim: tampilkan status "Claimed".

### D7: Tests
- Unit (`BitPactVault.t.sol`): distribute → saldo pemenang TIDAK berubah,
  `claimableOf == share`; `claim` → saldo += share, claimable → 0; double `claim`
  revert `NothingToClaim`; non-winner claim revert.
- Fee suite (`BitPactVaultFee.t.sol`): admin tetap menerima `feePool` saat
  distribute; pemenang menerima pool penuh **setelah claim**.
- Flow (`BitPactVaultFlow.t.sol`): blacklist — distribute TIDAK revert lagi
  (tak ada transfer ke pemenang saat distribute); `claim` pemenang ter-blacklist
  revert, tetapi `claim` pemenang lain tetap sukses (isolasi). Update test
  blacklist-distribute yang lama.

## Risks / Trade-offs

- **Semantik `distributePrize` berubah (push→record)** → wajib redeploy & update
  frontend ABI/UX + tests. Mitigasi: belum mainnet; cakup test menyeluruh.
- **Dana "menggantung" sebagai claimable** bila pemenang tak pernah claim → dana
  tetap aman di vault, bisa diklaim kapan saja. Tidak ada sweep (sengaja, demi
  trustless). Catat sebagai known behavior.
- **Pemenang perlu gas** untuk claim. Itu memang tujuan (pull-payment).
- **Interaksi dengan protocol-fee** (uncommitted) → terapkan/commit protocol-fee
  dulu agar `feePool`/fee-transfer sudah ada.

## Migration Plan

1. Terapkan/commit `protocol-fee` lebih dulu (dependency).
2. Edit kontrak: struct (+claimable), `distributePrize` (record), `claim`,
   `claimableOf`, event `PrizeClaimed`, error `NothingToClaim`, NatSpec.
3. `forge build`; rework + tambah test; `forge test` hijau.
4. Frontend ABI/constants (claim/claimableOf/PrizeClaimed).
5. Frontend Claim UI + tx hash toast; vote page copy.
6. README update; `cd backend && npm test` (tetap hijau), `cd frontend && npm run build`.
7. Redeploy Sepolia; smoke test claim. Mainnet di cutover.

Rollback: revert PR; belum mainnet, tak ada dana terdampak.

## Open Questions

- Tidak ada — model claim (winner self-claim, bayar gas sendiri) sudah
  dikonfirmasi.
