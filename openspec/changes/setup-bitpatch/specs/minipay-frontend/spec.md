## ADDED Requirements

### Requirement: 8-Bit Retro Arrow-Free UI Layout
The frontend application SHALL implement a premium, minimalist 8-bit retro/pixel-art design. It MUST NOT use any arrows, arrow icons, chevrons, or standard directional shapes in navigation, buttons, page layouts, or decorations. All panels, cards, and inputs MUST be styled as crisp, geometric boxes with sharp edges (border-radius: 0px). The logo MUST be a text-free pixel monogram or geometric silhouette.

#### Scenario: User visits the platform homepage
- **WHEN** a user loads the homepage
- **THEN** the application SHALL display a text-free pixel monogram logo, clean structured grids, and custom geometric buttons entirely free of icon and arrow graphics.

#### Scenario: Navigation uses geometric text boxes instead of arrows
- **WHEN** a user navigates between pages or sections
- **THEN** all navigation elements SHALL use clean text-labeled geometric boxes with sharp borders and no arrow, chevron, or directional icon elements.

### Requirement: MiniPay Wallet Integration
The application SHALL integrate a lightweight, mobile-optimized Web3 provider (e.g. wagmi/rainbowkit) tailored for the Opera MiniPay mobile browser environment to process Celo network transactions and cUSD ticket registration.

#### Scenario: MiniPay wallet auto-connection on load
- **WHEN** a user opens the application inside the Opera MiniPay browser
- **THEN** the frontend SHALL automatically detect the injected Celo provider and connect the user's wallet address without requiring manual connection steps.

#### Scenario: cUSD ticket payment via MiniPay
- **WHEN** a user clicks to register for an event and approves the cUSD ERC20 transfer via MiniPay
- **THEN** the frontend SHALL submit the on-chain deposit transaction, wait for confirmation, and then register the participant via the backend API.

### Requirement: Event Creation Form for Creator
The frontend SHALL provide a dedicated event creation page where a creator can configure all tournament parameters: title, game mode selection (Solo PvP 1v1, Team PvP X vs X, Free-For-All FFA), team size input (for Team mode), ticket price in cUSD, photo audit toggle (true/false), and consensus threshold percentage (default 51%).

#### Scenario: Creator creates a new 1v1 tournament
- **WHEN** a creator fills in the event creation form with game_mode = 1v1, ticket_price, and other settings, then submits
- **THEN** the frontend SHALL send a POST request to /api/events with the configuration and display the generated event details page.

#### Scenario: Creator configures Team PvP with team size
- **WHEN** a creator selects game_mode = Team and inputs team_size (e.g. 3 for 3v3)
- **THEN** the frontend SHALL include team_size in the event creation request and display the appropriate team-based registration interface.

### Requirement: Event Discovery and Listing
The frontend SHALL display a list of available events showing title, game mode, ticket price, participant count, and event status. Users MUST be able to browse and select events to register for or view.

#### Scenario: User browses available events
- **WHEN** a user visits the events listing page
- **THEN** the frontend SHALL fetch and display all events from the backend API as a list of geometric cards showing event title, game mode badge, ticket price in cUSD, current participant count, and status indicator.

### Requirement: Bracket and Leaderboard Visualization
The frontend SHALL render responsive tournament brackets for 1v1 and Team game modes using a minimalist flexbox box-based layout without any arrow connectors. For Free-For-All (FFA) events, the frontend SHALL display a structured leaderboard with ranked positions (1st, 2nd, 3rd).

#### Scenario: Displaying 1v1 elimination bracket
- **WHEN** a user views an active 1v1 tournament
- **THEN** the frontend SHALL render a single-elimination bracket using geometric boxes connected by straight lines (no arrows), showing participant names in each match slot.

#### Scenario: Creator advances a 1v1 match winner via bracket click
- **WHEN** a tournament creator clicks on a participant's box within a match bracket
- **THEN** the frontend SHALL send an API request to advance that participant to the next round and visually update the bracket to show the winner moved forward.

#### Scenario: Displaying Team bracket
- **WHEN** a user views an active Team tournament
- **THEN** the frontend SHALL render a team-based elimination bracket showing team names/numbers with geometric box connectors.

#### Scenario: Displaying FFA leaderboard
- **WHEN** a user views a completed FFA event
- **THEN** the frontend SHALL display a ranked leaderboard table showing positions 1st, 2nd, and 3rd with participant wallet addresses and scores.

### Requirement: Photo Upload Interface
When an event has `photo_required` set to true, the frontend SHALL provide a photo upload interface for winners to upload proof-of-score images before the creator can finalize the results.

#### Scenario: Winner uploads score proof photo
- **WHEN** a participant marked as a potential winner opens an event with photo_required = true
- **THEN** the frontend SHALL display a photo upload component allowing the user to capture or select an image and submit it to the backend via POST /api/events/:id/photo.

### Requirement: Consensus Voting Interface
The application SHALL provide a clear voting interface for registered participants to approve ("Setuju") or decline ("Tolak") the jury/creator's final winner selections during the voting phase.

#### Scenario: Voting on final tournament results
- **WHEN** a registered participant views an event in the `voting` stage
- **THEN** the frontend SHALL display the jury's proposed winner list alongside two distinct geometric boxes labeled "Setuju" and "Tolak" to record their consensus vote.

#### Scenario: Displaying voting progress
- **WHEN** participants are voting on an active event in voting status
- **THEN** the frontend SHALL show the current vote count and percentage of Setuju vs Tolak without revealing individual voter identities.

### Requirement: Dispute and Second Appeal Interface
When an event enters `disputed` status (50/50 tie), the frontend SHALL display the dispute state and show an "Ajukan Banding Kedua" (Second Appeal) button for the creator to submit a revised winner list.

#### Scenario: Creator submits second appeal on disputed event
- **WHEN** a creator views a disputed event and clicks the "Ajukan Banding Kedua" button
- **THEN** the frontend SHALL display a form to revise the winner list and submit it to the backend, which resets the event to a new voting round.
