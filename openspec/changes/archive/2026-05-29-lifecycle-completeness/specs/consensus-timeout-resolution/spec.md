## ADDED Requirements

### Requirement: Resolusi konsensus membedakan timeout dari resolusi biasa
`resolveConsensus` MUST menerima penanda `isTimeout` (default `false`). Pemanggilan
non-timeout MUST mempertahankan perilaku sekarang: bila tidak ada vote sama sekali,
fungsi keluar tanpa aksi (agar resolve manual sebelum deadline tidak memicu penyelesaian
prematur). Cron auto-abstain MUST memanggil `resolveConsensus` dengan `isTimeout = true`
untuk event yang telah melewati deadline 24 jam sejak `winners_submitted_at`.

#### Scenario: Resolve non-timeout dengan 0 vote tidak melakukan apa-apa
- **GIVEN** event berstatus `voting` tanpa satu pun vote
- **WHEN** `resolveConsensus` dipanggil dengan `isTimeout = false`
- **THEN** tidak ada transaksi on-chain yang dikirim
- **AND** status event tetap `voting`

#### Scenario: Cron memanggil resolusi dengan flag timeout
- **GIVEN** event `voting` yang `winners_submitted_at`-nya lebih dari 24 jam lalu
- **WHEN** cron auto-abstain memprosesnya
- **THEN** cron memanggil `resolveConsensus(eventId, true)`

### Requirement: Timeout dengan 0 vote menjalankan emergency refund
Sistem MUST menjalankan `emergencyRefund` on-chain saat `isTimeout = true` dan tidak ada
vote sama sekali (`votes.length === 0`), lalu MUST memindahkan event keluar dari status
`voting` ke status akhir. Sistem MUST NOT membiarkan event macet di `voting`.
(Keputusan D2: 0 vote saat timeout → refund, bukan `disputed`.)

#### Scenario: 24 jam lewat tanpa vote → refund
- **GIVEN** event `voting` melewati deadline 24 jam tanpa satu pun vote
- **WHEN** resolusi timeout berjalan (`isTimeout = true`)
- **THEN** sistem memanggil `emergencyRefund` untuk event tersebut
- **AND** status event tidak lagi `voting`
- **AND** dana dikembalikan ke peserta (bukan dibekukan menunggu appeal)

### Requirement: Timeout dengan sebagian vote memakai vote yang masuk
Saat `isTimeout = true` dan ada ≥ 1 vote, sistem MUST menyelesaikan event memakai vote
yang telah masuk dengan aturan konsensus yang berlaku saat ini (tie → `disputed`,
≥ threshold → distribusi, < threshold → refund, band minority ≥ 85% / ≤ 15%). Non-voter
diperlakukan sebagai abstain (tidak dihitung).

#### Scenario: Timeout dengan mayoritas setuju → distribusi
- **GIVEN** event `voting` melewati 24 jam dengan sebagian peserta vote dan agree
  persen ≥ threshold
- **WHEN** resolusi timeout berjalan
- **THEN** sistem menyelesaikan memakai vote yang masuk (distribusi)
- **AND** status event mencapai status akhir

#### Scenario: Timeout dengan vote di bawah threshold → refund
- **GIVEN** event `voting` melewati 24 jam dengan agree persen di bawah threshold
- **WHEN** resolusi timeout berjalan
- **THEN** sistem menjalankan refund
- **AND** status event mencapai status akhir
