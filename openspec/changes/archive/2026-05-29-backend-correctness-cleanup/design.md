## Context

### N4 — Tidak ada leaderboard global

Per arahan user di review audit: *"tidak ada sistem leaderboard global (jadi
tidak perlu menambahkan parameter skor dll, cukup HP untuk syarat agar
participant bisa mengikuti event)"*.

Existing endpoints reputation:
- `GET /api/events/reputation/:wallet` ([events.js:1513-1529](../../../backend/routes/events.js#L1513-L1529)) — **kept**.
  Memanggil `getRegeneratedReputation`, dipakai oleh `ConnectButtonClient`
  status bar + cek 50 HP gate di `/register`.
- `GET /api/reputation/:wallet` ([reputation.js:10](../../../backend/routes/reputation.js#L10)) — **kept**.
  Lebih lengkap (history + total minority events), dipakai jika ada halaman
  profil per wallet.
- `GET /api/events/leaderboard/reputation` ([events.js:1480-1508](../../../backend/routes/events.js#L1480-L1508))
  — **dihapus**. Hanya dipakai oleh `/leaderboard` page yang akan ikut dihapus
  di change frontend-polish.

### N5 — Bracket pairing ordering

Saat ini di [events.js:957-979](../../../backend/routes/events.js#L957-L979):

```js
const { data: currentRoundMatches } = await supabase
  .from("brackets")
  .select("*")
  .eq("event_id", id)
  .eq("round", match.round);
// ⚠️ no .order(...)

const winners = currentRoundMatches.map((m) => m.winner);
// pair winners[i] with winners[i+1] for next round
```

Tanpa ORDER BY, Postgres tak menjamin urutan. Sub-bug yang sama-sama
kemungkinan masalah: `GET /api/events/:id/bracket` (line 1001-1010) sudah
order by round + match_index — pola ini SEHARUSNYA dipakai konsisten.

### N7 — `game_mode` tentative di create

UI flow saat ini (dari kode):

1. Creator buat event → POST `/api/events` dengan body fixed `game_mode: "1v1"`.
   DB: `game_mode = "1v1"` (default schema).
2. Player register (deposit USDC).
3. Creator klik "Lock Roster" → `roster_locked = true`.
4. Creator pilih mode beneran via `/select-game-mode` → update `game_mode` di
   DB, generate bracket sesuai.

Antara langkah 1 & 4, badge mode "1v1" ditampilkan walau mode sebenarnya belum
ditetapkan. Untuk creator yang berencana FFA atau team match, ini menyesatkan.

### N17 — Dead columns

`backend/migrations/001_add_username_reputation.sql` menambah:
```sql
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS username TEXT DEFAULT NULL;

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 100;
```

`grep` hasil: 0 pembacaan, 0 penulisan. Sisa fitur lama yang tidak pernah
diimplementasikan (gamer tag custom override).

## Goals / Non-Goals

**Goals:**
- Bracket pairing reproducible — sama urutan setiap kali (sort by match_index).
- `game_mode` di DB selalu mencerminkan keadaan **logis** sebenarnya (bukan
  "1v1" placeholder palsu).
- Hapus surface API & kolom DB yang tidak dipakai.

**Non-Goals:**
- Mengubah `getRegeneratedReputation` helper atau gate 50 HP di `/register`.
- Menghapus endpoint per-wallet reputation (masih dipakai).
- Menambah feature username custom (post-hackathon).

## Decisions

### D1 (N4): Hapus handler leaderboard, jangan deprecate
Sederhana — hapus saja. Tidak ada konsumer non-frontend yang kita ketahui.
Tidak perlu jalur deprecation karena belum ada user eksternal (hackathon).

### D2 (N5): Tambah `.order("match_index")` saja
Minimal change yang menjamin determinism. Tidak butuh sort di JS karena
Postgres index `idx_brackets_unique_match` sudah cover (event_id, round,
match_index).

```js
const { data: currentRoundMatches } = await supabase
  .from("brackets")
  .select("*")
  .eq("event_id", id)
  .eq("round", match.round)
  .order("match_index", { ascending: true });
```

### D3 (N7): Drop body field, gate badge UI by status
Backend POST `/api/events` sudah punya default `game_mode = "1v1"` di
destructuring ([events.js:26](../../../backend/routes/events.js#L26)) — biarkan.

Frontend:
- `events/create/page.tsx`: hapus `game_mode: "1v1"` dari body fetch.
  Backend tetap akan men-set default; tidak ada break.
- `page.tsx` (home) & `events/[id]/page.tsx`: ubah render badge mode jadi
  conditional:
  ```tsx
  {(event.status !== "setup" || event.roster_locked) ? (
    <span className={`bp-badge bp-badge-${event.game_mode}`}>
      {event.game_mode} {...}
    </span>
  ) : (
    <span className="bp-badge bp-badge-setup">SETUP</span>
  )}
  ```
  Saat masih setup pre-lock, tampilkan badge generik "SETUP" (sama dengan
  `event.status`) → menghindari pretense.

**Alternatif ditolak:** Mempertahankan badge "1v1" sampai mode beneran dipilih
— terus akan misleading di home list.

### D4 (N17): Migration 004 idempotent
```sql
-- backend/migrations/004_drop_unused_participant_columns.sql
ALTER TABLE participants DROP COLUMN IF EXISTS username;
ALTER TABLE participants DROP COLUMN IF EXISTS reputation_score;
```

Tidak ada data loss yang relevan (kolom tidak pernah ditulis selain DEFAULT).

## Risks / Trade-offs

- **N4 risiko**: Bila ada admin/internal tool yang scrape leaderboard endpoint
  — break. Tidak ada yang diketahui; jika muncul, mudah recreate dengan view
  baru.
- **N5 risiko**: Tidak ada — pure correctness fix.
- **N7 risiko**: Existing event di DB punya `game_mode = "1v1"` placeholder
  → badge mereka di-render sebagai "SETUP" walau creator sudah dapat
  mengganti mode setelah lock. Acceptable: setelah lock, badge benar muncul.
  Catatan untuk demo / dataset existing: tidak perlu backfill.
- **N17 risiko**: Bila ada query JOIN/aggregation yang select `*` dari
  participants → satu kolom hilang. Sudah di-audit: tidak ada konsumer.

## Migration Plan

1. Backend code change (handler bracket, hapus leaderboard handler).
2. Migration 004 (DROP COLUMN).
3. Frontend create page + badge gating.
4. Test sweep:
   - `cd backend && npm test`
   - `cd contracts && forge test`
   - Manual: buat event baru → cek badge home muncul "SETUP" → lock roster
     + pilih mode → cek badge berubah.
5. Rollback: revert PR + `ALTER TABLE participants ADD COLUMN username TEXT,
   ADD COLUMN reputation_score INTEGER DEFAULT 100;` (data hilang, tapi
   tadinya kosong).

## Open Questions

- Apakah mau sekalian tambah constraint `game_mode IS NULL` selama setup?
  **Tidak** — schema default sudah `'1v1'`; mengubah schema lebih invasif
  daripada UI gating.
