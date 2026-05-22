## ADDED Requirements

### Requirement: Event Creation and Configuration Storage
The backend API SHALL expose a POST /api/events endpoint to create tournaments in Supabase, validating and storing all creator configuration parameters: title, game mode (`1v1`, `team`, `ffa`), team size (default 1), ticket price in cUSD, photo audit required flag (true/false), and consensus threshold percentage (default 51%). The event MUST be created with `setup` status.

#### Scenario: Successful tournament creation with full configuration
- **WHEN** a creator sends a POST request to /api/events with valid parameters including game_mode, team_size, ticket_price, photo_required, and consensus_threshold
- **THEN** the backend SHALL insert the event into Supabase with `setup` status and return the generated event UUID.

#### Scenario: 1v1 mode requires 2^n participant count validation
- **WHEN** a creator creates a 1v1 event and participant registration closes
- **THEN** the backend SHALL validate the registered participant count is a power of 2 (e.g. 4, 8, 16, 32) before allowing the event to be started.

### Requirement: Event Lifecycle State Management
The backend API SHALL manage the full event lifecycle with explicit state transitions: `setup` → `active` → `voting` → `ended` or `disputed`. The creator SHALL be able to start an event (transition from `setup` to `active`) and end an event (transition from `active` to `voting` after submitting winners).

#### Scenario: Creator starts an event
- **WHEN** a creator sends a POST request to /api/events/:id/start for an event in `setup` status
- **THEN** the backend SHALL transition the event status to `active` and, for 1v1 and Team modes, generate randomized brackets.

#### Scenario: Creator ends event and submits winners
- **WHEN** a creator sends a POST request to /api/events/:id/end with the list of winners (for FFA: ranked list of 1st, 2nd, 3rd place)
- **THEN** the backend SHALL transition the event status to `voting`, store the proposed winners, and open the 24-hour consensus voting window.

### Requirement: Bracket Randomization for 1v1 Mode
The backend SHALL automatically generate randomized single-elimination or best-of-3 brackets for 1v1 events when the creator starts the event. The bracket MUST pair participants randomly into 1v1 matchups.

#### Scenario: Bracket generation for 8-player 1v1 tournament
- **WHEN** a creator starts a 1v1 event with 8 registered participants
- **THEN** the backend SHALL generate 4 randomized first-round matchups and store the full bracket structure in Supabase.

#### Scenario: Creator advances a match winner in the bracket
- **WHEN** a creator sends a POST request to /api/events/:id/bracket/advance with the winner's wallet address for a specific match
- **THEN** the backend SHALL mark the loser as `eliminated`, advance the winner to the next round slot, and update the bracket data.

### Requirement: Team Formation for Team PvP Mode
The backend SHALL support two team formation methods when a creator starts a Team event: (1) random team assignment from solo-registered participants, or (2) pre-formed registered teams. The team size is determined by the creator's `team_size` configuration.

#### Scenario: Random team formation from solo registrations
- **WHEN** a creator starts a Team event and participants registered individually (solo)
- **THEN** the backend SHALL randomly assign participants into teams of the configured team_size, assign team_ids, and generate Team vs Team elimination brackets.

#### Scenario: Pre-formed team registration
- **WHEN** participants register as a complete team (all members listed)
- **THEN** the backend SHALL validate the team has the correct number of members matching team_size, assign them a shared team_id, and slot them into the bracket.

### Requirement: FFA Leaderboard Scoring
The backend SHALL support Free-For-All (FFA) events where there are no brackets. After the game concludes, the creator manually inputs the final rankings (1st, 2nd, 3rd place) via the API.

#### Scenario: Creator submits FFA final rankings
- **WHEN** a creator sends a POST request to /api/events/:id/end with a ranked list of top 3 winners for an FFA event
- **THEN** the backend SHALL store the rankings, update the winner statuses to `winner`, and transition the event to `voting` status.

### Requirement: Participant Registration with On-Chain Verification
The backend API SHALL expose a POST /api/events/:id/register endpoint to register participants once they complete a cUSD ticket deposit on-chain, assigning them to the event.

