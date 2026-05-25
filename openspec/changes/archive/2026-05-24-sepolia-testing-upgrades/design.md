## Context

bitPact is an 8-bit retro pixel art-styled, Web3-powered esports tournament and campaign organizer. The smart contract `BitPactVault.sol` is deployed on the Celo Sepolia Testnet (`0xC2375c25f402e83ce2b6F148146D6A8b47c0e62F`). 

Following extensive local testing on Celo Sepolia, multiple critical security risks, logical loopholes in tournament flow, consensus blockages, and UX shortcomings have been identified:
1. **Security Vulnerability**: Participants can bypass on-chain ticket payment. Frontend registers the participant in the database immediately after a transaction hash is generated without waiting for confirmation. If the transaction fails, they remain registered off-chain.
2. **Consensus Deadlock**: The voting resolution logic requires 100% of participants to vote. A single inactive player causes a permanent deadlock.
3. **Rigid Tournament Bracket Structure**: Strict $2^n$ participant limits force creators to wait for exact counts, and the system fails to accommodate odd numbers or custom dynamic teams.
4. **UX & Aesthetic Shortcomings**: Users are confused by inconsistent currency labels (cUSD vs USDC), lack representation of custom teams, miss clear visual cues for Whitelisted invitations, and lack visibility of reputation and wallet balances.

This technical design outlines the exact architectural, database, and smart contract integration paths to upgrade bitPact on Celo Sepolia.

## Goals / Non-Goals

### Goals
- **Strict On-Chain Transaction Receipt Verification**: Guarantee that no user is registered off-chain without a successfully mined blockchain transaction.
- **Deadlock-Free Consensual Distribution**: Implement a threshold/quorum-based manual distribution trigger (minimum 51% vote representation) for tournament creators.
- **Dynamic Brackets & Uneven Formations**: Implement mathematical tournament brackets that handle odd numbers (using the **"BYE"** status) and custom asymmetrical team layouts (e.g. 3v2).
- **Gamified RPG Status Panel**: Enhance retro-immersion with an integrated header status bar tracking `HP` (Reputation), `BAG` (cUSD), and `GAS` (CELO).
- **Robust Creator Controls**: Allow organizers to lock rosters, manually drag-and-drop/shuffle brackets, expel misbehaving players, and clear brackets.

### Non-Goals
- Migrating to other testnets (Alfajores) or Mainnet. This upgrade remains strictly on Celo Sepolia.
- Modifying the core `BitPactVault.sol` smart contract (distribution relies on the existing contract's escrow, and our backend/frontend upgrades will safely drive the parameters without requiring contract redeployments).
- Implementing complete automatic email notifications for invite-only events.

## Decisions

### Decision 1: Safe Double-Sided On-Chain Registration Validation
*   **Context**: Prevents transaction bypass when registration transaction fails.
*   **Chosen Approach**: Two-phased transaction validation.
    1. **Frontend**: When the user triggers transaction signing via wagmi/viem, the UI halts and displays a loading screen (e.g., `■ CONFIRMING TRANSACTION... ■`). It calls `waitForTransactionReceipt` to ensure the block is mined.
    2. **Backend**: Once the hash is sent to the backend `/register` route, the backend makes an independent RPC request to the Celo Sepolia provider using `viem`'s `getTransactionReceipt(hash)`. It verifies that:
        - `status === 'success'`
        - `to` matches `VAULT_CONTRACT_ADDRESS`
        - `logs` contain the proper registration event signatures.
    3. The participant's record is only committed to Supabase post-verification.
*   **Alternatives Considered**:
    - *Only frontend validation*: Rejected because clients can simulate API payloads directly, bypassing on-chain payments entirely.
    - *Webhooks / Indexer (e.g., Subgraph/GhostLogs)*: Overkill for the current testnet workload, introducing external failure points. An active backend verification model is simpler and more secure.

### Decision 2: Quorum-Based Force-Resolve (Distribute Prize)
*   **Context**: Prevent deadlocks if voters abstain.
*   **Chosen Approach**: Add a backend consensus validator `/api/events/:id/distribute`.
    - Retrieve the event's participants and their votes from database.
    - If the minimum quorum of registered voters (51% or more of all registered active participants) has voted, unlock a prominent **■ DISTRIBUTE PRIZE ■** action button in the tournament creator's control panel.
    - When clicked, the creator triggers the distribution transaction, paying the prize pool through the smart contract based on the majority vote results.
*   **Alternatives Considered**:
    - *Automatic cron payout*: High risk of race conditions and lack of administrative control over edge cases in dispute.

### Decision 3: Custom Teams & Odd-Number PvP Brackets with "BYE"
*   **Context**: Bracket structures are currently locked to $2^n$ players.
*   **Chosen Approach**:
    - Remove the $2^n$ validation upon creation.
    - Upon Close Event (**Lock Roster**), calculate bracket size. If $N$ is odd, pad the matchups with a virtual player named **"BYE"**.
    - Implement a dynamic round-generation utility that pairs players. A player paired with **"BYE"** automatically progresses to the next round with a win.
    - For team modes, support custom asymmetrical splitting: one team may contain up to $\lceil N/2 \rceil$ players, and the other $\lfloor N/2 \rfloor$ players.
*   **Alternatives Considered**:
    - *Forced dummy wallets*: Increases transaction costs and poor user experience.

### Decision 4: RPG-Style User Header & Roster Aesthetics
*   **Context**: Standard wallet buttons and address rosters lack gaming flavor.
*   **Chosen Approach**:
    - Implement an 8-Bit RGB/NES status panel under the header using custom retro font classes (e.g., `font-press-start-2p`).
    - Query Celo Sepolia balances via standard provider calls:
        - `BAG`: cUSD Token balance (0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b)
        - `GAS`: Native CELO balance
    - Generate unique **8-bit Gamer Tags** for plain addresses: `PLAYER_` + last 4 hex characters (e.g., `HERO_5C19`), unless a custom `username` is registered.
    - Ensure all custom borders use crisp 8-bit double lines (`border-double border-4`) and **never use any arrows or chevrons**.

## Risks / Trade-offs

- **[Risk] Supabase DB sync delay** → **[Mitigation]** The frontend will display a persistent Retro Loader (e.g. `■ SYNCING WITH BLOCKCHAIN... ■`) and periodically poll the database record until the registration is officially saved in the database before redirecting.
- **[Risk] High gas prices on Celo Sepolia** → **[Mitigation]** Query `get_gas_fee_data` via Celo MCP to display accurate gas predictions to the user.
- **[Risk] Next.js Hydration errors** → **[Mitigation]** Ensure all wallet and balance queries are deferred behind client-side state flags (`mounted`) within the `ConnectButtonClient` component.
