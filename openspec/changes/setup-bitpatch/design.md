## Context

The bitPatch platform enables users to organize real-life social and gaming matches with high-trust, on-chain crypto prize pools using Opera MiniPay on the Celo network. In real-life gaming contexts, players want instant Web3 convenience with the safety of a smart contract-driven escrow, along with community validation of the tournament outcomes to prevent fraud. The contract acts as a "blind third-party escrow" — it holds funds without making gameplay decisions; all game logic and winner determination happen off-chain through the creator/jury and are validated by participant consensus.

## Goals / Non-Goals

**Goals:**
- Provide a robust smart contract escrow vault (`BitPatchVault.sol`) on the Celo network to secure participant entry fees (cUSD), with explicit `bytes32 eventId` mapping to prize pool, distribution status, creator address, and participant list.
- Implement a lightweight, secure Node Express.js API backend coupled with Supabase for real-time tracking, state management, bracket generation, team formation, photo audit enforcement, and wallet-authorized smart contract actions.
- Build a polished, premium Next.js Web3 application themed with a stunning 8-bit retro/pixel art style, completely devoid of arrows and utilizing crisp geometric box layouts.
- Establish a reliable consensus voting flow for tournament outcomes, complete with auto-abstain timeouts (24 hours), dispute tie-breakers with a second appeal mechanism, and minority penalties for bad-faith voters.
- Support three game modes: Solo PvP (1v1) with single-elimination / best-of-3 brackets, Team PvP (X vs X) with configurable team size, and Free-For-All (FFA) with leaderboard scoring.

**Non-Goals:**
- Building game-specific integrations (e.g. directly calling game server APIs). Matches are played in real life or via external platforms.
- Supporting general ERC20 token pools or multi-chain networks. bitPatch will focus exclusively on Celo cUSD for MiniPay optimization.
- Implementing fully decentralized on-chain DAO governance. A hybrid trust model (Smart Contract Escrow + Backend Admin Wallet Execution + Participant Social Consensus) is utilized.

## Decisions

### 1. Smart Contract Architecture (BitPatchVault.sol)
We will implement a non-upgradeable Solidity escrow contract using Foundry. The contract acts as a blind escrow.

- **State Structs**:
  ```solidity
  struct EventInfo {
      address creator;
      uint256 ticketPrice;
      uint256 prizePool;
      bool distributed;
      address[] participants;
      mapping(address => bool) isRegistered;
  }
  mapping(bytes32 => EventInfo) public events;
  ```
- **Key Functions**:
  - `createEvent(bytes32 eventId, uint256 ticketPrice, address creator)` — Admin-only, initializes event mapping.
  - `register(bytes32 eventId)` — Participant deposits exact cUSD ticket price via ERC20 transferFrom.
  - `distributePrize(bytes32 eventId, address[] memory winners, uint256[] memory shares)` — Admin-only, distributes shares to winners.
  - `emergencyRefund(bytes32 eventId)` — Admin-only, refunds ticket price to each participant.
- **Administrative Authority**: Only a single backend admin wallet is authorized to execute `createEvent`, `distributePrize`, and `emergencyRefund`. This protects the funds from malicious participant calls while ensuring payouts only occur after consensus validation is verified on Supabase.
- **cUSD Support**: The contract interacts with the standard ERC20 cUSD token interface on Celo (IERC20).

### 2. Database Schema (Supabase / PostgreSQL)
Full schema as specified in the project overview:

