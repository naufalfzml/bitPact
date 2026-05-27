## 1. N5 — Deterministic bracket pairing

- [ ] 1.1 Di [backend/routes/events.js:957-961](../../../backend/routes/events.js#L957-L961),
      tambah `.order("match_index", { ascending: true })` pada query
      `currentRoundMatches` di handler `POST /:id/bracket/advance`.
- [ ] 1.2 Tambah unit test baru di `backend/test/bracket.test.js` (file baru atau
      append ke `consensus.test.js`): mock supabase return urutan acak →
      pastikan helper pairing menghasilkan urutan deterministic sesuai
      `match_index` ascending.
- [ ] 1.3 `cd backend && npm test` — pastikan test baru hijau.

## 2. N4 — Hapus endpoint leaderboard global

- [ ] 2.1 Hapus handler `router.get("/leaderboard/reputation", ...)` di
      [backend/routes/events.js:1480-1508](../../../backend/routes/events.js#L1480-L1508).
- [ ] 2.2 Cari test yang menyentuh path `/leaderboard/reputation` di
      `backend/test/api.smoke.test.js` — jika ada, hapus / sesuaikan.
- [ ] 2.3 `grep -rn "/leaderboard/reputation" backend/ frontend/` — pastikan
      tidak ada referensi tersisa di backend. (Referensi frontend akan
      dihapus di change `frontend-polish-and-english` task N9.)
- [ ] 2.4 `cd backend && npm test` — pastikan jumlah test berkurang sesuai
      (atau tetap), semua hijau.

## 3. N7 — Drop `game_mode` dari create payload + UI badge gating

- [ ] 3.1 Frontend create form
      [frontend/src/app/events/create/page.tsx:60-71](../../../frontend/src/app/events/create/page.tsx#L60-L71):
      hapus baris `game_mode: "1v1"` dari body POST `/api/events`.
- [ ] 3.2 Frontend home page
      [frontend/src/app/page.tsx:175-178](../../../frontend/src/app/page.tsx#L175-L178):
      ubah render badge agar saat `event.status === "setup"` tampilkan badge
      "SETUP" generik (sesuaikan dengan tipe yang sudah dipisah). Saat
      status lain atau ketika kita perlu menampilkan mode (post-lock),
      tampilkan badge mode actual. Pertimbangkan: backend `GET /api/events`
      list belum mengembalikan `roster_locked` — perlu menambahkannya ke
      response list jika ingin gating lebih akurat.
- [ ] 3.3 Backend `GET /api/events`
      [backend/routes/events.js:125-145](../../../backend/routes/events.js#L125-L145):
      pastikan select mengandung `roster_locked` (saat ini `select("*, ...")`
      jadi sudah ikut). Verifikasi response shape.
- [ ] 3.4 Frontend detail page
      [frontend/src/app/events/[id]/page.tsx:609-611](../../../frontend/src/app/events/[id]/page.tsx#L609-L611):
      gating sama — saat `status === "setup" && !roster_locked` tampilkan
      "TBD" / "SETUP", sebaliknya mode actual.

## 4. N17 — Drop dead columns

- [ ] 4.1 Buat `backend/migrations/004_drop_unused_participant_columns.sql`:
      ```sql
      ALTER TABLE participants DROP COLUMN IF EXISTS username;
      ALTER TABLE participants DROP COLUMN IF EXISTS reputation_score;
      ```
- [ ] 4.2 Verifikasi tidak ada kode yang select / write kolom ini:
      `grep -rn "participants.*username\|participants.*reputation_score" backend/ frontend/`.

## 5. Verifikasi total

- [ ] 5.1 `cd backend && npm test` — 88 test (atau revisi sesuai 2.2/1.2) hijau.
- [ ] 5.2 `cd contracts && forge test` — 25 test hijau (tidak terdampak).
- [ ] 5.3 `cd frontend && npm run build` — type check lulus.
- [ ] 5.4 Smoke manual: buat event baru → home list tampilkan badge "SETUP"
      (bukan "1v1") → lock roster → pilih mode "team" → badge home update
      ke "team (1v1)".

## 6. Commit plan

- [ ] 6.1 `fix(backend): order bracket matches by match_index for deterministic pairing` (task 1)
- [ ] 6.2 `chore(backend): remove unused global leaderboard endpoint` (task 2)
- [ ] 6.3 `feat(frontend): hide game_mode badge until roster lock` (task 3)
- [ ] 6.4 `chore(db): drop unused participants.username and reputation_score columns` (task 4 + migration)
