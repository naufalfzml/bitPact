## Why

Saat ini hadiah **di-push otomatis** ke pemenang: `resolveConsensus` →
`settleEvent` → `distributePrize` mentransfer USDC ke tiap pemenang dalam satu
loop. Tidak ada aksi "claim" dari pemenang, dan satu pemenang yang ter-blacklist
USDC dapat me-revert seluruh batch (dana terkunci). Produk menginginkan model
**pull-payment**: pemenang menekan tombol **Claim** sendiri, membayar gas-nya
sendiri, dan melihat **tx hash** setelah berhasil. Ini juga memitigasi risiko
blacklist (kegagalan terisolasi per pemenang) seperti yang sudah dicatat sebagai
rencana V2 di `contracts/README.md`.

> Dependensi: change ini dibangun di atas `protocol-fee` (menambah `feePool` &
> pengiriman fee ke admin di distribusi). `protocol-fee` HARUS diterapkan lebih
> dulu.

## What Changes

- **Contract `BitPactVault` (pull-payment):**
  - Tambah `mapping(address => uint256) claimable` per event (escrow per pemenang).
  - `distributePrize(eventId, winners, shares)` (admin-only) **TIDAK lagi
    mentransfer** ke pemenang; sebagai gantinya **mencatat** `claimable[winner]
    += share`, menandai `distributed = true`, lalu mengirim `feePool` ke admin
    (treasury) seperti sebelumnya. **BREAKING**: semantik fungsi berubah dari
    push menjadi record.
  - Tambah `claim(eventId)`: pemenang menarik `claimable[msg.sender]`, set nol,
    transfer USDC ke dirinya, emit `PrizeClaimed`.
  - Tambah view `claimableOf(eventId, account)` untuk UI.
  - Event baru `PrizeClaimed(eventId, winner, amount)`.
  - `emergencyRefund` tetap push (refund semua peserta) — di luar scope claim.
- **Backend:** `settleEvent` tetap memanggil `distributePrize` (kini mencatat
  claimable). Event menjadi `ended` setelah distribusi sukses (claimable
  tercatat); pemenang meng-claim sendiri setelahnya. Tidak ada perubahan logika
  pemilihan pemenang/shares.
- **Frontend:**
  - Halaman detail event: bila status `ended` dan `claimableOf(me) > 0`,
    tampilkan tombol **Claim Prize**; klik → kirim tx `claim`, tunggu receipt,
    tampilkan **tx hash** sebagai toast pojok (sukses).
  - ABI/constants: tambah `distributePrize` (tetap), `claim`, `claimableOf`,
    event `PrizeClaimed`.
  - Vote page: copy tombol "DISTRIBUTE PRIZE" diperjelas menjadi finalisasi yang
    mengaktifkan claim (bukan transfer langsung).

## Capabilities

### New Capabilities
- `winner-claim-payout`: Hadiah dibayarkan via pull-payment — distribusi mencatat
  saldo claimable per pemenang (fee tetap ke treasury), dan tiap pemenang
  menarik dananya sendiri lewat `claim()` (bayar gas sendiri, dapat tx hash).
  Kegagalan transfer terisolasi per pemenang (mitigasi blacklist).

## Impact

- **Contract** (`contracts/src/BitPactVault.sol`): struct (+`claimable`),
  `distributePrize` (record, bukan push), `claim` baru, `claimableOf` view,
  event `PrizeClaimed`, NatSpec.
- **Contract tests** (`contracts/test/*`): rework assertion distribusi (saldo
  pemenang tidak berubah saat distribute; berubah saat claim), tambah test claim
  + double-claim + isolasi blacklist (claim pemenang lain tetap sukses).
- **Backend** (`routes/events.js`): tak ada perubahan logika; sesuaikan
  komentar/log bila perlu (settlement tetap valid; 76 test tetap hijau).
- **Frontend**: `events/[id]/page.tsx` (tombol Claim + tx hash toast),
  `constants/index.ts` (ABI claim/claimableOf/PrizeClaimed), `events/[id]/vote`
  (copy finalisasi).
- **Docs**: `contracts/README.md` — pindahkan pull-payment dari "Planned" ke
  implemented; perbarui catatan risiko blacklist (kini terisolasi per claim).
- **Redeploy**: bytecode berubah → redeploy Sepolia (mainnet di cutover).

## Non-Goals

- Mengubah `emergencyRefund` menjadi claim (tetap push refund semua).
- Mengubah cara pemenang/shares dihitung (tetap dari konsensus/bracket backend).
- Membuat finalisasi (`distributePrize`) menjadi murni manual — finalisasi tetap
  bisa terpicu oleh resolusi konsensus; yang baru adalah **claim** oleh pemenang.
