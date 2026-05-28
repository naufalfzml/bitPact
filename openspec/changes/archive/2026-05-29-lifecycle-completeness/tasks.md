## 1. Backend — FFA bisa dijalankan (F4)

- [x] 1.1 Di `backend/routes/events.js` endpoint `POST /:id/start`: bungkus guard
      bracket-kosong (`!brackets || brackets.length === 0`) dan validasi slot 1v1 dalam
      `if (event.game_mode !== "ffa") { ... }`, sehingga FFA melewati keduanya.
- [x] 1.2 Pastikan validasi minimal 2 peserta tetap berjalan untuk SEMUA mode (termasuk
      FFA) dan tetap di luar blok khusus non-ffa.
- [x] 1.3 Di endpoint `POST /:id/select-game-mode`: pastikan `game_mode === "ffa"`
      diterima sebagai mode sah (lolos validasi mode bila ada whitelist), mem-persist
      `game_mode`, tidak membuat bracket, dan respons `matches_count: 0`.

## 2. Backend — Resolusi konsensus saat timeout (F5)

- [x] 2.1 Ubah signature `resolveConsensus(eventId)` menjadi
      `resolveConsensus(eventId, isTimeout = false)`.
- [x] 2.2 Ganti early-return `if (!votes || votes.length === 0) return;`: bila
      `!isTimeout` tetap `return`; bila `isTimeout` jalankan `emergencyRefund` on-chain
      (pola try/catch + `waitForTransactionReceipt` seperti cabang refund existing) lalu
      `update({ status: "ended" })` dan `return`.
- [x] 2.3 Verifikasi cabang ≥1 vote (resolusi normal) dan dua pemanggil non-cron
      (`events.js` ~782 dan ~1210) tetap tidak berubah perilakunya (default
      `isTimeout = false`).
- [x] 2.4 Di `backend/cron/autoAbstain.js`: ubah pemanggilan menjadi
      `await resolveConsensus(event.id, true)`.

## 3. Frontend — UI FFA (F4)

- [x] 3.1 Di `frontend/src/app/events/[id]/page.tsx`: perluas tipe state
      `selectedGameMode` dari `"1v1" | "team"` menjadi `"1v1" | "team" | "ffa"`.
- [x] 3.2 Tambah `<option value="ffa">` pada selector `select-game-mode` di tampilan
      `setup && roster_locked && brackets.length === 0`.
- [x] 3.3 Sediakan jalur start untuk FFA: ketika `selectedGameMode === "ffa"`, tombol
      utama mem-persist mode via `select-game-mode` lalu memanggil `/start` (langsung
      ke `active`), alih-alih hanya "GENERATE BRACKET DRAFT". Perilaku tombol untuk
      `1v1`/`team` tidak berubah.
- [ ] 3.4 Smoke check manual: pilih FFA → start → tampilan `active` FFA (input top-3)
      muncul; submit winner → status `voting`.

## 4. Tests & verifikasi

- [x] 4.1 Update `backend/test/consensus.test.js`: tambahkan parameter `isTimeout` ke
      `resolveDecision` (replika logika). `EDGE: zero votes` → dengan `isTimeout=true`
      mengembalikan `action: "refund"`; tanpa `isTimeout` tetap `action: "none"`.
- [x] 4.2 Tambah test guard `/start` (logika murni / mock): `game_mode=ffa` dengan 0
      bracket LOLOS guard; `game_mode=1v1` dengan 0 bracket DITOLAK.
- [x] 4.3 Jalankan `cd backend && npm test` — pastikan semua hijau (test yang diubah di
      4.1-4.2 sesuai harapan, sisanya tetap lulus).
- [x] 4.4 Jalankan `cd contracts && forge test` — pastikan 25 test contract tetap hijau.
- [ ] 4.5 Konfirmasi total tetap **69 test** hijau (kecuali yang sengaja diperbarui di
      4.1-4.2 sesuai tabel dampak test di FIX_PLAN.md).
