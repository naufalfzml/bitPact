## Context

`BitPactVault` saat ini menyimpan `prizePool` = jumlah tiket; `distributePrize`
revert kecuali `sum(shares) == prizePool`. Tidak ada fee. Admin mensponsori gas.

Keputusan produk: entry surcharge 2% (lihat proposal). Fee di-escrow di kontrak
dan baru dikirim ke treasury saat distribusi; refund mengembalikan fee.

## Goals / Non-Goals

**Goals:**
- Prize pool yang dibagikan ke pemenang = 100% jumlah tiket (fee TIDAK mengurangi).
- Fee 2% per entry masuk treasury (admin) saat payout sukses.
- Refund mengembalikan tiket + fee.
- Backend settlement TIDAK berubah.
- Existing contract tests tetap valid dengan churn minimal.

**Non-Goals:**
- Fee mutable, treasury terpisah, dynamic/tier fee.

## Decisions

### D1: `feeBps` immutable + cap
```solidity
uint16 public immutable feeBps;            // 200 = 2%
uint16 private constant MAX_FEE_BPS = 1000; // hard cap 10% safety
uint16 private constant BPS_DENOMINATOR = 10000;

constructor(address _admin, address _usdc, uint16 _feeBps) {
    require(_admin != address(0), "admin zero");
    require(_usdc != address(0), "usdc zero");
    require(_feeBps <= MAX_FEE_BPS, "fee too high");
    admin = _admin;
    usdc = IERC20(_usdc);
    feeBps = _feeBps;
}
```

### D2: Struct tambah `feePool`
```solidity
struct EventInfo {
    address creator;
    uint256 ticketPrice;
    uint256 prizePool;
    uint256 feePool;        // NEW: akumulasi fee, escrowed
    bool distributed;
    address[] participants;
    mapping(address => bool) isRegistered;
}
```
> Catatan storage layout: ini kontrak BARU (akan deploy ulang), bukan upgrade,
> jadi menambah field di tengah struct aman.

### D3: `register` tarik tiket + fee
```solidity
uint256 fee = (e.ticketPrice * feeBps) / BPS_DENOMINATOR;
uint256 total = e.ticketPrice + fee;
bool ok = usdc.transferFrom(msg.sender, address(this), total);
if (!ok) revert TransferFailed();
e.isRegistered[msg.sender] = true;
e.participants.push(msg.sender);
e.prizePool += e.ticketPrice;   // pool TETAP = tiket
e.feePool   += fee;             // fee terpisah
emit ParticipantRegistered(eventId, msg.sender, e.ticketPrice);
```
Caller harus approve `total`. Integer math (floor) — frontend mirror persis.

### D4: `distributePrize` kirim fee ke admin
Setelah loop transfer shares (tidak berubah, `sum(shares) == prizePool`):
```solidity
uint256 fee = e.feePool;
if (fee > 0) {
    e.feePool = 0;
    bool ok = usdc.transfer(admin, fee);
    if (!ok) revert TransferFailed();
    emit FeeCollected(eventId, fee);
}
```
`prizePool` tetap dibagi penuh ke pemenang — pemenang dapat 100% pot.

### D5: `emergencyRefund` kembalikan tiket + fee
```solidity
uint256 feePerPerson = (e.ticketPrice * feeBps) / BPS_DENOMINATOR;
uint256 refundPerPerson = e.ticketPrice + feePerPerson;
... loop transfer refundPerPerson ke tiap participant ...
e.prizePool = 0;
e.feePool = 0;
```
Karena `feeBps` immutable & `ticketPrice` tetap per event, `feePerPerson`
konsisten dengan yang ditarik saat register; `participants.length * refundPerPerson
== prizePool + feePool` → menguras vault tepat.

### D6: Backend tidak berubah
`settleEvent` membaca `prizePool` via `getEventInfo` (tidak termasuk fee), bagi
ke pemenang, panggil `distributePrize(winners, shares)`. Kontrak yang mengirim
fee. `emergencyRefund(eventId)` tetap. Tidak ada perubahan kode backend.

### D7: Frontend mirror integer math
```ts
const ticketPriceUnits = parseUnits(String(event.ticket_price), 6); // bigint
const feeUnits = (ticketPriceUnits * BigInt(PROTOCOL_FEE_BPS)) / 10000n;
const totalUnits = ticketPriceUnits + feeUnits;
// approve(totalUnits) — sebelumnya approve(ticketPriceUnits)
```
UI register tampilkan: "Ticket {price} USDC + {fee} service fee (2%) = {total} USDC".
`PROTOCOL_FEE_BPS = 200` konstanta frontend harus sama dengan deploy. Tambah
getter `feeBps()` ke ABI untuk verifikasi/cross-check opsional.

### D8: Tests — feeBps=0 untuk existing, suite baru untuk fee
- Update semua `new BitPactVault(admin, token)` → `new BitPactVault(admin, token, 0)`
  di test existing → perilaku identik (fee 0), assertion lama tetap valid.
- Tambah suite `feeBps = 200`:
  - register menarik `ticket + fee`, `prizePool == ticket`, saldo vault `ticket+fee`.
  - distribute: pemenang dapat pool penuh, admin dapat `feePool`.
  - refund: tiap peserta dapat `ticket + fee`, vault terkuras 0.
  - constructor revert bila `feeBps > 1000`.

## Risks / Trade-offs

- **Approve naik jadi `ticket+fee`** → user approve sedikit lebih besar. Wajar.
- **Rounding floor** pada fee kecil (mis. tiket 0.01 USDC → fee floor 0). Untuk
  tiket sangat kecil fee bisa 0 — acceptable; pool kecil revenue kecil.
- **Treasury = admin** → revenue tercampur gas float; perlu tracking manual
  (sudah disepakati).
- **Immutable** → ganti fee perlu redeploy. Disepakati demi trustless.

## Migration Plan

1. Edit `BitPactVault.sol` (constructor, struct, register, distribute, refund, event, getter).
2. `forge build`; update test constructor calls (+`0`) + tambah suite fee.
3. Update `Deploy.s.sol` (param feeBps + env).
4. Update `frontend/src/constants/index.ts` (ABI constructor + `feeBps` getter + `PROTOCOL_FEE_BPS`).
5. Update `frontend/.../events/[id]/page.tsx` register (approve total + breakdown UI).
6. `forge test`, `cd backend && npm test` (harus tetap hijau — backend tak berubah),
   `cd frontend && npm run build`.
7. Redeploy Sepolia (env `PROTOCOL_FEE_BPS=200`), smoke. Mainnet di cutover (#6).

Rollback: revert PR; karena belum mainnet, tidak ada dana terdampak.

## Open Questions

- Tidak ada — semua parameter sudah dikunci (2% / refundable / admin treasury / immutable).
