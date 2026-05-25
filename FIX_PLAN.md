# bitPact — Rencana Perbaikan (Fix Plan)

Dokumen ini memetakan semua temuan di [TESTING.md](TESTING.md) menjadi rencana
perbaikan yang siap diubah menjadi **openspec change**. Setiap item ditulis dengan
gaya `Requirement` + `Scenario` (WHEN/THEN) agar konversi ke `openspec/changes/<id>/specs/...`
mudah. Tidak ada kode yang diubah oleh dokumen ini.

> Status saat ini: belum ada perbaikan diterapkan. Urutan kerja yang disarankan:
> **(1)** kamu buat openspec dari plan ini → **(2)** implementasi per change → **(3)**
> test (Foundry + `npm test`) hijau → **(4)** archive change.

## Prioritas & pemetaan ke openspec change

| Prio | Fix | Temuan | Usulan nama openspec change | Layer |
|---|---|---|---|---|
| P0 | F1 Pool dari state on-chain | K1 | `escrow-payout-integrity` | backend, contract-read |
| P0 | F2 Status `ended` hanya jika receipt sukses | K2 | `escrow-payout-integrity` | backend, db |
| P0 | F3 Hentikan bypass peserta tanpa deposit | K1 | `escrow-payout-integrity` | backend, frontend |
| P1 | F4 FFA bisa dijalankan di lifecycle baru | H1 | `ffa-lifecycle-restore` | backend, frontend |
| P1 | F5 Resolusi saat 0 vote / timeout | H2 | `consensus-timeout-resolution` | backend (cron+resolve) |
| P2 | F6 Tipe `public` bisa dibuat dari UI | M1 | `public-event-creation` | frontend |
| P2 | F7 Penalti reputasi pakai HP ter-regenerasi | M2 | `reputation-penalty-accuracy` | backend |
| P2 | F8 Social Connect alamat sesuai network | M3 | `social-connect-network-fix` | backend |
| P2 | F9 Peringatan minority akurat | M4 | `reputation-penalty-accuracy` | frontend |
| P3 | F10 Bersihkan `.env.example` & docs | L1–L3 | `config-and-docs-cleanup` | docs/config |

---

## P0 — Keamanan dana escrow (change: `escrow-payout-integrity`)

### F1 — Hitung pool & shares dari `prizePool` on-chain, bukan jumlah baris DB

