## Why

`escrow-payout-integrity` (sudah di-archive) menambahkan status `settlement_failed`,
kolom `settlement_error` + `settlement_tx_hash`, dan endpoint
`POST /api/events/:id/retry-settlement` di backend. **Tetapi frontend belum tahu
status ini sama sekali** (temuan N2 & N20 di [AUDIT.md](../../../AUDIT.md)).

Saat ini, bila settlement on-chain gagal: status di DB menjadi `settlement_failed`,
tetapi:
- `EventDetail.status` type union ([events/[id]/page.tsx:35](../../../frontend/src/app/events/[id]/page.tsx#L35))
  tidak menyertakan `settlement_failed` → TypeScript silent narrowing.
- Tidak ada cabang render yang menampilkan banner kegagalan.
- Tidak ada tombol "Retry Settlement" yang memanggil `/retry-settlement`.
- Tidak ada badge / filter di home page list.
- `settlement_error` tidak pernah ditampilkan — creator tak tahu kenapa gagal.

Hasilnya: dana ter-escrow di-vault, backend tahu cara recovery, tetapi creator
secara praktis stuck di UI generik "No admin actions required". Ini menghapus
seluruh value dari pekerjaan F2 sebelumnya.

## What Changes

- **Type & API surface**: perluas `EventDetail.status` union dengan
  `"settlement_failed"`. `GET /api/events/:id` MUST mengembalikan kolom
  `settlement_error` dan `settlement_tx_hash` saat tersedia.
- **Banner kegagalan**: di event detail page, tambah cabang render saat
  `status === "settlement_failed"` yang menampilkan `settlement_error`
  (bukan pesan generik) dan link ke transaksi gagal di Blockscout bila
  `settlement_tx_hash` ada.
- **Tombol retry (creator-only)**: tombol "■ Retry Settlement ■" yang
  memanggil `POST /api/events/:id/retry-settlement` dengan
  `{ caller_address: address }`, menampilkan loading state, dan re-fetch
  detail saat sukses.
- **Badge di home page**: tambah class `bp-badge-settlement_failed`
  (warna destructive) di [globals.css](../../../frontend/src/app/globals.css)
  dan render saat `event.status === "settlement_failed"`.
- **Filter di home page**: stage filter `"ended"` saat ini sudah mencakup
  `voting`/`disputed` → tambahkan `settlement_failed` juga (event yang
  effectively selesai tapi butuh attention) supaya tidak hilang dari
  list.

## Capabilities

### New Capabilities
- `settlement-recovery-ui`: Frontend MUST mengekspos status `settlement_failed`
  sebagai state yang bisa dilihat user, menampilkan pesan error dari backend,
  dan menyediakan jalur retry untuk creator.

## Impact

- **Backend**:
  - `backend/routes/events.js`: `GET /api/events/:id` saat ini sudah `select("*")`,
    jadi `settlement_error` & `settlement_tx_hash` sudah ikut. Cukup pastikan
    response shape mengandung kedua field tersebut (boleh `null`).
- **Frontend**:
  - `frontend/src/app/events/[id]/page.tsx`: perluas type union, tambah cabang
    render `settlement_failed`, tambah handler `handleRetrySettlement`.
  - `frontend/src/app/page.tsx`: include `settlement_failed` di filter `"ended"`,
    render badge.
  - `frontend/src/app/globals.css`: class `.bp-badge-settlement_failed`.
- **Tests**:
  - Tidak ada perubahan test backend (perilaku backend sudah benar).
  - Smoke check manual: paksa `events.status = 'settlement_failed'` lewat SQL → buka
    UI → lihat banner + tombol retry; klik retry → status jadi `ended`.
