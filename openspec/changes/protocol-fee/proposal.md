## Why

bitPact saat ini **tidak punya revenue stream** — `distributePrize` memaksa
`sum(shares) == prizePool` (100% pool ke pemenang) dan admin wallet justru
**mensponsori gas** untuk createEvent/distribute/refund. Net negatif.

Keputusan: tambahkan **protocol fee 2%** sebagai **entry surcharge** (bukan rake
dari pool), sehingga prize pool tetap 100% untuk pemenang — menjaga narasi
trust "winner takes the whole pot". Fee menutup gas yang disponsori + margin,
dan scale dengan volume.

Parameter (terkunci):
- **feeBps = 200 (2%)**, **immutable** (set di constructor; ganti = redeploy)
- **Treasury = admin wallet** (fee dikirim ke `admin`)
- **Refund-safe**: bila `emergencyRefund`, fee dikembalikan penuh bersama tiket
  (service dianggap gagal; juga anti-troll)

Timing: kontrak **belum** deploy mainnet, jadi fee ditambahkan SEKARANG sebelum
mainnet cutover (#6) agar tidak perlu redeploy lagi nanti.

## What Changes

- **Contract `BitPactVault`**:
  - Tambah `uint16 public immutable feeBps` (di-set di constructor, cap aman ≤ 1000 = 10%).
  - `register()`: tarik `ticketPrice + fee` di mana `fee = ticketPrice * feeBps / 10000`.
    `prizePool += ticketPrice` (tidak berubah); `feePool += fee` (akumulasi terpisah).
  - `distributePrize()`: distribusi `prizePool` ke pemenang (TIDAK berubah —
    `sum(shares) == prizePool`), lalu kirim `feePool` ke `admin` (treasury).
  - `emergencyRefund()`: kembalikan `ticketPrice + fee` ke tiap peserta (fee tidak
    diambil saat refund).
  - Event baru `FeeCollected(eventId, amount)`.
- **Deploy script**: konstruktor sekarang `(_admin, _usdc, _feeBps)`; baca
  `PROTOCOL_FEE_BPS` dari env (default 200).
- **Frontend register**: approve `ticketPrice + fee` (mirror integer math
  kontrak), tampilkan rincian "Ticket X + 2% service fee = total" di UI register.
- **Frontend ABI/constants**: konstruktor ABI + getter `feeBps()`, konstanta
  `PROTOCOL_FEE_BPS = 200`.

## Capabilities

### New Capabilities
- `protocol-fee`: Platform mengambil entry surcharge `feeBps` yang **di-escrow**
  di kontrak dan hanya **diakui** (dikirim ke treasury) saat distribusi sukses;
  refund mengembalikan fee. Prize pool yang dibagikan ke pemenang TETAP 100%
  dari jumlah tiket (fee tidak mengurangi pool).

## Impact

- **Contract** (`contracts/src/BitPactVault.sol`): konstruktor, struct (+`feePool`),
  `register`, `distributePrize`, `emergencyRefund`, event baru, getter `feeBps`.
- **Contract tests**: existing tests pakai `feeBps = 0` (perilaku identik, minim
  churn); tambah suite `feeBps = 200` untuk register/distribute/refund + cap.
- **Deploy** (`contracts/script/Deploy.s.sol`): param feeBps + env `PROTOCOL_FEE_BPS`.
- **Frontend**:
  - `events/[id]/page.tsx`: hitung fee, approve `ticket+fee`, tampilkan breakdown.
  - `constants/index.ts`: ABI konstruktor + `feeBps()` getter + `PROTOCOL_FEE_BPS`.
- **Backend**: **TIDAK berubah** — settlement membaca `prizePool` (tidak termasuk
  fee), `distributePrize(winners, shares)` tetap, fee ditangani kontrak internal.
- **Docs**: `contracts/README.md` tambah section "Protocol Fee".
- **Redeploy**: Sepolia perlu redeploy (bytecode berubah) untuk testing; mainnet
  bawa versi ber-fee di cutover (#6).

## Non-Goals

- Fee yang bisa diubah admin (dipilih immutable untuk trustless).
- Treasury wallet terpisah (dipilih admin wallet).
- Tier / dynamic fee per event.
