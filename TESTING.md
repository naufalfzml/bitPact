# bitPact — Testing & Flow Analysis

Hasil analisis codebase + test yang ditambahkan untuk memverifikasi apakah alur
(lifecycle turnamen → escrow → konsensus → payout/refund) sudah sesuai desain di
`PROJECT_OVERVIEW.md`, `docs/README.md`, dan `openspec/specs/`.

## Ringkasan hasil

| Suite | Lokasi | Jumlah | Status |
|---|---|---|---|
| Smart contract (unit) | `contracts/test/BitPactVault.t.sol` | 21 | ✅ pass |
| Smart contract (flow/E2E) | `contracts/test/BitPactVaultFlow.t.sol` | 4 | ✅ pass |
| Backend unit + logic | `backend/test/*.test.js` | 27 | ✅ pass |
| Backend API smoke | `backend/test/api.smoke.test.js` | 17 | ✅ pass |
| **Total** | | **69** | ✅ pass |

> Catatan: test yang berlabel `BUG:` / `EDGE:` **lulus** karena sengaja meng-*capture*
> perilaku saat ini (characterization test). Lulusnya test tersebut justru **membuktikan
> bug itu ada** — lihat bagian Temuan.

## Cara menjalankan

```bash
# Smart contract (butuh foundry: forge 1.7.x)
cd contracts && forge test -vv

# Backend (Node 24, tanpa dependency tambahan — pakai node:test bawaan)
cd backend && npm test
```

Backend test berjalan **offline**: `backend/test/_env.js` menyuntik env dummy yang
valid sehingga `lib/blockchain.js` & `lib/supabase.js` bisa di-`require` tanpa
jaringan. Smoke test mem-boot router Express asli (tanpa cron/listen port tetap) dan
hanya menguji endpoint yang ter-*guard* sebelum menyentuh Supabase/RPC.

---

## Apa yang sudah TERBUKTI BENAR ✅

- **Escrow contract solid** — create/register/distribute/refund, semua guard
  (`OnlyAdmin`, `SharesMismatch`, `AlreadyRegistered`, double-distribute, dst) benar.
- **eventId konsisten lintas layer** — backend `keccak256(toHex(uuid))` ==
  frontend `keccak256(stringToBytes(id))`. Diverifikasi 200+ string acak. Kalau ini
  beda, seluruh alur on-chain putus — ternyata aman.
- **Desimal USDC (6) konsisten** contract ↔ backend ↔ frontend. Risiko presisi
  `parseUnits(String(price*count), 6)` ternyata **aman** untuk semua harga 2–3 desimal
  (scan 1.5 juta kombinasi → 0 divergensi) karena `viem.parseUnits` membulatkan.
- **Reputasi (HP)** — regen +1/interval, cap 100, base dari penalti terakhir: benar.
- **Konsensus** — tie→disputed, ≥threshold→distribute, <threshold→refund, band
  minority ≥85%/≤15%, kuorum turnout ≥51%: sesuai spec.
- **Urutan approve→register** menunggu `waitForTransactionReceipt` (sesuai spec USDC).
- **Validasi input API** — 17 guard (400/403/404) berperilaku benar.

---

## Temuan — perlu diperbaiki

### 🔴 KRITIS

