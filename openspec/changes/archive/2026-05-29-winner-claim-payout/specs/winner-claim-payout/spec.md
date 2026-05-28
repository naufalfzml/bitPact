## ADDED Requirements

### Requirement: Distribusi mencatat saldo claimable (bukan push)
Saat `distributePrize`, kontrak MUST tetap mensyaratkan `sum(shares) ==
prizePool` dan MUST **mencatat** `claimable[winner] += share` untuk tiap pemenang
alih-alih mentransfer langsung. Kontrak MUST menandai event sebagai distributed
dan MUST tetap mengirim akumulasi fee ke treasury (admin). Saldo USDC pemenang
MUST TIDAK berubah pada langkah distribusi ini.

#### Scenario: Distribusi mencatat claimable & mengirim fee
- **GIVEN** 3 peserta sudah register di vault ber-fee, ticket 5 USDC (pool 15 USDC)
- **WHEN** `distributePrize` dipanggil dengan shares yang berjumlah 15 USDC
- **THEN** saldo USDC tiap pemenang TIDAK berubah pada saat ini
- **AND** `claimableOf(eventId, winner)` bertambah sesuai share pemenang
- **AND** admin (treasury) menerima akumulasi fee
- **AND** event ditandai distributed

### Requirement: Pemenang menarik hadiah via claim
Kontrak MUST menyediakan `claim(eventId)` yang dapat dipanggil oleh siapa pun
yang memiliki saldo claimable > 0. Fungsi MUST mentransfer seluruh saldo
claimable pemanggil untuk event itu ke pemanggil, MUST menolkan saldo tersebut
sebelum transfer (checks-effects-interactions), dan MUST mengemit `PrizeClaimed`.
Pemanggilan `claim` saat saldo claimable nol MUST revert (`NothingToClaim`).

#### Scenario: Pemenang berhasil claim
- **GIVEN** distribusi sudah mencatat `claimableOf(eventId, alice) = 10 USDC`
- **WHEN** alice memanggil `claim(eventId)`
- **THEN** alice menerima 10 USDC
- **AND** `claimableOf(eventId, alice)` menjadi 0
- **AND** event `PrizeClaimed(eventId, alice, 10 USDC)` ter-emit

#### Scenario: Double-claim ditolak
- **GIVEN** alice sudah meng-claim hadiahnya (claimable = 0)
- **WHEN** alice memanggil `claim(eventId)` lagi
- **THEN** transaksi revert dengan `NothingToClaim`

#### Scenario: Non-pemenang tidak bisa claim
- **GIVEN** bob bukan pemenang (`claimableOf(eventId, bob) = 0`)
- **WHEN** bob memanggil `claim(eventId)`
- **THEN** transaksi revert dengan `NothingToClaim`

### Requirement: Kegagalan claim terisolasi per pemenang
Kontrak MUST mengisolasi kegagalan transfer per pemenang: karena pembayaran
bersifat pull, kegagalan transfer satu pemenang (mis. ter-blacklist USDC) MUST
TIDAK menghalangi pemenang lain meng-claim. Langkah `distributePrize` MUST TIDAK
lagi revert akibat satu penerima ter-blacklist (sebab tidak ada transfer ke
pemenang saat distribusi).

#### Scenario: Satu pemenang blacklist tidak mengunci yang lain
- **GIVEN** distribusi mencatat claimable untuk alice, bob (ter-blacklist), carol
- **WHEN** alice dan carol memanggil `claim`
- **THEN** alice dan carol berhasil menerima hadiahnya
- **AND** hanya `claim` milik bob yang revert saat ia mencoba
- **AND** `distributePrize` sendiri tidak revert meski bob ter-blacklist

### Requirement: Frontend tombol Claim & tx hash
Frontend MUST menampilkan tombol Claim bagi pemenang saat event `ended` dan
`claimableOf(account) > 0`, mengirim transaksi `claim` yang ditandatangani
pemenang (pemenang membayar gas sendiri), dan setelah sukses MUST menampilkan tx
hash sebagai notifikasi toast di pojok layar.

#### Scenario: Pemenang meng-claim dari UI
- **GIVEN** event berstatus `ended` dan wallet pemenang punya claimable > 0
- **WHEN** pemenang membuka halaman detail event
- **THEN** tampil tombol "■ Claim Prize ■" beserta jumlah yang bisa diklaim
- **WHEN** pemenang menekan tombol dan transaksi `claim` sukses
- **THEN** muncul toast pojok berisi tx hash (tautan explorer)
- **AND** tombol berubah menjadi status sudah di-claim
