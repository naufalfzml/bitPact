## Context

The bitPatch platform is a Web3 social-fi tournament maker integrating multiple sophisticated layers: a Solidity smart contract escrow vault on Celo, a Supabase PostgreSQL database, an Express.js backend carrying out consensus operations and executing on-chain admin calls, and a mobile-first Next.js web application utilizing Wagmi and RainbowKit for MiniPay wallet connections. 

Due to the complex, multi-layered nature of this platform, a clean and cohesive developer documentation suite is required. Standardized markdown documentation will outline the architecture, APIs, smart contract interfaces, database schemas, tournament game modes, consensus mechanics, and setup guides to ensure the codebase remains maintainable, secure, and straightforward to develop and deploy.

## Goals / Non-Goals

**Goals:**
- **Centralized Reference**: Establish a unified, easily browsable `docs/` directory in the workspace root.
- **Technical Coverage**: Produce thorough, accurate technical specifications for the Smart Contract (`BitPatchVault.sol`), Backend API (Express.js), Database (Supabase SQL schemas), and Frontend (Next.js layout rules and MiniPay integrations).
- **Domain-Specific Guides**: Clarify the algorithmic implementation of game modes (Solo PvP, Team PvP, FFA) and consensus mechanics (Auto-Abstain, Dispute Appeal, Minority Penalty).
- **Actionable Setup Guides**: Create clear instructions for local environment setup (Foundry, Supabase Local, Node) and testnet/production deployments.
- **Visual Clarity**: Leverage structured tables, code snippets, and lists to make the docs easily scannable and clear.

**Non-Goals:**
- **No Hosting Infrastructure**: We will not build or deploy interactive document servers (such as Docusaurus, GitBook, or VuePress). Plain GitHub-Flavored Markdown files directly in the repository are sufficient.
- **No Runtime Code**: This change is purely static documentation; no functional code changes will be made to the contracts, backend, or frontend.

## Decisions

### 1. Unified Documentation Directory Structure
- **Decision**: All documentation assets will reside in a dedicated `/docs` directory at the project root, with a main landing page at `/docs/README.md` linking to sub-documents.
- **Rationale**: Keeps the codebase tidy, conforms to standard open-source layout practices, and avoids polluting source directories (`contracts/`, `backend/`, `frontend/`) with documentation.

### 2. Standalone Spec for Consensus & Anti-Troll Engine
- **Decision**: Dedicate a standalone file (`docs/CONSENSUS.md`) exclusively to explaining the consensus voting flow, tie-breaker disputed states, second appeals, emergency refunds, and the Minority Penalty calculation.
- **Rationale**: Consensus and anti-troll handling represent the highest risk areas of the application due to potential funds locking or troll manipulation. Keeping this separate makes it easy for developers and security reviewers to analyze and verify.

### 3. Comprehensive Smart Contract API Spec
- **Decision**: Create `docs/SMART-CONTRACT.md` detailing the contract states, structures, events, and functions (`register`, `distributePrize`, `emergencyRefund`) with precise parameter lists and Solidity signatures.
- **Rationale**: Since the smart contract acts as the ultimate blind escrow, the API reference must be flawless so that the backend can interact with it securely via viem/ethers.js.

### 4. Direct SQL Schema Documentation
- **Decision**: Document all tables (`events`, `participants`, `votes`, `brackets`, `reputation_tracking`) in `/docs/DATABASE.md` with complete SQL code blocks and explanations of relations, indexes, and states.
- **Rationale**: Ensures any developer can immediately instantiate the Supabase environment with exact tables and constraints without guessing field names or types.

## Risks / Trade-offs

- **Risk: Documentation Drift**
  - *Details*: As the codebase evolves during implementation, the documentation could fall out of sync with actual code behaviors.
  - *Mitigation*: Structure the documents systematically matching the exact implementation modules of the main `setup-bitpatch` OpenSpec change. Standardize on updating specs and docs whenever a major feature boundary shifts.

- **Risk: Version Discrepancies**
  - *Details*: Local setup steps could break if external dependency versions (e.g. Foundry, Node, Wagmi) change.
  - *Mitigation*: Lock recommended versions in `docs/SETUP.md` (e.g. Node 18+ LTS, Foundry latest stable, wagmi/rainbowkit specific versions compatible with MiniPay).
