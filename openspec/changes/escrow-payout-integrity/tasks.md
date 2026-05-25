## 1. Migrasi schema (F2)

- [ ] 1.1 Buat `backend/migrations/003_add_settlement_status.sql` yang `DROP CONSTRAINT IF EXISTS events_status_check`, lalu `ADD CONSTRAINT events_status_check CHECK (status IN ('setup','active','voting','ended','disputed','settlement_failed'))`
- [ ] 1.2 Pada migrasi yang sama, `ADD COLUMN IF NOT EXISTS settlement_error TEXT` dan `ADD COLUMN IF NOT EXISTS settlement_tx_hash TEXT`
- [ ] 1.3 Verifikasi migrasi idempoten (aman dijalankan dua kali)

## 2. F3 — Hentikan peserta tanpa deposit (D1)

- [ ] 2.1 Di `backend/routes/events.js` endpoint register, hapus total cabang `if (tx_hash === "social-connect-invite") { … }` ([events.js:306-310](../../../backend/routes/events.js#L306-L310))
- [ ] 2.2 Hapus semua guard `if (tx_hash !== "social-connect-invite")` sehingga verifikasi Blockscout + RPC + `isParticipant` berlaku untuk SEMUA registrasi
- [ ] 2.3 Di `frontend/src/app/events/[id]/page.tsx`, hapus fungsi `handleAddResolvedPlayer` dan state `addingViaLookup` yang menjadi tak terpakai
- [ ] 2.4 Pastikan alur invite Social Connect memakai `handleAddToWhitelist` → `POST /api/events/:id/whitelist` (bukan `/register`)

## 3. F1 — Pool dari state on-chain

- [ ] 3.1 Refactor blok settlement `resolveConsensus` menjadi helper internal `settleEvent(event, { isDistribute })` agar dipakai ulang oleh endpoint retry
- [ ] 3.2 Di jalur distribusi, baca `prizePool` via `publicClient.readContract({ functionName: "getEventInfo", args: [eventIdBytes32] })` dan hapus perhitungan `parseUnits(String(ticket_price * allParticipants.length), 6)` ([events.js:1325-1334](../../../backend/routes/events.js#L1325-L1334))
- [ ] 3.3 Hitung `shares` dari `prizePool` on-chain dengan remainder ke pemenang terakhir sehingga `sum(shares) === prizePool`

## 4. F2 — Gating status & retry (D4)

- [ ] 4.1 Di `settleEvent`, set `status: "ended"` HANYA di dalam blok sukses setelah `waitForTransactionReceipt` mengembalikan `status === "success"`; simpan `settlement_tx_hash` dan kosongkan `settlement_error`
- [ ] 4.2 Pada kegagalan/`reverted`/exception, set `status: "settlement_failed"` + simpan `settlement_error` + `settlement_tx_hash` (bila ada); jangan set `ended`
- [ ] 4.3 Tambahkan cek idempotensi: jika `getEventInfo.distributed === true`, set `ended` tanpa mengirim transaksi baru
- [ ] 4.4 Tambah endpoint `POST /api/events/:id/retry-settlement` dengan guard creator/admin dan guard `status === "settlement_failed"`; jalankan ulang `settleEvent`

## 5. Test (jaga 69 test hijau kecuali yang sengaja diubah)

- [ ] 5.1 Ubah `backend/test/prizePool.test.js`: karakterisasi `BUG: phantom DB participant…` menjadi assertion bahwa shares dihitung dari `prizePool` on-chain dan `sum(shares) === onChainPool`
- [ ] 5.2 Tambah test resolusi: status hanya `ended` jika receipt sukses; receipt gagal/`reverted` → `settlement_failed` + `settlement_error` tersimpan (mock chain)
- [ ] 5.3 Tambah test guard endpoint retry: 403 untuk non-creator, 400 jika status bukan `settlement_failed`, sukses → `ended`
- [ ] 5.4 Jalankan `cd contracts && forge test` dan `cd backend && npm test`; pastikan seluruh suite hijau (69 test, kecuali yang diubah di 5.1)
