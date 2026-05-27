## ADDED Requirements

### Requirement: `game_mode` di fase setup pre-lock bersifat tentative
Selama event berstatus `setup` AND `roster_locked === false`, nilai
`game_mode` di tabel `events` MUST diperlakukan sebagai placeholder default
dan TIDAK BOLEH ditampilkan sebagai badge mode pasti di UI (home list /
event detail). Mode yang valid hanya setelah creator memanggil
`POST /:id/select-game-mode` (yang hanya boleh saat `roster_locked === true`).

#### Scenario: Event baru di home list
- **GIVEN** event baru dibuat dengan default `game_mode = "1v1"` di DB
  dan `roster_locked = false`
- **WHEN** home list me-render card event
- **THEN** badge yang ditampilkan adalah indikator status setup
  (mis. "SETUP"), BUKAN "1v1"
- **AND** card tetap menampilkan ticket price & registered count

#### Scenario: Event setelah roster lock + select-game-mode
- **GIVEN** creator sudah lock roster dan pilih mode "team"
- **WHEN** home list me-render
- **THEN** badge menampilkan "team (XvX)" sesuai `team_size`

#### Scenario: Body POST `/api/events` tanpa `game_mode`
- **GIVEN** frontend mengirim body create event tanpa field `game_mode`
- **WHEN** backend menerima request
- **THEN** event tetap dibuat dengan `game_mode = "1v1"` (default schema/handler)
- **AND** UI tidak mengandalkan field ini untuk render badge selama setup pre-lock
