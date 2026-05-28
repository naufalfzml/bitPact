## 1. Type & API surface

- [x] 1.1 Perluas `EventDetail.status` di
      [frontend/src/app/events/[id]/page.tsx:35](../../../frontend/src/app/events/[id]/page.tsx#L35)
      menjadi `"setup" | "active" | "voting" | "ended" | "disputed" | "settlement_failed"`.
- [x] 1.2 Tambah field `settlement_error?: string | null` dan `settlement_tx_hash?: string | null`
      pada interface `EventDetail` yang sama.
- [x] 1.3 Perluas tipe `Event.status` di
      [frontend/src/app/page.tsx:13](../../../frontend/src/app/page.tsx#L13) untuk
      menyertakan `"settlement_failed"`.

## 2. Helper explorer URL

- [x] 2.1 Tambah helper `getTxExplorerUrl(txHash: string)` di
      [frontend/src/constants/index.ts](../../../frontend/src/constants/index.ts)
      yang membaca `process.env.NEXT_PUBLIC_CELO_NETWORK` dan kembalikan URL
      Blockscout (`mainnet`/`alfajores`/`sepolia`).

## 3. Banner kegagalan + tombol retry (creator)

- [x] 3.1 Di event detail page, tambah state lokal `isRetrying`, `retryError`.
- [x] 3.2 Render banner full-width sebelum `bp-dashboard-layout` saat
      `event.status === "settlement_failed"`. Banner menampilkan judul
      blinking "■ SETTLEMENT FAILED ■", `settlement_error` di `<pre>`
      monospace, link "View Failed Tx" via `getTxExplorerUrl`, dan tombol
      retry untuk creator dengan local `retryError` di bawahnya.
- [x] 3.3 Tambah handler `handleRetrySettlement` yang POST ke
      `/api/events/:id/retry-settlement` dengan body `{ caller_address }`,
      refetch detail saat sukses, set `retryError` saat gagal.
- [x] 3.4 Update creator panel fallback agar `settlement_failed` tidak
      tampil sebagai "No admin actions"; sebaliknya tampilkan pesan ringan
      yang mengarahkan ke banner di atas.

## 4. Filter & badge di home

- [x] 4.1 Perluas filter `"ended"` di
      [page.tsx:53-55](../../../frontend/src/app/page.tsx#L53) agar juga match
      `event.status === "settlement_failed"`.
- [x] 4.2 Render badge `bp-badge-settlement_failed` dengan teks "RECOVERY"
      saat status itu, di group access-type badge.

## 5. CSS

- [x] 5.1 Tambah class `.bp-badge-settlement_failed` di
      [frontend/src/app/globals.css](../../../frontend/src/app/globals.css)
      (palette destructive + soft destructive background).
- [x] 5.2 Tambah class `.bp-settlement-banner` (border destructive double,
      destructive shadow, full-width spacing) di globals.css.

## 6. Verifikasi

- [x] 6.1 `cd frontend && npm run build` — sukses tanpa type error.
- [x] 6.2 `cd backend && npm test` — 69 test tetap hijau (tidak ada test
      backend yang berubah; angka ekspektasi awal di proposal 88 obsolete
      karena change sebelumnya menyentuh test).
- [ ] 6.3 Smoke check manual (pending user setelah deploy): paksa
      `UPDATE events SET status='settlement_failed',
      settlement_error='Mock failure for UI smoke',
      settlement_tx_hash='0xabcdef' WHERE id='<test-event-id>';` → buka
      UI sebagai creator → lihat banner + tombol retry → klik retry →
      verifikasi flow.
- [ ] 6.4 Smoke check home page (pending user): event `settlement_failed`
      muncul di filter `"ended"` AND tampil badge "RECOVERY".

## 7. Commit plan (1 commit per task group)

- [x] 7.1 `feat(frontend): surface settlement_failed status in EventDetail types` — `5bec135`
- [x] 7.2 `feat(frontend): add Celo explorer URL helper` — `9bd086b`
- [x] 7.3 `feat(frontend): render settlement_failed banner with retry for creator` — `294c2b1`
- [x] 7.4 `feat(frontend): include settlement_failed in home list filter and badge` — `aa8f14b`
