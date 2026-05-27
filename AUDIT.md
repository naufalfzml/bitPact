# bitPact — Full Project Audit

Audit menyeluruh terhadap layer **contract**, **backend**, **frontend**,
**openspec**, dan **docs** pada commit `fc38b7c` (main). Dokumen ini melengkapi
[TESTING.md](TESTING.md) dan [FIX_PLAN.md](FIX_PLAN.md): semua item P0–P3 di
`FIX_PLAN.md` (F1–F10) sudah diverifikasi terimplementasi, dan test suite
**hijau penuh** (25 contract + 63 backend = **88 test pass**). Temuan di sini
adalah hal-hal baru yang **belum tercakup** di FIX_PLAN.

> Status: belum ada perbaikan diterapkan dari dokumen ini. Urutan kerja yang
> disarankan sama seperti FIX_PLAN sebelumnya — **(1)** buat openspec change
> per item → **(2)** implementasi → **(3)** test hijau → **(4)** archive.

## Ringkasan status fix sebelumnya (FIX_PLAN.md F1–F10)

| Fix | Topik | Status |
|---|---|---|
| F1 | Pool dari state on-chain | ✅ diimplementasikan (`settleEvent` membaca `getEventInfo`) |
| F2 | Status `ended` hanya setelah receipt sukses | ✅ migrasi 003 + `settlement_failed` |
| F3 | Hentikan bypass peserta tanpa deposit | ✅ cabang `social-connect-invite` dihapus |
| F4 | FFA bisa dijalankan | ✅ `getStartBracketGuardError` melewati ffa |
| F5 | Resolusi 0 vote / timeout | ✅ `resolveConsensus(id, true)` → refund |
| F6 | Tipe `public` di UI | ✅ selector access-type lengkap |
| F7 | Penalti pakai HP ter-regenerasi | ✅ `applyMinorityPenalty` panggil `getRegeneratedReputation` |
| F8 | Social Connect per network | ✅ `getSupportedNetwork` gating |
| F9 | Peringatan minority akurat | ✅ banner di vote page diperbarui |
| F10 | Konfigurasi & docs cleanup | ✅ env example & branding rapi |

## Ringkasan temuan baru

| Prio | ID | Temuan | Layer |
|---|---|---|---|
| P0 | N1 | Otorisasi creator hilang di beberapa endpoint backend | backend |
| P0 | N2 | Frontend tak menangani status `settlement_failed` | frontend |
| P0 | N3 | Risiko USDC blacklist + penamaan `cUSD` di contract | contract |
| P1 | N4 | Leaderboard pakai skor stored, bukan HP ter-regenerasi | backend |
| P1 | N5 | Ordering bracket-advance tidak dijamin (no ORDER BY) | backend |
| P1 | N6 | Alamat USDC fallback tidak sinkron dengan README | config |
| P1 | N7 | `game_mode` dikirim hardcoded `"1v1"` saat create | frontend |
| P2 | N8 | RPG status bar disembunyikan di mobile (MiniPay = mobile) | frontend |
| P2 | N9 | Nav header tak ada link `/leaderboard` | frontend |
| P2 | N10 | WalletConnect `projectId` hardcoded | frontend |
| P2 | N11 | UX kasar — `alert()` / `confirm()` di mana-mana | frontend |
| P2 | N12 | Vote page tidak menunjukkan vote saya | frontend |
| P2 | N13 | Tombol "Distribute Prize" muncul ganda (detail + vote) | frontend |
| P2 | N14 | Photo upload tanpa preview & validasi | frontend |
| P2 | N15 | Bahasa campur Indonesia + English di UI & API | full |
| P2 | N16 | env var `NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` masih nama `CUSD` | frontend |
| P2 | N17 | Kolom `participants.username` dead-code | db |
| P3 | N18 | Docs `/docs/` masih placeholder "belum tersedia" | docs |
| P3 | N19 | Brand `_bP_` masih punya huruf vs aturan "text-free" | frontend |
| P3 | N20 | `settlement_error` tak ditampilkan di UI | frontend |

---

## 🔴 KRITIS (P0)

### N1 — Otorisasi creator hilang di beberapa endpoint backend

**Masalah:** beberapa endpoint lifecycle menerima trigger dari siapa pun yang
tahu UUID event — tidak ada cek `creator_address` di body, dan tidak ada
pembanding ke `event.creator_address`. Endpoint terdampak:

