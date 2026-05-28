## ADDED Requirements

### Requirement: Entry surcharge fee, pool tetap utuh
Kontrak MUST mengenakan protocol fee sebesar `feeBps` (basis points) sebagai
**surcharge di atas ticket price**, bukan potongan dari prize pool. Saat
`register`, peserta MUST membayar `ticketPrice + (ticketPrice * feeBps / 10000)`.
`prizePool` yang nanti dibagikan ke pemenang MUST tetap sama dengan jumlah
`ticketPrice` (fee TIDAK mengurangi pool). `feeBps` MUST immutable (di-set di
constructor) dan MUST ditolak bila melebihi cap 1000 (10%).

#### Scenario: Register membayar tiket + fee
- **GIVEN** vault dengan `feeBps = 200` dan event ticketPrice 5 USDC
- **WHEN** peserta `register` (sudah approve `ticket + fee`)
- **THEN** kontrak menarik `5 + 0.10 = 5.10 USDC`
- **AND** `prizePool` bertambah 5 USDC (bukan 5.10)
- **AND** akumulasi fee bertambah 0.10 USDC

#### Scenario: Constructor menolak fee terlalu tinggi
- **WHEN** kontrak di-deploy dengan `feeBps > 1000`
- **THEN** konstruktor revert ("fee too high")

### Requirement: Fee diakui saat distribusi, pemenang dapat pool penuh
Saat `distributePrize`, kontrak MUST tetap mensyaratkan `sum(shares) == prizePool`
dan membagikan seluruh `prizePool` ke pemenang. Setelah itu kontrak MUST
mengirim akumulasi fee ke treasury (admin wallet) dan mengemit `FeeCollected`.

#### Scenario: Distribusi mengirim fee ke admin
- **GIVEN** 3 peserta sudah register di vault `feeBps = 200`, ticket 5 USDC
- **WHEN** `distributePrize` dipanggil (shares = pembagian dari 15 USDC pool)
- **THEN** pemenang menerima total 15 USDC (100% pool)
- **AND** admin (treasury) menerima 0.30 USDC (akumulasi fee)
- **AND** event `FeeCollected` ter-emit dengan amount 0.30 USDC

### Requirement: Refund mengembalikan tiket + fee
Saat `emergencyRefund`, kontrak MUST mengembalikan `ticketPrice + fee` ke setiap
peserta (fee tidak diambil bila tidak ada distribusi sukses), dan menguras
`prizePool` serta akumulasi fee menjadi nol.

#### Scenario: Refund mengembalikan fee
- **GIVEN** 3 peserta register di vault `feeBps = 200`, ticket 5 USDC
  (vault memegang 15.30 USDC)
- **WHEN** `emergencyRefund` dipanggil
- **THEN** tiap peserta menerima 5.10 USDC kembali
- **AND** saldo USDC vault untuk event itu menjadi 0
- **AND** admin TIDAK menerima fee

### Requirement: Frontend menampilkan rincian fee & approve total
Frontend MUST menghitung fee dengan integer math yang sama dengan kontrak
(`ticketUnits * feeBps / 10000`), meng-approve `ticket + fee`, dan menampilkan
rincian biaya kepada peserta sebelum register.

#### Scenario: UI register menampilkan breakdown
- **WHEN** peserta membuka panel register event ber-fee
- **THEN** ditampilkan rincian "Ticket {price} + service fee 2% ({fee}) = {total} USDC"
- **AND** approve yang dikirim sebesar `{total}` (ticket + fee), bukan hanya ticket
