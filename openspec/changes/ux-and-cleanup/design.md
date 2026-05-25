## Context

Change ini menggabungkan lima perbaikan kecil yang **independen** dan **berisiko rendah**
(M1–M4, L1–L3 di [TESTING.md](../../../TESTING.md)). Tidak ada satu pun yang menyentuh
smart contract `BitPatchVault`, schema DB, atau jalur escrow — sehingga aman dikerjakan
terpisah dari P0/P1 (`escrow-payout-integrity`, `lifecycle-completeness`).

Fakta terverifikasi dari kode saat ini:
- Backend SUDAH menerima `access_type = "public"` sebagai default dan memvalidasinya
  ([events.js:32](../../../backend/routes/events.js#L32),
  [44-45](../../../backend/routes/events.js#L44-L45)). Form create di frontend hanya
  menawarkan `password`/`invite_only` ([create/page.tsx:19](../../../frontend/src/app/events/create/page.tsx#L19),
  [164-166](../../../frontend/src/app/events/create/page.tsx#L164-L166)).
- Penalti minoritas hanya berjalan pada band `agreePercent >= 85 || <= 15`
  ([events.js:1384](../../../backend/routes/events.js#L1384)), tetapi base skor dibaca dari
  baris `reputation_tracking` terakhir ([events.js:1391-1401](../../../backend/routes/events.js#L1391-L1401)),
  bukan dari `getRegeneratedReputation` ([reputationHelper.js:14](../../../backend/lib/reputationHelper.js#L14)).
- `getFederatedAttestationsAddress` jatuh ke `alfajores` untuk semua non-mainnet
  ([socialConnect.js:101-105](../../../backend/lib/socialConnect.js#L101-L105)), padahal
  default network kode adalah `sepolia` ([blockchain.js:17](../../../backend/lib/blockchain.js#L17)).
- `CUSD_TOKEN_ADDRESS` di `.env.example` **tidak dibaca** oleh kode mana pun (token
  diambil dari kontrak on-chain) — hanya dokumentasi/leftover.

## Goals / Non-Goals

**Goals:**
- Tipe `public` dapat dipilih & dibuat dari UI create (F6).
- Base penalti minoritas = HP ter-regenerasi saat ini (F7).
- Teks peringatan minoritas pada halaman vote akurat (F9).
- Social Connect tidak pernah menembak alamat kontrak yang salah; network tak didukung →
  `NOT_RESOLVED` + log (F8, Keputusan D3).
- `.env.example` & docs bersih dan konsisten (F10).
- Seluruh **69 test** tetap hijau; tambah unit test untuk F7 & F8.

**Non-Goals:**
- TIDAK mengubah smart contract `BitPatchVault.sol`, ABI, atau alamat deploy.
- TIDAK mengganti identifier kode `BitPatchVault` / `VAULT_CONTRACT_ADDRESS` (akan memecah
  69 test & ABI). Cleanup nama hanya pada prosa & config dokumentasi.
- TIDAK menambah alamat FederatedAttestations untuk Sepolia (Keputusan D3: cukup
  mainnet/alfajores; Sepolia digate, bukan didukung).
- TIDAK ada migrasi schema DB.
- TIDAK mengubah ambang penalti/konsensus on-chain maupun logika regenerasi HP itu sendiri.

## Decisions

### D-F6: `public` jadi default selector, gating field rahasia (frontend-only)
Tambah `<option value="public">` sebagai opsi pertama/terpilih; ubah state default
`accessType` menjadi `"public"`; field password hanya render saat `password`, blok
whitelist/Social Connect hanya saat `invite_only`. Body POST mengirim
`access_type: "public"` tanpa `password`/`whitelist`.
- **Alternatif ditolak:** menambah validasi backend baru — tak perlu, backend sudah
  menerima `public`.

### D-F7: Base penalti dari `getRegeneratedReputation`
Ganti pembacaan langsung baris `reputation_tracking` dengan
`const currentHp = (await getRegeneratedReputation(v.voter_address)).current_hp;` lalu
`const newScore = Math.max(0, currentHp - 10);` sebelum `insert`. Helper sudah di-import
di `events.js` ([events.js:12](../../../backend/routes/events.js#L12)).
- **Rationale:** menyatukan sumber kebenaran HP dengan endpoint reputasi & status bar,
  sehingga regenerasi pasif tidak diabaikan saat menghitung base penalti.
- **Alternatif ditolak:** menghitung regen inline di `resolveConsensus` — duplikasi logika
  yang sudah ada di helper.

### D-F9: Teks peringatan dibuat kondisional-akurat (frontend-only)
Ganti banner statis menjadi pernyataan benar, mis. `■ WARNING: PENALTI −10 HP HANYA BILA
HASIL AKHIR ≥85% SEPIHAK DAN ANDA DI PIHAK MINORITAS ■`. Tidak menambah logika; murni
teks agar sesuai band aktual di backend ([events.js:1384](../../../backend/routes/events.js#L1384)).

### D-F8: Pemilihan alamat per-network + gating (Keputusan D3)
Refactor `getFederatedAttestationsAddress` agar mengembalikan alamat HANYA bila network ada
di map, selain itu `null`:
```js
function getSupportedNetwork() {
  const n = process.env.CELO_NETWORK;
  return n === "mainnet" ? "mainnet" : n === "alfajores" ? "alfajores" : null;
}
function getFederatedAttestationsAddress() {
  const net = getSupportedNetwork();
  return net ? FEDERATED_ATTESTATIONS_ADDRESS[net] : null;
}
```
Di `resolveSocialIdentifier`, SETELAH cache miss & SEBELUM kueri ODIS/kontrak, gate:
```js
if (!getFederatedAttestationsAddress()) {
  console.warn(`[SocialConnect] Unsupported network "${process.env.CELO_NETWORK}" — no FederatedAttestations address. Returning NOT_RESOLVED.`);
  return { status: "NOT_RESOLVED", address: null };
}
```
- **Rationale (D3):** demo cukup di mainnet/alfajores; Sepolia (default kode) tidak punya
  alamat valid, jadi lebih jujur mengembalikan `NOT_RESOLVED` + log daripada menembak
  kontrak Alfajores di chain Sepolia (selalu gagal/menyesatkan).
- **Alternatif ditolak:** menambah alamat Sepolia ke map — di luar scope D3 dan butuh
  verifikasi deployment FederatedAttestations di Sepolia yang tak dijamin ada.

### D-F10: Cleanup config/docs, kode tak tersentuh
- `.env.example`: komentar `CELO_NETWORK=sepolia # atau mainnet / alfajores`; rename
  `CUSD_TOKEN_ADDRESS` → `USDC_TOKEN_ADDRESS` = `0x01C5C0122039549AD1493B8220cABEdD739BC44E`
  (USDC Sepolia, sesuai usdc-integration). Aman karena var tak dibaca kode.
- `docs/README.md`: tautan `file:///Users/ibanana/...` ke dok yang belum ada diganti
  penanda `(belum tersedia)` (tanpa hyperlink), bukan tautan rusak.
- Nama: standarkan prosa ke **bitPact** & istilah mata uang ke **USDC** di `docs/README.md`,
  `README.md`, `PROJECT_OVERVIEW.md`. Tidak menyentuh `BitPatchVault` di kode.

## Risks / Trade-offs

- **[F6] Backend menolak payload tak konsisten** → frontend tidak mengirim
  `password`/`whitelist` saat `public`; backend hanya butuh `access_type` valid (sudah ada).
- **[F7] `getRegeneratedReputation` menambah 1 query per minority voter** → jumlah minority
  voter kecil & resolusi berjalan di cron/endpoint, bukan hot path; dapat diterima.
- **[F8] Pengguna demo di Sepolia kehilangan Social Connect** → memang konsekuensi D3;
  log eksplisit memberi tahu operator untuk memakai mainnet/alfajores bila butuh fitur ini.
- **[F10] Salah ganti nama menembus ke kode** → cleanup nama dibatasi ke file prosa/docs &
  komentar; identifier kode (`BitPatchVault`, env var yang dibaca kode) tidak diubah,
  dijaga oleh 69 test yang tetap hijau.

## Migration Plan

Tidak ada migrasi DB maupun deployment kontrak. Penerapan murni perubahan kode frontend,
satu helper backend, satu lib backend, plus file config/docs. Rollback = revert commit;
tidak ada state persisten yang berubah.

## Open Questions

Tidak ada — Keputusan D3 (Social Connect cukup mainnet/alfajores) sudah ditetapkan.
