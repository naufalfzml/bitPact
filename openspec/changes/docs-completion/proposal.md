## Why

`docs/README.md` adalah pintu dokumentasi yang sudah didesain rapi tapi
menjanjikan 7 dokumen technical reference yang **semuanya bertanda
"(belum tersedia)"**: `ARCHITECTURE.md`, `SMART-CONTRACT.md`, `DATABASE.md`,
`API.md`, `GAME-MODES.md`, `CONSENSUS.md`, `SETUP.md`. Untuk submission
hackathon dan onboarding contributor / reviewer, ini menjadi blocker
kepercayaan (proyek tampak "tidak selesai").

Per arahan user: eksekusi N18, isi minimal yang dibutuhkan. Kita prioritaskan
**3 dokumen paling kritis** yang langsung dipakai reviewer dan contributor
baru:

1. **ARCHITECTURE.md** — diagram alur & komponen utama.
2. **SMART-CONTRACT.md** — referensi API kontrak `BitPactVault`.
3. **API.md** — referensi REST API backend Express.

Sisa (`DATABASE.md`, `GAME-MODES.md`, `CONSENSUS.md`, `SETUP.md`) bisa diisi
di follow-up — tetap kita tandai sebagai *future* di tasks dengan struktur
sketsa.

## What Changes

- **Buat `docs/ARCHITECTURE.md`**:
  - Diagram Mermaid arsitektur layer (Frontend Next.js ↔ Backend Express ↔
    Supabase ↔ Celo RPC ↔ BitPactVault).
  - State machine event lifecycle (`setup → active → voting →
    ended | disputed | settlement_failed`).
  - Sequence diagram alur core (register, vote, settle).
- **Buat `docs/SMART-CONTRACT.md`**:
  - Address vault terbaru (mainnet & sepolia).
  - Daftar fungsi mutating (`createEvent`, `register`, `distributePrize`,
    `emergencyRefund`) + parameter + revert reasons + emitted events.
  - Daftar fungsi view (`getEventInfo`, `isParticipant`, `eventExists`,
    `usdc`, `admin`).
  - Catatan trust model & risiko (link ke "Known Risks" di
    `contracts/README.md`).
- **Buat `docs/API.md`**:
  - Daftar endpoint REST: path, method, body / query, status codes,
    response shape.
  - Group: Events / Registration / Bracket / Voting / Settlement /
    Reputation / Whitelist / Social Connect.
  - Sertakan catatan auth model (tracker-based via `creator_address` body).
- **Update `docs/README.md`**: hilangkan tag "(belum tersedia)" untuk 3 dokumen
  di atas, tambahkan link relatif yang benar. Sisa 4 dokumen tetap "(belum
  tersedia)" tapi sertakan placeholder file sketsa (h1 + TODO).

## Capabilities

### New Capabilities
- `docs-baseline`: Repository MUST menyediakan dokumentasi referensi
  arsitektur, smart contract, dan REST API yang up-to-date dengan
  implementasi & spec openspec.

## Impact

- **Docs**:
  - File baru: `docs/ARCHITECTURE.md`, `docs/SMART-CONTRACT.md`, `docs/API.md`.
  - File diubah: `docs/README.md` (link relatif aktif untuk 3 dokumen).
- **Code**: tidak ada perubahan kode.
- **Tests**: tidak ada perubahan test.

## Acceptance

- Reviewer baru dapat membuka `docs/README.md` → klik salah satu dari 3
  dokumen → menemukan informasi yang **cocok** dengan kode di repo.
- Tidak ada link broken (`(belum tersedia)`) untuk 3 dokumen yang dipilih.
- Diagram Mermaid di `ARCHITECTURE.md` ter-render di GitHub.