| Endpoint | Lokasi | Risiko |
|---|---|---|
| `POST /:id/start` | [events.js:833](backend/routes/events.js#L833) | siapa pun bisa memulai turnamen |
| `POST /:id/bracket/advance` | [events.js:924](backend/routes/events.js#L924) | siapa pun bisa mendeklarasikan pemenang per match |
| `POST /:id/end` | [events.js:1065](backend/routes/events.js#L1065) | siapa pun bisa submit daftar pemenang & buka voting |
| `POST /:id/photo` | [events.js:1024](backend/routes/events.js#L1024) | siapa pun bisa upload foto atas nama peserta lain |
| `POST /:id/appeal` | [events.js:1210](backend/routes/events.js#L1210) | siapa pun bisa mengganti pemenang saat `disputed` |

Distribusi dana akhir tetap dipagari kuorum vote + admin wallet on-chain,
tetapi state transition DB bisa dimanipulasi → memungkinkan DoS, manipulasi
pemenang sebelum vote, atau race condition di `voting` phase.

**Solusi:** terapkan pola yang sudah ada di `/lock-roster` dan
`/select-game-mode`: terima `creator_address` di body, bandingkan ke
`event.creator_address.toLowerCase()`, return `403` jika tidak cocok.
`/bracket/advance` & `/photo` perlu pertimbangan khusus karena bisa di-trigger
peserta — `/bracket/advance` harusnya hanya creator, `/photo` harusnya hanya
pemilik `wallet_address` (verifikasi `req.body.wallet_address === <signed
caller>` atau minimal cocok dengan peserta terdaftar).

> Catatan: semua cek `creator_address` di codebase saat ini trust-based (tak
> ada signed message). Idealnya pindah ke EIP-712 / SIWE nanti, tapi minimum
> konsistensi dulu — endpoint yang ada saja diisi check.

**Acceptance / Scenario:**
- WHEN non-creator memanggil `/start` THEN respons `403` AND state tidak
  berubah.
- WHEN creator memanggil `/start` dengan address yang cocok THEN status →
  `active` seperti biasa.
- INVARIANT: setiap endpoint lifecycle mutating (kecuali `/register`,
  `/vote`, `/photo` milik sendiri) wajib lulus guard creator.

**File:** `backend/routes/events.js` (5 endpoint di atas), frontend pemanggil
yang relevan (kirim `creator_address: address`).

---

### N2 — Frontend tak menangani status `settlement_failed`

**Masalah:** migrasi 003 + helper `settleEvent` sudah benar set
`settlement_failed` saat receipt revert, dan endpoint retry sudah ada di
[events.js:1535](backend/routes/events.js#L1535). Namun frontend tidak
menyadari status ini:

- `EventDetail` type union ([events/[id]/page.tsx:35](frontend/src/app/events/[id]/page.tsx#L35)) tak menyertakan `settlement_failed`
- Tidak ada cabang UI yang menampilkannya
- Tidak ada tombol "Retry Settlement" untuk creator
- Tidak ada badge/filter di home page

**Dampak:** ketika settlement gagal on-chain, dana terkunci dan user/creator
tidak tahu cara recovery. Backend siap, UI buta.

**Solusi:**
- Perluas type union: `"setup" | "active" | "voting" | "ended" | "disputed" | "settlement_failed"`.
- Tambah cabang state di event detail page yang menampilkan
  `settlement_error` + tombol "Retry Settlement" (call `POST
  /:id/retry-settlement` dengan `caller_address: address`).
- Tambah badge `bp-badge-settlement_failed` di home page.

**File:** `frontend/src/app/events/[id]/page.tsx`, `frontend/src/app/page.tsx`,
`frontend/src/app/globals.css`.

**Acceptance / Scenario:**
- WHEN event berstatus `settlement_failed` THEN halaman detail menampilkan
  banner error + tombol retry (creator only).
- WHEN creator klik retry & berhasil THEN status → `ended` AND tombol
  menghilang.
- WHEN home page list THEN ada filter/badge untuk `settlement_failed`.

---

### N3 — Smart contract: penamaan `cUSD` & risiko USDC blacklist

**Masalah:** [contracts/src/BitPactVault.sol](contracts/src/BitPactVault.sol):

1. **Penamaan stale.** State variable & komentar masih `cUSD` ([Vault.sol:8, 28, 69, 73](contracts/src/BitPactVault.sol#L28)) padahal proyek pakai USDC native Celo. Bukan bug fungsional, tapi confusing untuk audit/integrasi pihak ketiga.
2. **Risiko blacklist USDC.** `distributePrize` dan `emergencyRefund`
   melakukan loop transfer dalam satu transaksi
   ([Vault.sol:149-152](contracts/src/BitPactVault.sol#L149-L152) &
   [Vault.sol:175-179](contracts/src/BitPactVault.sol#L175-L179)). USDC native
   memiliki kemampuan blacklist — bila 1 pemenang/peserta masuk blacklist,
   **seluruh distribusi/refund revert**, dana terkunci permanen.
3. **Tidak ada `ReentrancyGuard`.** Saat ini aman (state→external pattern di
   `emergencyRefund`), tetapi defense-in-depth murah.

**Solusi minimum (hackathon):**
- Rename komentar & variabel ke USDC.
- Dokumentasikan risiko blacklist di README + tambah test karakterisasi
  (peserta blacklisted → refund revert).

**Solusi penuh (post-hackathon):**
- Refactor ke pola **pull-payment**: `distributePrize` hanya mencatat
  `claimable[winner] += share`, lalu winner panggil `claim()` sendiri.
  Blacklisted winner cukup gagal claim — peserta lain tetap bisa.
- Tambah `nonReentrant` ke fungsi mutating.

**File:** `contracts/src/BitPactVault.sol`, `contracts/test/BitPactVaultFlow.t.sol`.

**Acceptance / Scenario:**
- WHEN salah satu pemenang di-blacklist USDC THEN pemenang lain tetap bisa
  klaim (pull-payment) AND tidak ada revert massal.
- INVARIANT: blacklist 1 address ≠ DoS untuk seluruh pool.

---

## 🟠 TINGGI (P1) — fitur tampak jalan tapi datanya salah

### N4 — Leaderboard pakai skor stored, bukan HP ter-regenerasi

**Masalah:**
[backend/routes/events.js:1480-1508](backend/routes/events.js#L1480-L1508) —
`GET /api/events/leaderboard/reputation` mengembalikan `reputation_score`
mentah dari tabel `reputation_tracking`, tanpa memanggil
`getRegeneratedReputation`.

Akibatnya:
- Pemain yang sudah pulih penuh (100) tetap tampil dengan skor lama.
- Pemain yang **belum pernah** kena penalty (HP default 100) **tak pernah
  muncul** di leaderboard, karena tidak ada baris `reputation_tracking`.

Ini bertentangan dengan F7 yang sudah memperbaiki penalty agar pakai HP
ter-regenerasi — display-nya belum sinkron.

**Solusi:** untuk tiap wallet unik (dari `reputation_tracking` + dari
`participants`), panggil helper regen, lalu sort by `current_hp` desc.
Atau lebih sederhana: ambil daftar wallet aktif dari
`participants` (distinct) dan tampilkan HP ter-regenerasi untuk semua.

**File:** `backend/routes/events.js` (handler leaderboard),
`frontend/src/app/leaderboard/page.tsx` (jika perlu sesuaikan tampilan).

**Acceptance / Scenario:**
- WHEN user A pernah −10 HP lalu lewat waktu regenerasi cukup THEN
  leaderboard menampilkan HP saat ini, bukan base lama.
- WHEN user B belum pernah kena penalty AND pernah ikut tournament THEN
  user B tampil di leaderboard dengan HP 100.

---

### N5 — Ordering bracket-advance tidak dijamin

**Masalah:**
[backend/routes/events.js:957-979](backend/routes/events.js#L957-L979) —
`currentRoundMatches` di-query tanpa `.order("match_index")`. Postgres tak
menjamin urutan tanpa `ORDER BY`, sehingga
`currentRoundMatches.map((m) => m.winner)` bisa menghasilkan urutan apa pun
→ pairing untuk round berikutnya berisiko mengocok seed/path bracket.

Bug ini diam saja sampai ada 4+ match per round dan ada query plan yang
mengubah urutan (lazy scan, parallel worker, dll).

**Solusi:** tambahkan
`.order("match_index", { ascending: true })` sebelum `.map(...)`.

**File:** `backend/routes/events.js` (`/bracket/advance`).

**Acceptance / Scenario:**
- WHEN round 1 punya match_index 0,1,2,3 dengan pemenang A,B,C,D THEN round
  2 berisi pairing (A vs B) dan (C vs D) — bukan permutasi acak.
- Test: tambahkan unit test mock supabase dengan urutan return acak →
  pastikan pairing tetap deterministic.

---

### N6 — Alamat USDC fallback tidak sinkron dengan README

**Masalah:** dua sumber kebenaran berbeda:

- [README.md:11](README.md#L11): Celo Sepolia USDC =
  `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- [frontend/src/constants/index.ts:2](frontend/src/constants/index.ts#L2),
  [backend/.env.example:6](backend/.env.example#L6),
  [frontend/.env:4](frontend/.env#L4): fallback =
  `0x01C5C0122039549AD1493B8220cABEdD739BC44E`

Hanya satu yang benar — perlu konfirmasi alamat USDC yang ter-deploy &
dipakai oleh `VAULT_CONTRACT_ADDRESS` (`0xC2375c25f402e83ce2b6F148146D6A8b47c0e62F` di mainnet per README).

**Solusi:** verifikasi alamat USDC native untuk Celo Sepolia (testnet) via
explorer Celo, samakan di README, env example, `.env`, dan constants.
Tambahkan komentar inline "source of truth".

**File:** `README.md`, `frontend/src/constants/index.ts`, `frontend/.env`,
`backend/.env.example`.

---

### N7 — `game_mode` dikirim hardcoded `"1v1"` saat create

**Masalah:**
[frontend/src/app/events/create/page.tsx:62](frontend/src/app/events/create/page.tsx#L62)
selalu mengirim `game_mode: "1v1"` ke `POST /api/events`, padahal pilihan
asli (`1v1` / `team` / `ffa`) terjadi belakangan via `POST
/:id/select-game-mode`. Akibatnya `events.game_mode` di DB "berbohong"
sampai roster terkunci → home page badge menampilkan mode salah, dan
tidak ada hint awal mode di tampilan pre-lock.

**Solusi (pilih satu):**

A. **Drop dari payload** — biarkan default backend (`"1v1"`); jangan
   render badge mode sampai `select-game-mode` dipanggil.

B. **Add selector di create** — tambahkan dropdown `Game Mode` di
   create form sebagai hint awal yang masih bisa dioverride saat roster
   locked. Kirim sebagai initial value.

Rekomendasi: **A** (lebih sederhana, sesuai alur dinamis yang sudah ada),
tapi sembunyikan badge `game_mode` di home/detail saat status masih
`setup` & `roster_locked === false`.

**File:** `frontend/src/app/events/create/page.tsx`,
`frontend/src/app/page.tsx`,
`frontend/src/app/events/[id]/page.tsx`.

---

## 🟡 SEDANG (P2) — UX/UI & konsistensi

### N8 — RPG status bar disembunyikan di mobile (MiniPay = mobile)

[frontend/src/app/globals.css:1292-1294](frontend/src/app/globals.css#L1292-L1294)
menyembunyikan `.bp-rpg-status` di `≤720px`. Padahal MiniPay = browser
mobile Opera, target utama. Info HP / USDC / CELO justru paling relevan
di mobile.

**Solusi:** pindahkan ke baris kedua di bawah header saat mobile (bukan
disembunyikan). Atau gunakan `display: flex; flex-wrap: wrap` di
`.bp-header-inner` agar status bar wrap ke bawah.

### N9 — Nav header tak ada link `/leaderboard`

[frontend/src/app/layout.tsx:33-40](frontend/src/app/layout.tsx#L33-L40)
hanya menampilkan Home & Create. Leaderboard yang sudah ada hanya bisa
diakses via URL manual. Tambahkan `<Link href="/leaderboard">Leaderboard</Link>`.

### N10 — WalletConnect `projectId` hardcoded

[frontend/src/app/providers.tsx:12](frontend/src/app/providers.tsx#L12) —
`"a6873523dfdbd96e5eb9816035105e1d"` di-comment sebagai "generic
placeholder". Pindahkan ke `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
agar tiap deployment punya project sendiri (penting untuk analytics &
rate-limit WC Cloud).

### N11 — UX kasar: `alert()` / `confirm()` di mana-mana

`frontend/src/app/events/[id]/page.tsx` punya **20+** pemanggilan `alert()`
dan `confirm()` native browser ([page.tsx:260, 287, 323, 380, 503, 1057,
1338, 1342, ...](frontend/src/app/events/[id]/page.tsx#L260)).

Pengalaman jelek di mobile (modal "localhost says…") dan keluar dari tema
8-bit. Sebaiknya pakai toast/modal sesuai tema (mis. `bp-modal-overlay`
yang sudah ada di globals.css). Setidaknya success messages — `confirm()`
boleh tetap untuk destructive.

### N12 — Vote page tidak menunjukkan vote saya

[frontend/src/app/events/[id]/vote/page.tsx](frontend/src/app/events/[id]/vote/page.tsx)
selalu menampilkan tombol AGREE/REJECT aktif, padahal backend akan reject
duplicate dengan `409`. User baru tahu sudah vote setelah klik.

**Solusi:** fetch `votes` table (atau extend `GET /:id`) untuk include
"my vote" — jika ada, tampilkan banner "Anda sudah AGREE/REJECT" + nonaktifkan
tombol.

### N13 — Tombol "Distribute Prize" muncul ganda (detail + vote)

Tombol "Distribute Prize" untuk creator saat `voting && quorumMet` muncul
di **dua tempat**:
- [events/[id]/page.tsx:1325-1346](frontend/src/app/events/[id]/page.tsx#L1325)
- [events/[id]/vote/page.tsx:218-247](frontend/src/app/events/[id]/vote/page.tsx#L218)

Pilih satu lokasi (rekomendasi: vote page, karena di sana creator sudah
melihat konteks vote). Hapus duplikasi.

### N14 — Photo upload tanpa preview & validasi

[events/[id]/page.tsx:801-816](frontend/src/app/events/[id]/page.tsx#L801)
cuma `<input type="file" accept="image/*">`. Tidak ada preview thumbnail,
tidak ada cek ukuran (multer juga `memoryStorage()` tanpa `limits`).
Risiko: user upload file 20 MB, atau salah file, baru tahu di server.

**Solusi:** tambah preview `<img src={URL.createObjectURL(photoFile)}>`,
batas ukuran client-side (`5 MB`), dan `multer({ limits: { fileSize: 5
* 1024 * 1024 } })` di server.

### N15 — Bahasa campur Indonesia + English

Commit `c0dfa6b` ("internationalize to English") belum tuntas. Masih ada
banyak teks Indonesia:

**Frontend:**
- "KREATUR TIDAK BISA IKUT BERMAIN" ([page.tsx:659](frontend/src/app/events/[id]/page.tsx#L659))
- "REGISTRASI DITUTUP" (L666)
- "SLOT PENUH" (L678)
- "AKSES TERBATAS: ANDA TIDAK DIUNDANG" (L716)
- "ANDA TERDAFTAR DI WHITELIST" (L727)
- "MENAMBAHKAN...", "TAMBAHKAN KE WHITELIST" (L902)
- "DRAF MATCHUP RONDE 1" (L1110)

**Backend:**
- `[events.js:237](backend/routes/events.js#L237)`, L247, L261, L262 dst.
  ("Pendaftaran turnamen ini sudah ditutup", "Kreator tidak diizinkan…",
  "Skor HP Reputasi Anda…").

**Solusi:** pilih satu bahasa (rekomendasi: English untuk audience
hackathon internasional + i18n later). Sapu semua string user-facing.

### N16 — env var `NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` masih nama `CUSD`

[frontend/src/constants/index.ts:2](frontend/src/constants/index.ts#L2),
[frontend/.env:4](frontend/.env#L4). Rename ke
`NEXT_PUBLIC_USDC_TOKEN_ADDRESS` (variabel TypeScript-nya sudah
`USDC_TOKEN_ADDRESS`).

### N17 — Kolom `participants.username` dead-code

Migrasi 001 menambahkan `username` (dan `reputation_score`) ke tabel
`participants`, tetapi tak pernah dibaca/ditulis. Sisa fitur lama. Hapus
via migrasi baru, **atau** implementasikan custom gamer tag (override
`HERO_XXXX` default).

---

## 🟢 RENDAH (P3) — kebersihan & dokumentasi

### N18 — Docs `/docs/` masih placeholder

[docs/README.md](docs/README.md) menandai `ARCHITECTURE.md`,
`SMART-CONTRACT.md`, `DATABASE.md`, `API.md`, `GAME-MODES.md`,
`CONSENSUS.md`, `SETUP.md` sebagai "belum tersedia". Untuk hackathon
submission, minimal isi 3 terpenting: `ARCHITECTURE.md`,
`SMART-CONTRACT.md`, `API.md`.

### N19 — Brand `_bP_` masih punya huruf

[layout.tsx:26](frontend/src/app/layout.tsx#L26) menampilkan `_bP_`,
sementara brand guideline (`PROJECT_OVERVIEW.md` & `docs/README.md`)
menyebut "Logo Monogram berupa siluet piksel geometris murni tanpa teks
(text-free)". Pertimbangkan glyph piksel SVG.

### N20 — `settlement_error` tak ditampilkan di UI

Walau N2 sudah menutup status `settlement_failed`, kolom `settlement_error`
juga harus dirender (jangan cuma "Settlement gagal" generik). Tampilkan
pesan error sesungguhnya agar creator paham (mis. "USDC blacklisted address
0x…").

---

## Migrasi schema yang dibutuhkan

Tidak ada migrasi baru wajib. Jika N17 diadopsi penuh (hapus kolom):

```sql
-- backend/migrations/004_drop_unused_participant_columns.sql
ALTER TABLE participants DROP COLUMN IF EXISTS username;
ALTER TABLE participants DROP COLUMN IF EXISTS reputation_score;
```

Jika N3 pull-payment diadopsi (post-hackathon), perlu redeploy contract
dengan ABI baru — bukan migrasi DB.

---

## Keputusan yang dibutuhkan sebelum implementasi

| ID | Pertanyaan | Rekomendasi |
|---|---|---|
| D1 | N1 → auth body-based vs EIP-712 signed message? | **Body-based dulu** untuk konsistensi; signed message di iterasi berikutnya. |
| D2 | N3 → pull-payment refactor sekarang atau hanya dokumentasi? | **Dokumentasi + test** sekarang; refactor pasca hackathon. |
| D3 | N7 → drop game_mode dari create payload, atau add selector? | **Drop** (opsi A) — sesuai alur dinamis yang sudah ada. |
| D4 | N15 → pakai English saja, atau dual-language i18n? | **English only** dulu; i18n setelah core stabil. |
| D5 | N17 → hapus kolom `username`/`reputation_score` di participants atau implementasi custom tag? | **Hapus**; gamer tag `HERO_XXXX` sudah berfungsi baik. |

---

## Dampak ke test (regression)

| Item | Test yang berubah / ditambah |
|---|---|
| N1 | API smoke test: tambahkan kasus `403 Forbidden` untuk non-creator di `/start`, `/end`, `/appeal`, `/bracket/advance`, `/photo` |
| N2 | Frontend visual test (jika ada) untuk render `settlement_failed` (manual untuk hackathon) |
| N3 | Tambah test characterization: peserta blacklisted USDC → `emergencyRefund` revert (untuk dokumentasi). Pull-payment test bila diadopsi |
| N4 | `backend/test/reputation.test.js`: tambah unit test endpoint leaderboard memakai HP ter-regenerasi |
| N5 | `backend/test/eventId.test.js` atau test baru: mock supabase return acak → pairing round 2 tetap deterministic |
| N6 | Manual: verifikasi alamat USDC Celo Sepolia + sync semua sumber |

Target: **88 test existing tetap hijau** (kecuali yang sengaja diperbarui).
Jalankan `cd contracts && forge test` + `cd backend && npm test`.

---

## Prioritas urutan tindakan

1. **N1** (auth) — `S` effort, dampak keamanan tinggi.
2. **N2** (settlement_failed UI) — `M` effort, dampak UX & dana terkunci.
3. **N4** (leaderboard HP) — `S` effort, fitur tampak benar padahal salah.
4. **N5** (ordering bracket) — `XS` effort, bug laten.
5. **N6** (alamat USDC) — `XS` effort, verifikasi & sync.
6. **N7** (game_mode hardcoded) — `S` effort, konsistensi data.
7. **N3** (blacklist risk + rename) — `M` effort, dokumentasi + rename komentar untuk hackathon.
8. **N8 / N9 / N10 / N11** (UX polish mobile, nav, toast, projectId) — `M` effort.
9. **N15 / N16** (bahasa & env naming konsistensi) — `M` effort.
10. **N18** (isi 3 doc terpenting) — `M` effort.
11. **N17 / N12 / N13 / N14 / N19 / N20** (cleanup minor) — `S` effort masing-masing.