```sql
-- Tabel Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_address TEXT NOT NULL,
    title TEXT NOT NULL,
    game_mode TEXT NOT NULL,            -- '1v1', 'team', 'ffa'
    team_size INT DEFAULT 1,
    ticket_price NUMERIC NOT NULL,      -- dalam cUSD
    consensus_threshold NUMERIC DEFAULT 51, -- persentase minimum (default 51%)
    photo_required BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'setup',        -- 'setup', 'active', 'voting', 'ended', 'disputed'
    winners_submitted_at TIMESTAMP,     -- timestamp saat juri submit pemenang (untuk hitung 24 jam)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Participants
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    wallet_address TEXT NOT NULL,
    team_id INT DEFAULT NULL,
    status TEXT DEFAULT 'registered',   -- 'registered', 'eliminated', 'winner'
    uploaded_photo_url TEXT
);

-- Tabel Votes (Untuk Tahap Konsensus Akhir)
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    voter_address TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL,          -- true = setuju juri, false = juri curang
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Brackets (Untuk mode 1v1 dan Team)
CREATE TABLE brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    round INT NOT NULL,
    match_index INT NOT NULL,
    player_a TEXT,                      -- wallet_address atau team_id
    player_b TEXT,
    winner TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Reputation Tracking (Anti-Troll)
CREATE TABLE reputation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    event_id UUID REFERENCES events(id),
    was_minority BOOLEAN NOT NULL,
    reputation_score NUMERIC DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Key additions vs original overview:**
- `consensus_threshold` column on events (default 51%, as specified in overview).
- `winners_submitted_at` column for tracking the 24-hour voting window start.
- `brackets` table for storing 1v1 and Team elimination bracket data (match pairings, round progression, winners).
- `reputation_tracking` table for the Minority Penalty system.

### 3. Backend-Smart Contract Synchronization
- **Backend Admin execution**: When consensus is reached or failed, the backend initializes a write transaction to `BitPatchVault` using `ethers.js` or `viem` configured with the secure backend private key.
- **Event lifecycle**: Backend manages state transitions (`setup` → `active` → `voting` → `ended` / `disputed`) and coordinates all on-chain calls.

### 4. Game Mode Specific Logic

**Solo PvP (1v1):**
- Participant count must be 2^n (4, 8, 16, 32). Backend validates this before the creator starts the event.
- System auto-randomizes bracket pairings.
- Creator clicks winner of each match box to advance them through single elimination or best-of-3 rounds.

**Team PvP (X vs X):**
- Creator configures team_size (2v2, 3v3, 4v4, etc.).
- Two registration modes: Solo (team randomized by system) or Registered Team (pre-formed group registers together).
- Backend assigns team_ids and generates team vs team brackets.

**Free-For-All (FFA):**
- No bracket — all participants play simultaneously.
- Flexible participant count (no 2^n constraint).
- Creator manually ranks final positions (1st, 2nd, 3rd) via the API after the game.

### 5. Consensus Logic & Edge-Case Handling
- **Consensus Threshold**: Configurable per-event (default 51%). When juri/creator enters the winner, participants have 24 hours to vote `Setuju` (Agree) or `Tolak` (Decline).
- **Auto-Abstain Cron**: A `node-cron` task runs hourly. If an event is in the `voting` status and 24 hours have elapsed since `winners_submitted_at`, all non-voting registered participants are treated as abstain. The consensus percentage is computed purely on the cast votes: `Setuju / (Setuju + Tolak)`.
- **Tie/Disputed Stage (Skenario Kedua)**: A 50/50 vote results in `disputed` status. The contract funds remain locked. The creator is prompted via an "Ajukan Banding Kedua" button to submit a revised winner list, which resets the event to `voting` for another consensus round.
- **Full Rejection Refund (Skenario Keempat)**: If all or the overwhelming majority vote "Tolak" and the threshold is not met, the backend calls `emergencyRefund` on the smart contract. cUSD is returned to all participants without deductions.
- **Troll Mitigation / Minority Penalty (Skenario Ketiga)**: If >= 85% vote in one direction, the <= 15% minority wallets are logged in the `reputation_tracking` table. Their score is decremented. Persistent trolls across multiple tournaments can be restricted from private events.

### 6. Photo Audit System
- When `photo_required = true`, winners must upload a photo proof of score agreement before the creator can finalize the winner list.
- Photos are stored via file upload endpoint and the URL is saved in the participant's `uploaded_photo_url` column.
- Backend validates all proposed winners have photos before allowing the event to transition to `voting`.

### 7. 8-Bit Retro Aesthetic without Arrows
- **UI Styling**: Vanilla CSS styling featuring sharp grid alignments, prominent borders, high contrast shadows, and custom monospace pixel fonts.
- **Logo**: Text-free pixel monogram or geometric silhouette. No text in the logo.
- **Strict Arrow-Free Rule**: No SVG icons of chevrons, arrows, or arrowheads anywhere in the UI. Scrollable layouts use prominent square slider bars or double-border button blocks. All navigation relies on clean text boxes with border-radius of 0px.
- **Bracket Connectors**: Bracket lines connecting matches use straight geometric lines only, no arrowheads.

## Risks / Trade-offs

- **[Risk] Admin Wallet Key Compromise** — *Mitigation*: The backend wallet private key must be stored in secure secrets (e.g. Supabase Vault / environment variables on a secured server) and must only have permissions on `BitPatchVault.sol`.
- **[Risk] High gas fees for refund loops** — *Mitigation*: In `emergencyRefund`, to avoid out-of-gas errors with huge participant lists, we can store refunds as individual pull claims in the contract or perform batched payout operations from the backend API.
- **[Risk] Participant Apathy (No one votes)** — *Mitigation*: The 24-hour auto-abstain cron job guarantees that tournaments resolve successfully even if players forget to vote, computing the consensus only from active participants.
- **[Risk] Tie deadlock on second appeal** — *Mitigation*: If the second appeal vote also results in a 50/50 tie, the system should default to `emergencyRefund` to prevent infinite dispute loops.
- **[Risk] Invalid 2^n participant count** — *Mitigation*: For 1v1 mode, the backend validates participant count before allowing the creator to start the event. If the count is not 2^n, the event cannot be started until participants are added or removed.
