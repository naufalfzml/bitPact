## 1. Contract — fee logic

- [x] 1.1 Tambah `uint16 public immutable feeBps` + konstanta `MAX_FEE_BPS=1000`,
      `BPS_DENOMINATOR=10000`. Konstruktor jadi `(_admin, _usdc, _feeBps)` dengan
      `require(_feeBps <= MAX_FEE_BPS, "fee too high")`.
- [x] 1.2 Tambah `uint256 feePool` ke struct `EventInfo`.
- [x] 1.3 Tambah event `FeeCollected(bytes32 indexed eventId, uint256 amount)`.
- [x] 1.4 `register()`: hitung `fee = ticketPrice*feeBps/10000`, tarik
      `ticketPrice + fee`, `prizePool += ticketPrice`, `feePool += fee`.
- [x] 1.5 `distributePrize()`: setelah transfer shares, kirim `feePool` ke `admin`
      (jika > 0), reset `feePool`, emit `FeeCollected`.
- [x] 1.6 `emergencyRefund()`: refund `ticketPrice + feePerPerson` per peserta,
      reset `prizePool` & `feePool`.
- [x] 1.7 Update NatSpec (register/distribute/refund/constructor) sebut fee.

## 2. Contract tests

- [x] 2.1 Update semua `new BitPactVault(admin, token)` di
      `test/BitPactVault.t.sol` + `test/BitPactVaultFlow.t.sol` menjadi
      `(..., 0)` (feeBps 0 → perilaku identik, assertion lama valid).
- [x] 2.2 Tambah suite fee (feeBps=200): register menarik ticket+fee &
      prizePool==ticket; distribute → admin dapat feePool & pemenang dapat pool penuh;
      refund → tiap peserta dapat ticket+fee; constructor revert bila feeBps>1000.
- [x] 2.3 `forge test` — semua hijau.

## 3. Deploy script

- [x] 3.1 `Deploy.s.sol`: konstruktor `new BitPactVault(adminWallet, usdcToken, feeBps)`,
      `uint16 feeBps = uint16(vm.envOr("PROTOCOL_FEE_BPS", uint256(200)))`, log feeBps.

## 4. Frontend ABI + constants

- [x] 4.1 `constants/index.ts`: ABI konstruktor tambah input `_feeBps` (uint16);
      tambah getter `feeBps()` ke ABI; tambah `export const PROTOCOL_FEE_BPS = 200`.

## 5. Frontend register UI

- [x] 5.1 `events/[id]/page.tsx` `handleRegister`: hitung
      `feeUnits = ticketPriceUnits * BigInt(PROTOCOL_FEE_BPS) / 10000n`,
      approve `ticketPriceUnits + feeUnits`.
- [x] 5.2 Tampilkan breakdown di panel register: "Ticket {price} + {fee} service
      fee (2%) = {total} USDC" sebelum tombol register.

## 6. Verifikasi + commit

- [x] 6.1 `cd contracts && forge test` — hijau (existing + suite fee).
- [x] 6.2 `cd backend && npm test` — 76 tetap hijau (backend tak berubah).
- [x] 6.3 `cd frontend && npm run build` — sukses.
- [x] 6.4 `contracts/README.md`: tambah section "Protocol Fee".
- [ ] 6.5 Commit batched:
      - `feat(contracts): add 2% protocol fee as escrowed entry surcharge` (contract + tests + deploy + ABI + docs)
      - `feat(frontend): charge ticket + 2% service fee on register` (register approve + breakdown UI + PROTOCOL_FEE_BPS)
- [ ] 6.6 *(user)* Redeploy Sepolia dengan `PROTOCOL_FEE_BPS=200`, smoke test register fee.