**Masalah:** `resolveConsensus` menghitung
`totalPool = parseUnits(String(ticket_price * dbParticipantCount), 6)`
([backend/routes/events.js:1330-1333](backend/routes/events.js#L1330-L1333)).
Bila jumlah baris peserta di DB ≠ jumlah depositor on-chain, `sum(shares) ≠ prizePool`
dan `distributePrize` revert `SharesMismatch`. Terbukti di
`test_flow_phantomParticipant_causesSharesMismatch`.

**Solusi:** sebelum distribusi, baca pool nyata dari kontrak:
```
const [, , prizePool] = await publicClient.readContract({
  address, abi, functionName: "getEventInfo", args: [eventIdBytes32]
});
// bagi prizePool ke winners; sisa pembulatan ke winner terakhir
```
Pendekatan ini sudah dibuktikan benar oleh `test_flow_poolFromOnChainState_distributesCorrectly`.

**File:** `backend/routes/events.js` (fungsi `resolveConsensus`).

**Acceptance / Scenario:**
- WHEN konsensus tercapai THEN backend membaca `prizePool` via `getEventInfo` AND
  `sum(shares) === prizePool` AND `distributePrize` tidak pernah revert karena mismatch.
- Test: ubah karakterisasi `BUG: phantom DB participant...` di
  `backend/test/prizePool.test.js` menjadi assertion bahwa shares dihitung dari
  on-chain pool; tambah test integrasi yang memverifikasi `sum(shares) === onChainPool`.

### F2 — Set status `ended` HANYA setelah receipt on-chain sukses

**Masalah:** error `distributePrize`/`emergencyRefund` hanya di-`console.error`,
status tetap di-set `ended`
([events.js:1345-1361](backend/routes/events.js#L1345-L1361),
[1363-1381](backend/routes/events.js#L1363-L1381)). DB bilang "selesai" padahal dana
tak cair → dana terkunci senyap.

**Solusi:**
- Pindahkan `update({ status: "ended" })` ke DALAM blok sukses (setelah
  `waitForTransactionReceipt` mengembalikan `status === "success"`).
- Jika gagal: set status baru `settlement_failed` (lihat migrasi di bawah) + simpan
  `settlement_error` + `settlement_tx_hash`, dan sediakan endpoint retry
  `POST /api/events/:id/retry-settlement` (creator/admin only).

**File:** `backend/routes/events.js`; migrasi schema (status enum).

**Acceptance / Scenario:**
- WHEN transaksi distribusi gagal/revert THEN status TIDAK menjadi `ended` AND menjadi
  `settlement_failed` AND error tersimpan AND dapat di-retry.
- WHEN retry sukses THEN status menjadi `ended`.

### F3 — Hentikan pembuatan baris peserta tanpa deposit on-chain

**Masalah:** path `tx_hash === "social-connect-invite"` mem-bypass verifikasi on-chain
dan menyisipkan peserta DB tanpa deposit
([events.js:306-310](backend/routes/events.js#L306-L310)). Frontend
`handleAddResolvedPlayer` ([events/[id]/page.tsx:577-606](frontend/src/app/events/[id]/page.tsx#L577-L606))
memakai path ini. Ini sumber peserta "hantu" pada F1.

**Solusi:**
- Social Connect untuk invite-only HANYA mengisi **whitelist** (sudah ada endpoint
  `POST /api/events/:id/whitelist` + `handleAddToWhitelist`). Peserta yang diundang
  tetap harus `register` + deposit normal.
- Hapus cabang bypass `social-connect-invite` di endpoint register, ATAU pastikan baris
  peserta hanya dibuat setelah `isParticipant` on-chain `true`.

**File:** `backend/routes/events.js` (register), `frontend/src/app/events/[id]/page.tsx`.

**Acceptance / Scenario:**
- WHEN creator mengundang via Social Connect THEN alamat masuk whitelist saja, BUKAN roster.
- WHEN peserta diundang mendaftar THEN dia tetap approve+deposit on-chain sebelum jadi peserta.
- INVARIANT: setiap baris `participants` punya deposit on-chain yang terverifikasi
  (`isParticipant === true`).

> Catatan: F1 + F3 saling menguatkan. Walau F3 selesai, **F1 tetap wajib** sebagai
> jaring pengaman (sumber kebenaran = pool on-chain).

---

## P1 — Fitur inti yang macet

### F4 — Mode FFA bisa dijalankan (change: `ffa-lifecycle-restore`)

**Masalah:** `select-game-mode` tidak men-generate bracket untuk `ffa`
([events.js:633-655](backend/routes/events.js#L633-L655)), tetapi `/start` menolak bila
bracket kosong ([events.js:874](backend/routes/events.js#L874)). UI selector hanya
1v1/team ([events/[id]/page.tsx:1102-1103](frontend/src/app/events/[id]/page.tsx#L1102-L1103)).
Akibatnya FFA (mode inti di `PROJECT_OVERVIEW.md`) tak bisa start.

**Solusi:**
- Backend `/start`: lewati syarat "bracket harus ada" untuk `game_mode === "ffa"`
  (FFA tak punya bracket; pemenang ditentukan manual saat `active`).
- UI: tambahkan opsi `ffa` di selector `select-game-mode`.
- Pastikan alur FFA `active → input top-3 → /end → voting` (UI FFA sudah ada di state active).

**File:** `backend/routes/events.js` (`/start`, opsional `select-game-mode`),
`frontend/src/app/events/[id]/page.tsx`.

**Acceptance / Scenario:**
- WHEN creator memilih `ffa` lalu `/start` THEN event menjadi `active` tanpa error bracket.
- WHEN creator submit top-3 winner di FFA THEN status → `voting`.
- Test: tambah test backend yang memastikan `/start` dengan `game_mode=ffa` & 0 bracket
  lolos guard (mock DB), dan guard bracket tetap berlaku untuk 1v1.

### F5 — Resolusi konsensus saat timeout / 0 vote (change: `consensus-timeout-resolution`)

**Masalah:** `resolveConsensus` keluar dini bila `votes.length === 0`
([events.js:1293](backend/routes/events.js#L1293)); cron hanya memanggilnya. Event tanpa
satu pun vote dalam 24 jam macet di `voting` selamanya. Terbukti di
`backend/test/consensus.test.js` (`EDGE: zero votes`).

**Solusi:**
- Bedakan resolusi normal (semua sudah vote) vs resolusi **timeout**. Cron memanggil
  resolusi dengan flag `isTimeout`.
- Aturan timeout (sesuai spec "non-voter = abstain"):
  - ada ≥1 vote → resolusi berdasar vote yang masuk (logika sekarang).
  - **0 vote** → jalankan `emergencyRefund` (default aman: tak ada yang memvalidasi) dan
    set status sesuai hasil F2.
- (Opsional) jadwalkan auto-resolve tepat pada `winners_submitted_at + 24h`, bukan hanya
  scan per jam.

**File:** `backend/routes/events.js` (`resolveConsensus`), `backend/cron/autoAbstain.js`.

**Acceptance / Scenario:**
- WHEN 24 jam lewat dengan 0 vote THEN dana di-refund AND event tak lagi `voting`.
- WHEN 24 jam lewat dengan sebagian vote THEN resolusi pakai vote yang masuk.
- Test: `EDGE: zero votes` diubah agar mengembalikan aksi `refund` saat `isTimeout`.

> **Keputusan dibutuhkan (D2 di bawah):** 0 vote saat timeout → `refund` atau `disputed`?

---

## P2 — Konsistensi alur & UX

### F6 — Tipe `public` bisa dibuat dari UI (change: `public-event-creation`)

**Masalah:** form create hanya menawarkan `password`/`invite_only`
([create/page.tsx:19,164-166](frontend/src/app/events/create/page.tsx#L19)); backend &
docs menjadikan `public` sebagai default core-loop.

**Solusi:** tambah opsi `public` (default) di selector access-type; sembunyikan field
password/whitelist saat `public`. Backend sudah mendukung.

**File:** `frontend/src/app/events/create/page.tsx`.

**Acceptance / Scenario:**
- WHEN creator memilih `public` THEN event dibuat dengan `access_type=public` tanpa
  password/whitelist AND siapa pun bisa register.

### F7 — Penalti minority pakai HP ter-regenerasi (change: `reputation-penalty-accuracy`)

**Masalah:** penalti membaca `reputation_score` tersimpan, bukan HP saat ini
([events.js:1400-1401](backend/routes/events.js#L1400-L1401)), sehingga penalti dihitung
dari base usang (abaikan regenerasi).

**Solusi:** `currentHp = (await getRegeneratedReputation(addr)).current_hp;`
`newScore = Math.max(0, currentHp - 10);` lalu simpan.

**File:** `backend/routes/events.js`.

**Acceptance / Scenario:**
- WHEN user yang sudah pulih (mis. 100 setelah regen) kena penalti THEN base = 100 → 90,
  bukan dari nilai tersimpan lama.
- Test: tambah unit test untuk fungsi penalti (mock supabase + helper).

### F9 — Peringatan minority akurat (change: `reputation-penalty-accuracy`)

**Masalah:** halaman vote selalu menampilkan "-10 HP jika minoritas"
([vote/page.tsx:182-184](frontend/src/app/events/[id]/vote/page.tsx#L182-L184)), padahal
penalti hanya berlaku pada supermajority ≥85%/≤15% ([events.js:1384](backend/routes/events.js#L1384)).

**Solusi:** ubah teks menjadi akurat, mis. "Penalti -10 HP hanya berlaku bila hasil
akhir ≥85% sepihak dan kamu di pihak minoritas."

**File:** `frontend/src/app/events/[id]/vote/page.tsx`.

### F8 — Social Connect alamat sesuai network (change: `social-connect-network-fix`)

**Masalah:** `getFederatedAttestationsAddress` fallback ke alfajores untuk semua non-mainnet
([lib/socialConnect.js:101-105](backend/lib/socialConnect.js#L101-L105)), padahal default
network `sepolia` → query ke alamat/chain salah.

**Solusi:**
- Verifikasi apakah `FederatedAttestations` ter-deploy di Celo Sepolia. Jika ya → tambah
  alamatnya ke map. Jika tidak → gate fitur: untuk network yang tak didukung kembalikan
  `{ status: "NOT_RESOLVED" }` + log "unsupported network" (jangan diam-diam query alfajores).

**File:** `backend/lib/socialConnect.js`.

**Acceptance / Scenario:**
- WHEN `CELO_NETWORK` tak punya alamat FederatedAttestations THEN lookup tak menembak
  alamat salah AND mengembalikan NOT_RESOLVED dengan log jelas.

> **Keputusan dibutuhkan (D3):** apakah Social Connect ditarget jalan di Sepolia
> (perlu alamat valid) atau cukup mainnet/alfajores untuk demo?

---

## P3 — Konfigurasi & dokumentasi (change: `config-and-docs-cleanup`)

### F10
- **L1** `backend/.env.example`: perbaiki komentar `CELO_NETWORK` (sertakan `sepolia`
  yang jadi default kode) & ganti `CUSD_TOKEN_ADDRESS` ke USDC native sesuai
  `openspec/specs/usdc-integration`.
- **L2** `docs/README.md`: ganti tautan absolut `/Users/ibanana/...` jadi relatif, dan
  buat/hapus referensi file dok yang belum ada (`ARCHITECTURE.md`, `SMART-CONTRACT.md`, dst).
- **L3** Konsistensi nama: bitPatch vs bitPact dan cUSD/USDm/USDC di seluruh teks.

---

## Migrasi schema yang dibutuhkan

Untuk **F2** (& sebagian F5), perlu nilai status baru. Buat
`backend/migrations/003_add_settlement_status.sql`:
```sql
-- longgarkan / perbarui CHECK status events agar mencakup kegagalan settlement
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('setup','active','voting','ended','disputed','settlement_failed'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS settlement_error TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS settlement_tx_hash TEXT;
```

---

## Keputusan yang dibutuhkan sebelum implementasi

- **D1 (F3):** Hapus total cabang `social-connect-invite`, atau pertahankan tapi paksa
  verifikasi on-chain? (rekomendasi: hapus; Social Connect → whitelist saja).
- **D2 (F5):** Timeout dengan 0 vote → `emergencyRefund` (rekomendasi) atau `disputed`?
- **D3 (F8):** Social Connect perlu jalan di Sepolia, atau cukup mainnet/alfajores?
- **D4 (F2):** OK menambah status `settlement_failed` + endpoint retry, atau cukup
  pertahankan status `voting`/`disputed` saat gagal tanpa status baru?

---

## Dampak ke test (regression)

| Fix | Test yang berubah / ditambah |
|---|---|
| F1, F3 | `backend/test/prizePool.test.js` (karakterisasi BUG → assertion benar); test integrasi pool on-chain |
| F2 | test resolusi: status hanya `ended` jika receipt sukses (mock chain) |
| F4 | test guard `/start` untuk ffa vs 1v1 |
| F5 | `backend/test/consensus.test.js` (`EDGE: zero votes` → `refund` saat timeout) |
| F7 | unit test fungsi penalti (base = HP ter-regenerasi) |
| F8 | unit test pemilihan alamat per-network |

Semua perbaikan harus menjaga **69 test** existing tetap hijau (kecuali yang sengaja
diperbarui di tabel ini), via `cd contracts && forge test` dan `cd backend && npm test`.
