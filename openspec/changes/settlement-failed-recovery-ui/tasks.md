## 1. Type & API surface

- [ ] 1.1 Perluas `EventDetail.status` di
      [frontend/src/app/events/[id]/page.tsx:35](../../../frontend/src/app/events/[id]/page.tsx#L35)
      menjadi `"setup" | "active" | "voting" | "ended" | "disputed" | "settlement_failed"`.
- [ ] 1.2 Tambah field `settlement_error?: string | null` dan `settlement_tx_hash?: string | null`
      pada interface `EventDetail` yang sama.
- [ ] 1.3 Perluas tipe `Event.status` di
      [frontend/src/app/page.tsx:13](../../../frontend/src/app/page.tsx#L13) untuk
      menyertakan `"settlement_failed"`.

## 2. Helper explorer URL

- [ ] 2.1 Tambah helper `getTxExplorerUrl(txHash: string)` di
      [frontend/src/constants/index.ts](../../../frontend/src/constants/index.ts)
      yang membaca `process.env.NEXT_PUBLIC_CELO_NETWORK` dan kembalikan URL
      Blockscout (`mainnet`/`alfajores`/`sepolia`).

## 3. Banner kegagalan + tombol retry (creator)

- [ ] 3.1 Di event detail page, tambah state lokal `isRetrying`, `retryError`.
- [ ] 3.2 Render banner full-width sebelum `bp-dashboard-layout` saat
      `event.status === "settlement_failed"`. Tampilkan:
      - judul "■ SETTLEMENT FAILED ■"
      - `event.settlement_error` di `<pre>` monospace
      - link "View Failed Tx" bila `event.settlement_tx_hash` ada
      - tombol "■ RETRY SETTLEMENT ■" hanya jika `isCreator` (disabled saat `isRetrying`)
      - banner `retryError` di bawah tombol bila ada.
- [ ] 3.3 Tambah handler `handleRetrySettlement`:
      - POST ke `/api/events/:id/retry-settlement` dengan `{ caller_address: address }`.
      - Sukses → `fetchEventDetail()`.
      - Gagal → set `retryError` (gunakan `data.error || data.detail`).
- [ ] 3.4 Pastikan creator panel default (block `!["setup","active","voting","disputed"].includes(event.status)`)
      TIDAK lagi menampilkan pesan generik untuk `settlement_failed` — banner di atas
      sudah lebih informatif. Update guard tersebut.

## 4. Filter & badge di home

- [ ] 4.1 Di [page.tsx:53-55](../../../frontend/src/app/page.tsx#L53), perluas filter
      `"ended"` agar juga match `event.status === "settlement_failed"`.
- [ ] 4.2 Render badge `bp-badge-settlement_failed` saat status itu (bersebelahan
      dengan badge access type) — teks badge: "RECOVERY".

## 5. CSS

- [ ] 5.1 Tambah class `.bp-badge-settlement_failed` di
      [frontend/src/app/globals.css](../../../frontend/src/app/globals.css)
      (palette destructive, sama pola dengan `.bp-badge-disputed`).
- [ ] 5.2 Tambah class `.bp-settlement-banner` (turunan `bp-card bp-panel-destructive`,
      full-width, padding lebih besar, ada blink di judul).

## 6. Verifikasi

- [ ] 6.1 `cd frontend && npm run build` — pastikan tidak ada type error.
- [ ] 6.2 `cd backend && npm test` — pastikan **88 test tetap hijau** (tidak ada test
      backend yang berubah).
- [ ] 6.3 Smoke check manual: paksa `UPDATE events SET status='settlement_failed',
      settlement_error='Mock failure for UI smoke', settlement_tx_hash='0xabcdef'
      WHERE id='<test-event-id>';` → buka UI sebagai creator → lihat banner +
      tombol retry → klik retry → verifikasi flow (status ended bila berhasil,
      tetap `settlement_failed` bila gagal lagi).
- [ ] 6.4 Smoke check home page: event `settlement_failed` muncul di filter
      `"ended"` AND tampil badge "RECOVERY".

## 7. Commit plan (1 commit per task group)

- [ ] 7.1 `feat(frontend): surface settlement_failed status in EventDetail types` (1.1–1.3)
- [ ] 7.2 `feat(frontend): add explorer url helper` (2.1)
- [ ] 7.3 `feat(frontend): render settlement_failed banner with retry for creator` (3.1–3.4 + 5.2)
- [ ] 7.4 `feat(frontend): include settlement_failed in home list filter and badge` (4.1–4.2 + 5.1)
