## Why

Dua jalur lifecycle event bisa macet permanen sehingga dana peserta terkunci
(temuan H1 & H2 di [TESTING.md](../../../TESTING.md), item F4 & F5 di
[FIX_PLAN.md](../../../FIX_PLAN.md)):

- **FFA tidak bisa dijalankan (H1/F4).** `select-game-mode` tidak men-generate bracket
  untuk `ffa`, tetapi `/start` menolak event yang bracket-nya kosong. UI selector pun
  hanya menawarkan `1v1`/`team`. Akibatnya FFA — mode inti di `PROJECT_OVERVIEW.md` —
  mentok di status `setup` dan tak pernah `active`.
- **Event tanpa suara tidak pernah selesai (H2/F5).** `resolveConsensus` keluar dini
  saat `votes.length === 0`, dan cron hanya memanggilnya tanpa membedakan timeout.
  Bila 24 jam lewat tanpa satu pun vote, event macet di `voting` selamanya dan dana
  escrow terkunci — bertentangan dengan spec "non-voter = abstain".

Tujuan change ini: memastikan **setiap event selalu bisa mencapai status akhir**
(`ended`/`disputed`), apa pun mode dan partisipasi voting-nya.

## What Changes

- **F4 — FFA bisa dijalankan**:
  - Backend `/start` MELEWATI syarat "bracket harus ada" untuk `game_mode === "ffa"`
    (FFA tak punya bracket; pemenang ditentukan manual saat `active`). Guard bracket
    tetap berlaku penuh untuk `1v1`.
  - `select-game-mode` menerima `ffa` sebagai mode sah dan mem-persist `game_mode`
    tanpa membuat bracket (0 match — bukan error).
  - Frontend: tambah opsi `ffa` di selector `select-game-mode` dan sediakan jalur
    "start" untuk FFA (karena tak ada draf bracket yang bisa dimulai).
  - Alur FFA tetap: `active → input top-3 winner → /end → voting` (UI FFA state
    `active` sudah ada).
- **F5 — Resolusi konsensus saat timeout / 0 vote**:
  - `resolveConsensus` menerima flag `isTimeout`. Cron `autoAbstain` memanggil
    `resolveConsensus(id, true)` saat melewati deadline 24 jam.
  - **Keputusan D2**: saat timeout dengan **0 vote** → jalankan `emergencyRefund`
    (default aman: tak ada yang memvalidasi) lalu event tidak lagi `voting`.
  - Saat timeout dengan **≥1 vote** → resolusi memakai vote yang masuk (logika sekarang).
  - Pemanggilan non-timeout dengan 0 vote tetap keluar tanpa aksi (perilaku sekarang
    dipertahankan, agar resolve manual sebelum deadline tidak memicu refund prematur).

## Capabilities

### New Capabilities
- `ffa-tournament-lifecycle`: FFA dapat dijalankan end-to-end — dipilih sebagai mode,
  di-`/start` tanpa bracket, lalu `active → top-3 → voting` — tanpa pernah macet di
  `setup`.
- `consensus-timeout-resolution`: Event `voting` selalu mencapai status akhir saat
  deadline 24 jam lewat, termasuk kasus 0 vote yang di-refund secara aman.

### Modified Capabilities
<!-- Tidak ada spec di openspec/specs/ yang requirement formalnya berubah; FFA-start
     dan resolusi-timeout belum pernah ditulis sebagai requirement. -->

## Impact

- **Backend**:
  - `backend/routes/events.js`:
    - `/start` — guard bracket dilewati untuk `ffa`.
    - `select-game-mode` — `ffa` adalah mode sah (0 bracket).
    - `resolveConsensus(eventId, isTimeout)` — cabang 0-vote saat `isTimeout` →
      `emergencyRefund`.
  - `backend/cron/autoAbstain.js` — memanggil `resolveConsensus(id, true)`.
- **Frontend**:
  - `frontend/src/app/events/[id]/page.tsx` — opsi `ffa` di selector, tipe state
    `selectedGameMode` mencakup `ffa`, dan tombol start untuk FFA.
- **Tests** (lihat tabel "Dampak ke test" di [FIX_PLAN.md](../../../FIX_PLAN.md)):
  - `backend/test/consensus.test.js` — `EDGE: zero votes` diubah: dengan `isTimeout`
    aksinya `refund`, tanpa `isTimeout` tetap `none`.
  - Tambah test guard `/start`: `ffa` (0 bracket) lolos, `1v1` (0 bracket) tetap ditolak.
  - **69 test** existing (forge + `npm test`) MUST tetap hijau kecuali yang sengaja
    diperbarui di atas.
