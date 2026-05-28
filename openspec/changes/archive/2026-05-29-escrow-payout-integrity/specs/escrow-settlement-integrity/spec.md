## ADDED Requirements

### Requirement: Pool dan shares dihitung dari state on-chain
Saat menyelesaikan event, sistem MUST membaca `prizePool` nyata dari kontrak melalui
`getEventInfo(eventId)` dan membagi pool tersebut ke para pemenang. Sistem MUST NOT
menghitung pool dari `ticket_price × jumlah baris peserta di DB`. Sisa pembagian
(remainder) MUST ditambahkan ke pemenang terakhir sehingga `sum(shares) === prizePool`.

#### Scenario: Konsensus tercapai, distribusi memakai pool on-chain
- **GIVEN** sebuah event berstatus `voting` dengan konsensus tercapai (≥ threshold)
- **WHEN** `resolveConsensus` berjalan
- **THEN** backend membaca `prizePool` via `getEventInfo`
- **AND** `sum(shares) === prizePool`
- **AND** `distributePrize` tidak pernah revert karena `SharesMismatch`

#### Scenario: Baris DB lebih banyak dari depositor on-chain tidak menggelembungkan pool
- **GIVEN** ada 4 baris peserta di DB tetapi hanya 3 deposit on-chain
- **WHEN** distribusi dijalankan
- **THEN** pool yang dibagikan sama dengan `prizePool` on-chain (3 deposit), bukan 4
- **AND** transaksi distribusi berhasil tanpa `SharesMismatch`

### Requirement: Status `ended` hanya setelah receipt on-chain sukses
Sistem MUST men-set `status: "ended"` HANYA setelah `waitForTransactionReceipt`
mengembalikan `status === "success"`. Jika transaksi distribusi atau refund gagal,
melempar exception, atau receipt-nya `reverted`, sistem MUST men-set status
`settlement_failed`, menyimpan pesan kegagalan di `settlement_error`, dan menyimpan hash
transaksi (bila ada) di `settlement_tx_hash`. Status MUST NOT menjadi `ended` saat
settlement gagal.

#### Scenario: Transaksi distribusi gagal
- **WHEN** transaksi `distributePrize` gagal atau receipt-nya `reverted`
- **THEN** status event TIDAK menjadi `ended`
- **AND** status menjadi `settlement_failed`
- **AND** `settlement_error` berisi pesan kegagalan
- **AND** `settlement_tx_hash` menyimpan hash transaksi bila tersedia

#### Scenario: Transaksi refund gagal
- **WHEN** konsensus tidak tercapai dan transaksi `emergencyRefund` gagal/`reverted`
- **THEN** status event menjadi `settlement_failed` (BUKAN `ended`)
- **AND** error tersimpan dan dapat di-retry

#### Scenario: Transaksi sukses
- **WHEN** receipt distribusi atau refund mengembalikan `status === "success"`
- **THEN** status event menjadi `ended`
- **AND** `settlement_tx_hash` menyimpan hash transaksi yang sukses

### Requirement: Settlement yang gagal dapat di-retry
Sistem MUST menyediakan endpoint `POST /api/events/:id/retry-settlement` yang HANYA
boleh diakses oleh creator event atau admin, dan HANYA berlaku saat status event
`settlement_failed`. Retry MUST menjalankan ulang jalur settlement yang sama dengan
gating receipt yang sama. Jika receipt mengembalikan `status === "success"`, status
menjadi `ended`; jika gagal lagi, status tetap `settlement_failed` dengan
`settlement_error` terbaru.

#### Scenario: Retry oleh creator setelah perbaikan
- **GIVEN** event berstatus `settlement_failed`
- **WHEN** creator memanggil `POST /api/events/:id/retry-settlement` dan transaksi sukses
- **THEN** status menjadi `ended`
- **AND** `settlement_error` dibersihkan dan `settlement_tx_hash` diperbarui

#### Scenario: Retry oleh pihak tak berwenang ditolak
- **WHEN** pemanggil bukan creator maupun admin
- **THEN** endpoint mengembalikan 403 dan status event tidak berubah

#### Scenario: Retry pada event yang bukan settlement_failed ditolak
- **WHEN** status event bukan `settlement_failed`
- **THEN** endpoint menolak permintaan (400) dan tidak mengirim transaksi on-chain

#### Scenario: Retry idempoten saat dana sudah terdistribusi on-chain
- **GIVEN** event berstatus `settlement_failed` tetapi `getEventInfo` melaporkan
  `distributed === true`
- **WHEN** creator memanggil retry
- **THEN** sistem TIDAK mengirim transaksi distribusi baru
- **AND** status diselaraskan menjadi `ended`

### Requirement: Schema events mendukung status kegagalan settlement
Tabel `events` MUST mengizinkan nilai `status` `settlement_failed` dan menyediakan kolom
`settlement_error` (TEXT) serta `settlement_tx_hash` (TEXT). Migrasi
`backend/migrations/003_add_settlement_status.sql` MUST bersifat idempoten.

#### Scenario: Migrasi memperluas constraint status
- **WHEN** migrasi `003_add_settlement_status.sql` dijalankan
- **THEN** CHECK status `events` mencakup `setup`, `active`, `voting`, `ended`,
  `disputed`, dan `settlement_failed`
- **AND** kolom `settlement_error` dan `settlement_tx_hash` tersedia
- **AND** menjalankan migrasi dua kali tidak menimbulkan error
