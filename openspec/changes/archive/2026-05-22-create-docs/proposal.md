## Why

The bitPatch platform combines multiple complex components, including smart contract escrow vaults on Celo, a Supabase-backed Express.js API backend with consensus logic, and an 8-bit retro Next.js frontend integrated with Opera MiniPay. Without structured and comprehensive documentation, onboarding developers, maintaining the codebase, understanding edge-case consensus flows (e.g., tie-breakers, minority penalties, dispute resolution), and deploying the services is highly difficult and prone to errors.

## What Changes

This change introduces a comprehensive, structured suite of Markdown-based project documentation under a new `docs/` directory to detail every technical, operational, and architectural aspect of bitPatch:
- **Project Landing (`docs/README.md`)**: A central entry point with project description, feature summary, system architecture overview, and directory guide.
- **System Architecture (`docs/ARCHITECTURE.md`)**: A high-level and detailed architectural blueprint, covering system boundaries, state machine transition flows, and sequencing diagrams for core operations.
- **Smart Contract Reference (`docs/SMART-CONTRACT.md`)**: Complete API and interface documentation for `BitPatchVault.sol` (states, events, entry points like `register`, `distributePrize`, and `emergencyRefund`).
- **Backend API Reference (`docs/API.md`)**: Exhaustive route specs, request/response payloads, authentication/auth rules, and status codes for the Express.js backend.
- **Database Schema Guide (`docs/DATABASE.md`)**: Documented SQL structures, table relationships, indexing strategies, and fields for all Supabase tables (`events`, `participants`, `votes`, `brackets`, `reputation_tracking`).
- **Game Modes & Bracket Logic (`docs/GAME-MODES.md`)**: Operational guidelines and algorithmic descriptions for Solo PvP (1v1), Team PvP (X vs X), and Free-For-All (FFA) leaderboard options.
- **Consensus & Anti-Troll Engine (`docs/CONSENSUS.md`)**: Specifications of the voting flow, 24h timeouts, 50/50 tie disputes, second appeals, emergency refunds, and the Minority Penalty reputation mechanics.
- **Developer Setup & Deployment (`docs/SETUP.md`)**: Complete step-by-step installation, environment configuration, local testing (Foundry/Anvil, Supabase local, Express/Next dev servers), and production deployment instructions.

## Capabilities

### New Capabilities

- `project-docs`: Documentation suite for the bitPatch project including architecture, contract, API, database, game modes, consensus, and setup.

### Modified Capabilities

*None. This is a new capability that does not modify existing functional specs.*

## Impact

- **New Documentation Assets**: Adds a structured set of Markdown files in a new `/docs` directory in the root of the workspace.
- **Development & Onboarding**: Dramatically speeds up developer onboarding, testing, and system verification by formalizing the technical spec in markdown.
- **Zero Runtime Code Impact**: Only adds static Markdown documentation files; does not modify smart contract logic, backend APIs, or frontend components.
