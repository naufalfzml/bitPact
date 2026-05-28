## 1. N5 — Deterministic bracket pairing

- [x] 1.1 Di [backend/routes/events.js:957-961](../../../backend/routes/events.js#L957-L961),
      tambah `.order("match_index", { ascending: true })` pada query
      `currentRoundMatches` di handler `POST /:id/bracket/advance`. Extract
      next-round generation ke helper `generateNextRoundBrackets` (pure,
      defensively sorts by `match_index`).
- [x] 1.2 Tambah unit test baru di `backend/test/bracket.test.js` (file baru):
      6 test memverifikasi pairing tetap deterministic untuk canonical / random
      / reverse input order, BYE handling untuk odd input, dan event_id/round
      propagation.
- [x] 1.3 `cd backend && npm test` — 69 test pass (63 existing + 6 baru).

## 2. N4 — Hapus endpoint leaderboard global

- [x] 2.1 Hapus handler `router.get("/leaderboard/reputation", ...)` di
      backend/routes/events.js (lines 1500-1530).
- [x] 2.2 Tidak ada test yang menyentuh `/leaderboard/reputation` di
      `backend/test/api.smoke.test.js` (verified by grep).
- [x] 2.3 `grep -rn "leaderboard" backend/` — zero references. Frontend
      page `/leaderboard/` masih ada, dihapus di change `frontend-polish-and-english`.
- [x] 2.4 `cd backend && npm test` — 69 test pass (jumlah tidak berubah; handler
      tidak punya test dedicated).

## 3. N7 — Drop `game_mode` dari create payload + UI badge gating

- [x] 3.1 Frontend create form: hapus baris `game_mode: "1v1"` dari body POST
      `/api/events`. Backend default ("1v1") tetap berlaku sampai
      `/select-game-mode` dipanggil.
- [x] 3.2 Frontend home page: gating badge mode — saat `event.status === "setup"`
      AND `!event.roster_locked` tampilkan badge "SETUP" generik; sebaliknya
      tampilkan mode actual. Copy "for X competition" juga disembunyikan saat
      mode masih tentative.
- [x] 3.3 Backend `GET /api/events` sudah menggunakan `select("*, participants(count)")`
      jadi field `roster_locked` sudah ikut response. Verified.
- [x] 3.4 Frontend detail page: gating sama — saat `status === "setup" && !roster_locked`
      tampilkan badge "SETUP", sebaliknya mode actual.

## 4. N17 — Drop dead columns

- [x] 4.1 Buat `backend/migrations/004_drop_unused_participant_columns.sql`
      dengan `DROP COLUMN IF EXISTS` untuk `username` + `reputation_score`.
      Idempotent.
- [x] 4.2 Verified zero callers via grep — no code selects or writes these
      columns in backend or frontend.

## 5. Verifikasi total

- [x] 5.1 `cd backend && npm test` — 69 test pass (63 existing + 6 bracket baru).
- [x] 5.2 `cd contracts && forge test` — 27 test pass (tidak terdampak).
- [x] 5.3 `cd frontend && npm run build` — type check + build sukses.
- [ ] 5.4 Smoke manual (user-driven setelah deploy): buat event baru → home list
      tampilkan badge "SETUP" (bukan "1v1") → lock roster → pilih mode "team"
      → badge home update ke "team (XvX)".

## 6. Commit plan

- [x] 6.1 `fix(backend): order bracket matches by match_index for deterministic pairing` — `c0b3989`
- [x] 6.2 `chore(backend): remove unused global leaderboard endpoint` — `cd985be`
- [x] 6.3 `feat(frontend): hide game_mode badge until roster lock` — `4ab94ea`
- [x] 6.4 `chore(db): drop unused participants.username and reputation_score columns` — `20410d3`