**K1. Peserta "hantu" (Social Connect invite) → distribusi revert, dana terkunci.**
Alur invite (`handleAddResolvedPlayer` di `frontend/.../events/[id]/page.tsx:582`)
memanggil `/register` dengan `tx_hash:"social-connect-invite"`, yang **mem-bypass
verifikasi on-chain** ([backend/routes/events.js:306-310](backend/routes/events.js#L306-L310))
dan menyisipkan baris peserta di DB **tanpa deposit on-chain**.
Saat resolusi, pool dihitung dari **jumlah baris DB**, bukan `prizePool` on-chain
([events.js:1330-1333](backend/routes/events.js#L1330-L1333)). Akibatnya
`sum(shares) > prizePool` → `distributePrize` revert `SharesMismatch`.
Dibuktikan oleh `test_flow_phantomParticipant_causesSharesMismatch` (Foundry) dan
test backend `phantom DB participant`.
**Fix:** baca pool nyata via `getEventInfo(eventId)` on-chain (lihat
`test_flow_poolFromOnChainState_distributesCorrectly`), atau jangan pernah membuat
baris peserta DB tanpa deposit terverifikasi.

**K2. Kegagalan on-chain ditelan, status tetap di-set `ended`.**
Di `resolveConsensus`, error `distributePrize`/`emergencyRefund` hanya di-`console.error`
lalu status event tetap diubah ke `ended`
([events.js:1345-1361](backend/routes/events.js#L1345-L1361) &
[1363-1381](backend/routes/events.js#L1363-L1381)). DB melaporkan "selesai" padahal
dana tidak pernah cair/refund. Tidak ada retry maupun error yang dipermukakan ke user.
**Fix:** hanya set `ended` setelah receipt sukses; jika gagal → status `disputed`/`failed`
+ jalur retry.

### 🟠 TINGGI

**H1. Mode FFA mati di lifecycle dinamis baru.**
`select-game-mode` tidak men-generate bracket apa pun untuk `ffa`
([events.js:633-655](backend/routes/events.js#L633-L655) hanya menangani 1v1/team),
sedangkan `/start` menolak jika bracket kosong
([events.js:874](backend/routes/events.js#L874)). Plus UI hanya menawarkan 1v1/team
([page.tsx:1102-1103](frontend/src/app/events/[id]/page.tsx#L1102-L1103)) dan create selalu
mengirim `"1v1"` ([create/page.tsx:63](frontend/src/app/events/create/page.tsx#L63)).
FFA — mode inti di `PROJECT_OVERVIEW.md` — tidak bisa dijalankan.

**H2. Event tanpa suara tidak pernah selesai.**
`resolveConsensus` keluar dini bila `votes.length === 0`
([events.js:1293](backend/routes/events.js#L1293)); cron hanya memanggil
`resolveConsensus`. Jika 24 jam lewat tanpa satu pun vote, event macet di `voting`
selamanya, dana terkunci. Bertentangan dengan spec "non-voter = abstain". Dibuktikan
oleh test `EDGE: zero votes => no resolution`.

### 🟡 SEDANG

**M1. Tipe akses `public` tidak bisa dibuat dari UI.** Form create hanya menawarkan
`password`/`invite_only` ([create/page.tsx:164-166](frontend/src/app/events/create/page.tsx#L164-L166)),
padahal backend & docs menjadikan `public` sebagai default core-loop. Turnamen publik
(alur utama di dokumentasi) tak bisa dibuat lewat aplikasi.

**M2. Penalti minority menumpuk di base lama, abaikan regenerasi.**
Penalti membaca `reputation_score` tersimpan, bukan HP ter-regenerasi
([events.js:1400-1401](backend/routes/events.js#L1400-L1401)), sehingga penalti
berikutnya dihitung dari base usang (bisa over/under-penalti).

**M3. Social Connect pakai alamat kontrak Alfajores di jaringan Sepolia.**
`getFederatedAttestationsAddress` fallback ke alfajores untuk non-mainnet
([lib/socialConnect.js:101-105](backend/lib/socialConnect.js#L101-L105)) padahal default
network = `sepolia` → lookup query ke alamat/chain yang salah, selalu `NOT_RESOLVED`.

**M4. Peringatan minority menyesatkan.** Halaman vote selalu menampilkan "-10 HP jika
minoritas" ([vote/page.tsx:182-184](frontend/src/app/events/[id]/vote/page.tsx#L182-L184)),
padahal penalti hanya berlaku pada supermajority ≥85%/≤15%
([events.js:1384](backend/routes/events.js#L1384)). Pada 51–84% tak ada penalti.

### ⚪ RENDAH (konfigurasi / dokumentasi)

- **L1.** `backend/.env.example` drift: `CELO_NETWORK=mainnet # or alfajores`
  (tanpa `sepolia` yang justru default kode); `CUSD_TOKEN_ADDRESS` masih alamat cUSD lama,
  bukan USDC native sesuai `openspec/specs/usdc-integration`.
- **L2.** `docs/README.md` menaut file (`ARCHITECTURE.md`, `SMART-CONTRACT.md`, dst.) yang
  **tidak ada** di repo, dengan path absolut mesin lain (`/Users/ibanana/...`).
- **L3.** Inkonsistensi nama branding dan istilah mata uang di beberapa dokumen lama.

---

## Prioritas perbaikan

1. **K1 + K2** — menyangkut keamanan dana (escrow bisa terkunci secara senyap).
2. **H1, H2** — fitur inti (FFA) & jalur penyelesaian (no-vote) tidak berfungsi.
3. **M1–M4** — konsistensi alur & UX.
4. **L1–L3** — kebersihan konfig & dokumentasi.