#### Scenario: Registering participant after verified ticket purchase
- **WHEN** a participant completes their on-chain cUSD payment and sends a POST request to register with their wallet address and transaction hash
- **THEN** the backend SHALL verify the on-chain transaction, insert the participant into Supabase with `registered` status, and link them to the event.

### Requirement: Photo Audit Enforcement
When an event has `photo_required` set to true, the backend SHALL require all declared winners to upload a photo proof of score agreement before the creator is allowed to finalize and submit the winner list.

#### Scenario: Winner photo upload required
- **WHEN** an event has photo_required = true and the creator attempts to submit winner results
- **THEN** the backend SHALL verify that all proposed winners have an `uploaded_photo_url` in the participants table before allowing the event to transition to `voting`.

#### Scenario: Photo upload by participant
- **WHEN** a participant uploads a score photo via POST /api/events/:id/photo with their wallet_address and image file
- **THEN** the backend SHALL store the photo URL in the participant's `uploaded_photo_url` field.

### Requirement: Voting Consensus Calculation
The backend API SHALL calculate consensus votes on events in `voting` status, checking if the positive ("Setuju") votes meet or exceed the event's configured `consensus_threshold` percentage, computed only from actually cast votes (excluding abstains).

#### Scenario: Successful voting consensus reached
- **WHEN** the voting period ends and the percentage of "Setuju" votes among cast votes meets or exceeds the consensus_threshold (default 51%)
- **THEN** the backend SHALL update the event status to `ended`, invoke the smart contract distributePrize function via the admin wallet, and update winning participant statuses.

### Requirement: Dispute Handling and Second Appeal
The backend API SHALL handle the tie scenario (exactly 50% Setuju and 50% Tolak) by transitioning the event to `disputed` status. Funds MUST remain locked in the smart contract. The creator SHALL be allowed to submit a revised winner list for a second consensus vote.

#### Scenario: Voting ends in exact 50/50 tie
- **WHEN** the voting period ends with exactly 50% Setuju and 50% Tolak among cast votes
- **THEN** the backend SHALL update the event status to `disputed`, keep funds locked on-chain, and enable the "Ajukan Banding Kedua" (Second Appeal) endpoint for the creator.

#### Scenario: Creator submits revised winners after dispute
- **WHEN** a creator sends a POST request to /api/events/:id/appeal with a revised winner list for a disputed event
- **THEN** the backend SHALL clear previous votes, store the new proposed winners, reset the event status to `voting`, and open a new 24-hour consensus window.

### Requirement: Full Rejection Refund
The backend SHALL handle the scenario where the overwhelming majority or all participants vote "Tolak" and the threshold is not met, by triggering the smart contract emergencyRefund function.

#### Scenario: Consensus fails with majority rejection
- **WHEN** the voting period ends and "Setuju" votes fall below the consensus_threshold
- **THEN** the backend SHALL invoke emergencyRefund on the smart contract to return all cUSD ticket fees to participant wallets without deductions, and update the event status to `ended`.

### Requirement: Auto-Abstain and Voting Timeout
The backend SHALL run a periodic cron job (node-cron) to auto-close voting phases exactly 24 hours after winners are submitted. Non-voting participants are treated as abstain.

#### Scenario: Voting time limit reached with partial participation
- **WHEN** the 24-hour voting window expires for an event and some participants have not voted
- **THEN** the backend SHALL treat non-voters as abstain, calculate consensus based only on actually cast votes (Setuju / (Setuju + Tolak)), and trigger the appropriate payout or refund action.

### Requirement: Reputation and Trolling Mitigation (Minority Penalty)
The backend SHALL track persistent minority voters in a Supabase tracking table and decrement their reputation score if they show a consistent pattern of voting against the overwhelming majority across multiple separate tournaments.

#### Scenario: Minority voter tracking on high consensus event
- **WHEN** a vote closes with >= 85% agreement and the remaining <= 15% voted in the minority
- **THEN** the backend SHALL log the minority wallet addresses to the tracking table, decrease their reputation score, and flag them for potential access restrictions to private events.

#### Scenario: Repeat troll detection across tournaments
- **WHEN** a user's tracking history shows they consistently vote in the minority across multiple separate tournaments
- **THEN** the backend SHALL further reduce their reputation score and optionally restrict their access to future private events.
