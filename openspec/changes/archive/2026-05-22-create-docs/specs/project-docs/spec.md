## ADDED Requirements

### Requirement: Central Landing Page
The documentation suite SHALL provide a central landing page at `docs/README.md` introducing the bitPatch project, its core value proposition, aesthetic guidelines, and a navigation index to all other files.

#### Scenario: Visual onboarding and navigation
- **WHEN** a developer or reviewer opens `docs/README.md`
- **THEN** they SHALL find the project overview, core loop explanation, 8-bit retro theme constraints (no arrows/icons), and a clear directory guide linking to all subsequent docs.

### Requirement: Architectural Blueprint Documentation
The documentation suite SHALL contain a detailed system architecture overview at `docs/ARCHITECTURE.md` detailing the visual and conceptual boundaries, system components, state transitions, and sequencing between components.

#### Scenario: System architecture inspection
- **WHEN** a developer reads `docs/ARCHITECTURE.md`
- **THEN** they SHALL find a structured visual and narrative layout of how the Wagmi/RainbowKit frontend, Express.js backend, Supabase DB, and Celo Alfajores Smart Contract interact.

### Requirement: Smart Contract API Reference
The documentation suite SHALL provide an exhaustive interface and API specification for `BitPatchVault.sol` in `docs/SMART-CONTRACT.md`, detailing data structures, events, public/external entry points, and modifier rules.

#### Scenario: Backend integration of smart contracts
- **WHEN** an integration developer references `docs/SMART-CONTRACT.md`
- **THEN** they SHALL find the exact Solidity structures, function signatures (such as `register`, `distributePrize`, `emergencyRefund`), error codes, and event definitions to build backend-to-chain calls.

### Requirement: Database Schema Definition
The documentation suite SHALL provide a comprehensive database guide in `docs/DATABASE.md` including exact Supabase PostgreSQL DDL schemas, constraints, foreign key relationships, and status state representations.

#### Scenario: Supabase local database initialization
- **WHEN** a database administrator or developer reads `docs/DATABASE.md`
- **THEN** they SHALL find complete SQL DDL blocks for creating `events`, `participants`, `votes`, `brackets`, and `reputation_tracking` tables, including correct data types and constraints.

### Requirement: API Route Specifications
The documentation suite SHALL provide an Express.js API reference in `docs/API.md` listing all routes, methods, request parameters/payload schemas, success responses, error payloads, and authentication/admin levels.

#### Scenario: Frontend-to-backend API route implementation
- **WHEN** a frontend developer needs to implement data fetching or event submission
- **THEN** they SHALL reference `docs/API.md` to obtain exact endpoint URLs (e.g., `/api/events`, `/api/events/:id/vote`), HTTP methods, request bodies, and JSON responses.

### Requirement: Game Modes and Bracket Logic Guides
The documentation suite SHALL detail all tournament configuration options and execution algorithms in `docs/GAME-MODES.md`, covering Solo PvP (1v1), Team PvP (X vs X), and Free-For-All (FFA).

#### Scenario: Bracket calculation implementation
- **WHEN** a backend developer implements bracket matching or leaderboard calculation
- **THEN** they SHALL follow the exact rules in `docs/GAME-MODES.md` regarding 2^n participant constraints for PvP, registered vs solo-shuffled team matching, and FFA leaderboard point aggregation.

### Requirement: Consensus and Anti-Troll Engine Specifications
The documentation suite SHALL document the complete voting flow, kuorum calculations, tie dispute handling, second appeal windows, emergency refund triggers, and Minority Penalty formulas in `docs/CONSENSUS.md`.

#### Scenario: Edge-case voting implementation
- **WHEN** a developer implements consensus state updates or cron jobs
- **THEN** they SHALL follow the exact specs in `docs/CONSENSUS.md` to trigger 24h timeouts, handle 50/50 vote ties, enable second appeals, and log minor penalty participants to Supabase.

### Requirement: Environment Setup and Deployment Guide
The documentation suite SHALL supply complete instructions in `docs/SETUP.md` to install, configure, verify, test, and deploy the entire bitPatch ecosystem.

#### Scenario: Developer environment provisioning
- **WHEN** a new developer joins the project and boots their local system
- **THEN** they SHALL successfully set up Anvil, Supabase local, the Express backend, and the Next.js frontend by sequentially executing the commands and environment steps detailed in `docs/SETUP.md`.
