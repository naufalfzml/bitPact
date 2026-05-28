## 1. Backend — eligibility helper + verify-access

- [x] 1.1 Ekstrak guard off-chain `/register` ke helper async
      `checkRegistrationEligibility(eventId, walletAddress, password, deps)`
      yang return `{ ok, event } | { ok:false, code, error }`. Deps
      `supabase` + `getRegeneratedReputation` injectable.
- [x] 1.2 Refactor `POST /:id/register` agar memakai helper (ganti blok guard
      inline), lalu lanjut verifikasi on-chain + insert seperti semula.
- [x] 1.3 Tambah endpoint `POST /:id/verify-access` yang menjalankan helper dan
      mengembalikan `200 { ok:true }` atau `code` + `error`.
- [x] 1.4 Export `checkRegistrationEligibility` untuk test.

## 2. Backend — hapus remove-participant

- [x] 2.1 Hapus blok `router.post("/:id/remove-participant", ...)` di events.js.
- [x] 2.2 Hapus / update test smoke `remove-participant without fields => 400`.
- [x] 2.3 Tambah test smoke `verify-access`: tanpa `wallet_address` → 400.

## 3. Frontend — pre-check + hapus DEL

- [x] 3.1 `handleRegister`: sebelum approve, panggil `POST /:id/verify-access`
      dengan `{ wallet_address, password }`. Gagal → toast.error +
      (untuk password) set `passwordError`, lalu `return` tanpa deposit.
- [x] 3.2 Hapus tombol `bp-btn-delete` + handler inline-nya di tabel roster.
- [x] 3.3 Hapus kolom header "ACTION" yang hanya berisi tombol DEL.

## 4. Verifikasi + commit

- [x] 4.1 `cd backend && npm test` — hijau (remove-participant test hilang,
      verify-access test baru lulus).
- [x] 4.2 `cd frontend && npm run build` — sukses.
- [x] 4.3 Commit batched (bukan per-file):
      - `feat: validate registration eligibility before on-chain deposit` (backend helper + verify-access + register refactor + frontend pre-check)
      - `chore: remove unsafe remove-participant feature` (backend endpoint + frontend DEL button + test)
