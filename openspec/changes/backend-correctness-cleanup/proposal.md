## Why

Empat temuan backend yang independent tapi sama-sama "small but wrong" diangkat
sebagai satu change karena dampaknya ringan, tidak saling tabrak, dan bisa
diuji terpisah-pisah. Semua dari [AUDIT.md](../../../AUDIT.md):

- **N4**: Endpoint `GET /api/events/leaderboard/reputation` mengembalikan
  `reputation_score` mentah dari tabel (skor stored, bukan HP ter-regenerasi)
  dan tidak pernah memunculkan player yang belum pernah kena penalty. Tapi
  proyek juga **tidak memiliki sistem leaderboard global** (per arahan user) —
  HP cukup dipakai sebagai *gate* registrasi yang sudah benar dipanggil di
  [register endpoint](../../../backend/routes/events.js#L256). Solusi paling
  bersih: **hapus** endpoint leaderboard global dan halaman frontendnya.
- **N5**: `POST /api/events/:id/bracket/advance` membaca matches round saat
  ini **tanpa `ORDER BY`** ([events.js:957-979](../../../backend/routes/events.js#L957-L979))
  → pairing round berikutnya bisa mengocok seed dengan cara yang tak terduga.
- **N7**: Frontend create form selalu mengirim `game_mode: "1v1"` hardcoded
  ([create/page.tsx:62](../../../frontend/src/app/events/create/page.tsx#L62)),
  padahal mode sebenarnya dipilih nanti via `/select-game-mode`. Data DB
  "berbohong" antara setup dan roster_locked — badge mode salah ditampilkan
  di home/detail.
- **N17**: Kolom `participants.username` & `participants.reputation_score`
  ditambahkan oleh `001_add_username_reputation.sql` tetapi tidak pernah dibaca
  atau ditulis di kode mana pun. Dead columns — hapus via migrasi baru.

## What Changes

- **N4 — Hapus leaderboard global**: hapus handler
  `GET /api/events/leaderboard/reputation` dari backend. (Frontend leaderboard
  page & nav link akan dihapus di change `frontend-polish-and-english`.)
  Endpoint `GET /api/events/reputation/:wallet` (per-wallet, dipakai
  `ConnectButtonClient` + register guard) **tetap** karena memang dipakai dan
  sudah benar — memanggil `getRegeneratedReputation`.
- **N5 — Deterministic bracket pairing**: tambah `.order("match_index",
  { ascending: true })` pada query `currentRoundMatches` di
  `/bracket/advance` sehingga `winners[]` mengikuti urutan match_index.
  Bracket round berikutnya jadi deterministic.
- **N7 — Drop `game_mode` dari create payload**:
  - Frontend: hapus field `game_mode: "1v1"` dari body POST `/api/events`.
  - Backend: pertahankan default `game_mode = "1v1"` di destructuring, tetapi
    di logic & UI sebelum `select-game-mode` (status setup pre-roster-lock),
    badge mode TIDAK ditampilkan (atau ditampilkan sebagai "TBD").
  - Frontend home & detail: render badge mode hanya bila status sudah lewat
    `setup` ATAU `roster_locked === true` (artinya creator sudah memilih
    mode beneran via `/select-game-mode`).
- **N17 — Drop dead columns**: migrasi
  `004_drop_unused_participant_columns.sql` yang `DROP COLUMN IF EXISTS
  username` dan `DROP COLUMN IF EXISTS reputation_score` dari `participants`.

## Capabilities

### New Capabilities
- `bracket-determinism`: Pasangan match round berikutnya pada
  single-elimination bracket MUST selalu dihasilkan dengan urutan deterministic
  (mengikuti `match_index` ascending).

### Modified Capabilities
- `dynamic-brackets-and-roster-upgrades`: Penambahan klarifikasi `game_mode`
  pada fase setup bersifat **tentative** sampai `/select-game-mode` dipanggil
  (post roster-lock); UI MUST menggambarkan ini secara akurat.

### Removed Capabilities
- *(Tidak ada spec formal di `openspec/specs/` untuk leaderboard global, jadi
  N4 hanya menghapus implementasi tanpa "removed spec" entry.)*

## Impact

- **Backend**:
  - `backend/routes/events.js`:
    - Hapus handler `router.get("/leaderboard/reputation", ...)` (line 1480-1508).
    - `router.post("/:id/bracket/advance", ...)`: tambah `.order("match_index")`
      pada query `currentRoundMatches` (line 957).
    - Endpoint `POST /api/events` body parsing: tidak diubah (default tetap "1v1").
- **Frontend**:
  - `frontend/src/app/events/create/page.tsx`: hapus `game_mode: "1v1"` dari body
    `fetch("/events")`.
  - `frontend/src/app/page.tsx` & `events/[id]/page.tsx`: gating render badge mode
    (lihat tasks).
  - (Penghapusan halaman `/leaderboard` & nav: di change `frontend-polish-and-english`
    sebagai N9, **bukan** di change ini.)
- **DB**:
  - `backend/migrations/004_drop_unused_participant_columns.sql` (baru, idempotent).
- **Tests**:
  - `backend/test/api.smoke.test.js`: hapus / update test yang menyentuh
    `/leaderboard/reputation` (jika ada).
  - Tambah test unit untuk deterministic ordering bracket-advance (mock
    supabase return acak → pairing tetap konsisten).
  - 88 test existing harus tetap hijau setelah dikurangi/ditambahkan sesuai.
