## Why

Social and gaming events in real life lack a simple, secure, and transparent way to run tournaments with crypto prize pools. bitPatch solves this by providing a Web3 Generalized Tournament & Campaign Maker via Opera MiniPay, allowing creators to run safe, transparent social tournaments backed by smart contract escrow and participant consensus. It transforms real-life fun/social matches (e.g. console gaming, chess, basketball, board games) into structured, prize-backed tournaments where outcomes are validated by community consensus.

## What Changes

This change initializes the complete bitPatch platform, establishing its core services and smart contracts:
- **On-chain Escrow Vault**: A smart contract (`BitPatchVault.sol`) deployed to Celo that creates events on-chain, locks cUSD ticket deposits, distributes prize pool shares to winners, and processes emergency refunds. Acts as a blind third-party escrow.
- **Database Schema (Supabase)**: Five PostgreSQL tables: `events` (tournament config with game mode, consensus threshold, photo audit flag), `participants` (registration, team assignment, elimination status, photo URL), `votes` (consensus voting records), `brackets` (1v1 and Team bracket matchups per round), and `reputation_tracking` (Minority Penalty troll tracking).
- **Backend API Server**: An Express.js API interacting with Supabase to manage the full event lifecycle (setup → active → voting → ended/disputed), bracket generation for 1v1/Team modes, team formation (solo random vs pre-formed), FFA leaderboard scoring, photo audit enforcement, consensus calculation, dispute handling with second appeal mechanism, and on-chain admin wallet calls.
- **Web3 Frontend App**: A Next.js Web3 application featuring a premium 8-bit retro/pixel art visual theme (text-free pixel monogram logo, no arrows/chevrons/icons anywhere), with integrated Opera MiniPay wallet auto-connect, event creation form (game mode, team size, ticket price, photo audit, consensus threshold), event listing, bracket visualization, FFA leaderboard, photo upload, consensus voting interface, and dispute appeal UI.
- **Consensus & Anti-Troll Engine**: 24-hour voting timeout with auto-abstain cron job, configurable consensus threshold (default 51%), 50/50 tie handling with disputed status and second appeal, full rejection emergency refund, and Minority Penalty system tracking persistent trolls across tournaments with reputation score degradation.

## Capabilities

### New Capabilities

- `vault-contract`: On-chain escrow vault (BitPatchVault.sol) handling event creation, cUSD ticket deposits via ERC20 transferFrom, backend-admin-authorized prize distribution with share-based payouts, and emergency refunds to all participants. Uses bytes32 eventId mapping to EventInfo struct.
- `core-backend`: Express.js backend service managing event lifecycle states, bracket generation (1v1 single elimination, Team random/pre-formed), FFA leaderboard ranking, photo audit enforcement, consensus voting calculation with configurable threshold, 24-hour auto-abstain cron job, dispute handling with second appeal mechanism, admin wallet on-chain calls, and reputation tracking with Minority Penalty.
- `minipay-frontend`: Responsive 8-bit retro/pixel art Next.js frontend with text-free pixel monogram logo and zero arrow/icon usage. Integrated with Opera MiniPay auto-connect, event creation form, event listing, bracket visualization (1v1 and Team), FFA leaderboard, photo upload, consensus voting UI (Setuju/Tolak), and dispute appeal interface.

### Modified Capabilities

*No existing capabilities exist; this is a greenfield initialization.*

## Impact

- **New Smart Contracts**: Deploys `BitPatchVault.sol` to Celo network (Foundry-based, tested on Anvil/Alfajores).
- **New Database Tables**: Creates 5 tables in Supabase PostgreSQL: `events`, `participants`, `votes`, `brackets`, `reputation_tracking`.
- **New Services**: Creates a Node Express.js API backend (with node-cron scheduler) and a Next.js frontend application (with wagmi/rainbowkit MiniPay integration).
- **New External Dependencies**: Supabase (database + storage), Celo network (cUSD ERC20), Opera MiniPay (injected wallet provider).
