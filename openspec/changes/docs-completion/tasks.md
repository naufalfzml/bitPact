## 1. ARCHITECTURE.md

- [ ] 1.1 Buat `docs/ARCHITECTURE.md` dengan section:
      - "## Components" — list 4 layer (Smart Contract, Backend, Frontend, DB)
        + tanggung jawab masing-masing.
      - "## Diagram" — Mermaid graph yang menggambarkan arah panggilan
        (FE → BE → Supabase/RPC → Contract).
      - "## Event Lifecycle" — Mermaid state machine (lihat D2 design).
      - "## Trust Model" — admin wallet menandatangani settlement on-chain;
        backend trust-based untuk creator_address di body (link ke audit
        risk N1 yang sudah ditangani manual sebelumnya).
      - "## References" — link relatif ke openspec/specs.

## 2. SMART-CONTRACT.md (tunggu `contract-naming-and-blacklist-docs`)

- [ ] 2.1 Buat `docs/SMART-CONTRACT.md` setelah identifier `usdc` landed di
      contract.
- [ ] 2.2 Isi sections:
      - "## Deployed Addresses" — vault mainnet + sepolia, USDC mainnet +
        sepolia (cocokkan dengan README + openspec).
      - "## Admin Model" — backend admin wallet sebagai onlyAdmin.
      - "## Mutating Functions" — per fungsi: signature, parameter,
        emitted events, revert reasons.
        - `createEvent`
        - `register`
        - `distributePrize`
        - `emergencyRefund`
      - "## View Functions" — `getEventInfo`, `isParticipant`, `eventExists`,
        getter `admin()` + `usdc()`.
      - "## Known Risks" — link ke `contracts/README.md` (Known Risks section
        yang dibuat di change `contract-naming-and-blacklist-docs`).
      - "## Source of Truth" — link ke
        [contracts/src/BitPactVault.sol](../../../contracts/src/BitPactVault.sol).

## 3. API.md (tunggu `backend-correctness-cleanup`)

- [ ] 3.1 Buat `docs/API.md` setelah backend cleanup landed (leaderboard
      endpoint dihapus, `my_vote` ditambah).
- [ ] 3.2 Group endpoints + format konsisten (lihat D5 design):
      - Events: `POST /api/events`, `GET /api/events`, `GET /api/events/:id`.
      - Registration: `POST /api/events/:id/register`.
      - Whitelist: `GET /api/events/:id/whitelist/check`, `POST .../whitelist`.
      - Lifecycle: `POST .../lock-roster`, `.../select-game-mode`,
        `.../draft-bracket`, `.../start`, `.../end`, `.../bracket/advance`.
      - Voting: `POST /api/events/:id/vote`, `.../distribute`,
        `.../retry-settlement`.
      - Photo: `POST /api/events/:id/photo`.
      - Appeal: `POST /api/events/:id/appeal`.
      - Reputation: `GET /api/events/reputation/:wallet`,
        `GET /api/reputation/:wallet`.
      - Social Connect: `POST /api/social-connect/lookup`.
- [ ] 3.3 Tiap endpoint: body / query params, status codes utama, response
      shape. Catat auth (trust-based body field `creator_address`).
- [ ] 3.4 Sertakan section "Errors" yang menjelaskan format error
      (`{ error: string }`).

## 4. Sketsa 4 dokumen sisa

- [ ] 4.1 Buat stub `docs/DATABASE.md`, `docs/GAME-MODES.md`,
      `docs/CONSENSUS.md`, `docs/SETUP.md` dengan h1 + 1 paragraph + TODO.
      Tambah link ke openspec spec yang relevan untuk informasi formal.

## 5. Update index

- [ ] 5.1 Di `docs/README.md`, hilangkan tag "(belum tersedia)" untuk
      ARCHITECTURE / SMART-CONTRACT / API. Gunakan path relatif.
- [ ] 5.2 Sisanya: pertahankan "(belum tersedia — sketsa tersedia)" dan link
      ke stub.

## 6. Verifikasi

- [ ] 6.1 Buka file Mermaid di GitHub preview (atau VS Code Markdown preview)
      untuk konfirmasi render.
- [ ] 6.2 Cek semua link relatif valid (`grep -E "\(\.\./" docs/` atau buka
      tiap link manual).

## 7. Commit plan

- [ ] 7.1 `docs: add architecture overview with mermaid lifecycle diagram` (task 1)
- [ ] 7.2 `docs: add smart contract reference` (task 2 — depends contract rename)
- [ ] 7.3 `docs: add REST API reference` (task 3 — depends backend cleanup)
- [ ] 7.4 `docs: stub remaining technical docs and clean index` (task 4 + 5)
