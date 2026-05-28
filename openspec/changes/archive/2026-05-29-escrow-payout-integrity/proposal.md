## Why

Dana escrow bisa terkunci secara senyap atau gagal didistribusikan karena tiga cacat
yang saling menguatkan (temuan K1 & K2 di [TESTING.md](../../../TESTING.md)):
`resolveConsensus` menghitung pool dari **jumlah baris DB** alih-alih `prizePool`
on-chain (F1), status event di-set `ended` walau transaksi distribusi/refund **gagal**
(F2), dan path `tx_hash: "social-connect-invite"` membuat baris peserta **tanpa deposit
on-chain** (F3). Kombinasinya: peserta "hantu" menggelembungkan pool → `distributePrize`
revert `SharesMismatch` → error ditelan → DB bilang "selesai" padahal dana tak cair.

## What Changes

- **F1 — Pool dari state on-chain**: `resolveConsensus` membaca `prizePool` nyata via
  `getEventInfo(eventId)` dan membagi pool itu ke pemenang (sisa pembulatan ke pemenang
  terakhir). Tidak lagi menghitung `ticket_price × jumlah baris DB`.
- **F2 — Status `ended` hanya jika receipt sukses (D4)**: pindahkan
  `update({ status: "ended" })` ke DALAM blok sukses setelah
  `waitForTransactionReceipt` mengembalikan `status === "success"`. Bila gagal/revert:
  set status baru **`settlement_failed`**, simpan `settlement_error` + `settlement_tx_hash`,
  dan sediakan endpoint retry `POST /api/events/:id/retry-settlement` (creator/admin only).
- **F3 — Hentikan peserta tanpa deposit (BREAKING, D1)**: hapus **total** cabang bypass
  `tx_hash === "social-connect-invite"` di endpoint register. Social Connect untuk
  invite-only HANYA mengisi whitelist (`POST /api/events/:id/whitelist`); peserta yang
  diundang tetap wajib `register` + deposit on-chain normal.
- **Migrasi schema**: tambah `backend/migrations/003_add_settlement_status.sql` yang
  memperluas CHECK status `events` dengan `settlement_failed` dan menambah kolom
  `settlement_error` + `settlement_tx_hash`.

## Capabilities

### New Capabilities
- `escrow-settlement-integrity`: Sumber kebenaran pool & shares adalah state on-chain
  (`getEventInfo`), dan transisi status settlement mencerminkan hasil transaksi nyata
  (sukses → `ended`, gagal → `settlement_failed`) dengan jalur retry.
- `verified-participation`: Setiap baris `participants` HARUS punya deposit on-chain
  terverifikasi; Social Connect hanya menulis whitelist, bukan roster.

### Modified Capabilities
<!-- Tidak ada spec di openspec/specs/ yang requirement-nya berubah; F3 menghapus
     perilaku bypass yang tidak pernah ditulis sebagai requirement formal. -->

## Impact

- **Backend**:
  - `backend/routes/events.js`: `resolveConsensus` (baca pool on-chain, gerbang status,
    blok `settlement_failed`), endpoint register (hapus bypass), endpoint baru
    `POST /api/events/:id/retry-settlement`.
  - `backend/migrations/003_add_settlement_status.sql` (baru).
- **Frontend**:
  - `frontend/src/app/events/[id]/page.tsx`: hapus `handleAddResolvedPlayer`
    (dead path yang memakai `social-connect-invite`); alur invite memakai
    `handleAddToWhitelist` ke endpoint whitelist.
- **Tests** (lihat tabel "Dampak ke test" di [FIX_PLAN.md](../../../FIX_PLAN.md)):
  - `backend/test/prizePool.test.js`: karakterisasi `BUG: phantom DB participant…`
    diubah menjadi assertion bahwa shares dihitung dari pool on-chain.
  - Tambah test status settlement (`ended` hanya jika receipt sukses; gagal →
    `settlement_failed`).
  - Total **69 test** (forge + `npm test`) tetap hijau kecuali yang sengaja diubah.
