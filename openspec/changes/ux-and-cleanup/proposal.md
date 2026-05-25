## Why

Lima cacat kecil & independen membuat alur utama tidak konsisten dengan dokumentasi dan
membingungkan pengguna (temuan M1–M4 & L1–L3 di [TESTING.md](../../../TESTING.md)):
turnamen `public` — alur inti di docs — tak bisa dibuat dari UI (M1); penalti minoritas
dihitung dari base reputasi usang, bukan HP saat ini (M2); peringatan di halaman vote
menyesatkan karena penalti sebenarnya hanya berlaku pada supermajority ≥85% (M4); Social
Connect menembak alamat kontrak Alfajores saat berjalan di Celo Sepolia (M3); dan
`.env.example`/docs sudah drift (alamat token lama, tautan absolut `/Users/ibanana/...`,
nama bitPact/bitPact & cUSD/USDC tak konsisten) (L1–L3). Semua bisa diperbaiki tanpa
menyentuh smart contract dan tanpa migrasi schema.

## What Changes

- **F6 — Tipe `public` bisa dibuat dari UI**: tambah opsi `public` (default) di selector
  access-type form create; sembunyikan field password/whitelist saat `public`. Backend
  sudah mendukung (`access_type = "public"` adalah default di
  [events.js:32](../../../backend/routes/events.js#L32)) — perubahan murni frontend.
- **F7 — Penalti minoritas pakai HP ter-regenerasi**: base penalti dibaca dari
  `getRegeneratedReputation(addr).current_hp`, bukan `reputation_score` tersimpan
  ([events.js:1391-1401](../../../backend/routes/events.js#L1391-L1401)), agar regenerasi
  pasif tidak diabaikan.
- **F9 — Peringatan minoritas akurat**: ubah banner halaman vote dari "memilih di
  minoritas akan mengurangi 10 HP" ([vote/page.tsx:182-184](../../../frontend/src/app/events/[id]/vote/page.tsx#L182-L184))
  menjadi pernyataan yang benar — penalti −10 HP hanya saat hasil akhir ≥85% sepihak DAN
  pemilih di pihak minoritas (≥85% / ≤15% di [events.js:1384](../../../backend/routes/events.js#L1384)).
- **F8 — Social Connect alamat sesuai network (Keputusan D3: cukup mainnet/alfajores)**:
  `getFederatedAttestationsAddress` memilih alamat sesuai network. Untuk network yang tak
  punya alamat (mis. `sepolia`, default kode), `resolveSocialIdentifier` MENGEMBALIKAN
  `NOT_RESOLVED` + log "unsupported network" SEBELUM kueri apa pun — tidak lagi diam-diam
  menembak alamat Alfajores ([socialConnect.js:101-105](../../../backend/lib/socialConnect.js#L101-L105)).
- **F10 — Bersihkan config & docs** (tanpa spec capability):
  - **L1** `backend/.env.example`: perbaiki komentar `CELO_NETWORK` agar menyertakan
    `sepolia` (default kode), dan ganti `CUSD_TOKEN_ADDRESS` → `USDC_TOKEN_ADDRESS`
    bernilai alamat native USDC Sepolia (`0x01C5C0122039549AD1493B8220cABEdD739BC44E`)
    sesuai [usdc-integration](../../../openspec/specs/usdc-integration/spec.md). Var ini
    hanya dokumentasi — tidak dibaca kode mana pun.
  - **L2** `docs/README.md`: ganti tautan absolut `file:///Users/ibanana/...` ke file dok
    yang belum ada menjadi penanda placeholder (status "belum tersedia") atau dihapus,
    sehingga tidak ada tautan rusak/mesin-spesifik.
  - **L3** Konsistensi nama: standarkan prosa & config ke **bitPact** dan **USDC** di
    `docs/README.md`, `README.md`, `PROJECT_OVERVIEW.md`. Identifier kode kontrak
    `BitPactVault` TIDAK diubah (lihat Non-Goals).

## Capabilities

### New Capabilities
- `event-access-control`: Pembuatan event dengan tipe akses `public` (default),
  `password`, dan `invite_only` dari UI; field rahasia (password/whitelist) hanya tampil
  untuk tipe yang relevan.

### Modified Capabilities
- `reputation-and-minority-penalty`: (F9) requirement peringatan minoritas pada halaman
  voting dibuat akurat (penalti hanya saat hasil ≥85% sepihak); (F7) tambah requirement
  bahwa base penalti adalah HP ter-regenerasi, bukan skor tersimpan.
- `native-social-connect-lookup`: (F8) tambah requirement bahwa resolusi hanya berjalan
  pada network dengan alamat FederatedAttestations yang valid (mainnet/alfajores); network
  tak didukung mengembalikan `NOT_RESOLVED` + log, tanpa kueri alamat salah.

## Impact

- **Frontend**:
  - `frontend/src/app/events/create/page.tsx`: tambah opsi `public` di selector access-type
    (default), gating tampilan password/whitelist.
  - `frontend/src/app/events/[id]/vote/page.tsx`: ubah teks banner peringatan minoritas.
- **Backend**:
  - `backend/routes/events.js` (`resolveConsensus`): base penalti dari
    `getRegeneratedReputation`.
  - `backend/lib/socialConnect.js`: pemilihan alamat per-network + gating network tak
    didukung.
  - `backend/.env.example`: komentar `CELO_NETWORK` + rename/retarget var token.
- **Docs**: `docs/README.md`, `README.md`, `PROJECT_OVERVIEW.md` (nama & istilah).
- **Tests**:
  - Tambah unit test pemilihan penalti dari HP ter-regenerasi (F7) dan pemilihan alamat
    per-network / gating (F8).
  - Tidak ada perubahan smart contract dan tidak ada migrasi schema; seluruh **69 test**
    (forge + `npm test`) tetap hijau.
