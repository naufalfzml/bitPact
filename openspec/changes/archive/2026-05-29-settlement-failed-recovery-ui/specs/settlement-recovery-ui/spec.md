## ADDED Requirements

### Requirement: Status `settlement_failed` ditampilkan ke user
Frontend MUST mengenali `settlement_failed` sebagai status valid pada event dan
MUST menampilkan banner yang mengandung pesan `settlement_error` apa adanya
ditambah link ke transaksi gagal bila `settlement_tx_hash` ada. Banner MUST
ditempatkan di tempat yang tidak mungkin dilewatkan (di atas dashboard layout
event detail).

#### Scenario: Event berstatus settlement_failed
- **GIVEN** `event.status === "settlement_failed"` dan `event.settlement_error` berisi pesan
- **WHEN** user membuka halaman detail event
- **THEN** banner "■ SETTLEMENT FAILED ■" muncul di atas dashboard
- **AND** `settlement_error` ditampilkan apa adanya (monospace)
- **AND** jika `settlement_tx_hash` ada, ada link "View Failed Tx" ke Blockscout

#### Scenario: settlement_tx_hash kosong
- **GIVEN** `event.status === "settlement_failed"` tanpa `settlement_tx_hash`
- **WHEN** banner dirender
- **THEN** banner tetap menampilkan judul + error
- **AND** link "View Failed Tx" tidak dirender

### Requirement: Tombol retry settlement untuk creator
Frontend MUST menampilkan tombol "Retry Settlement" pada banner kegagalan hanya
bila wallet yang terkoneksi adalah creator event. Tombol MUST memanggil
`POST /api/events/:id/retry-settlement` dengan body `{ caller_address }`. Hasil
sukses MUST mem-refresh detail event; gagal MUST menampilkan pesan error tepat
di bawah tombol (tidak menutup banner utama).

#### Scenario: Creator retry sukses
- **GIVEN** event `settlement_failed` dibuka oleh creator
- **WHEN** creator klik "Retry Settlement" dan endpoint mengembalikan `200 { status: "ended" }`
- **THEN** detail event di-refetch
- **AND** banner kegagalan menghilang karena status sekarang `ended`

#### Scenario: Creator retry gagal lagi
- **GIVEN** event `settlement_failed` dibuka oleh creator
- **WHEN** endpoint mengembalikan `502 { error, detail }`
- **THEN** banner kegagalan tetap muncul
- **AND** pesan error baru ditampilkan di bawah tombol retry
- **AND** tombol kembali enable untuk dicoba lagi

#### Scenario: Non-creator membuka event settlement_failed
- **GIVEN** event `settlement_failed`
- **WHEN** wallet bukan creator membuka detail
- **THEN** banner tetap muncul (informatif)
- **AND** tombol retry TIDAK dirender

### Requirement: Status `settlement_failed` masuk daftar default di home
Halaman home MUST menyertakan event berstatus `settlement_failed` di filter
default "ended" (event yang secara praktis selesai tapi butuh recovery), dan
MUST menampilkan badge khusus (mis. "RECOVERY") untuk membedakannya dari status
`ended` normal.

#### Scenario: Filter "ended" mencakup settlement_failed
- **GIVEN** ada event berstatus `settlement_failed` dan `ended`
- **WHEN** user memilih stage filter "ended"
- **THEN** kedua event muncul di list

#### Scenario: Badge recovery di home card
- **GIVEN** event `settlement_failed` di list home
- **WHEN** card di-render
- **THEN** ada badge dengan teks "RECOVERY" dan warna destructive
