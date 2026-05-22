## ADDED Requirements

### Requirement: Event Creation On-Chain
The BitPatchVault contract SHALL allow the backend admin wallet to create an event on-chain by specifying a unique `bytes32 eventId`, the ticket price in cUSD, and the creator's wallet address. The contract MUST store a mapping from `eventId` to the event's prize pool total, distribution status, and creator address.

#### Scenario: Admin creates a new event record on-chain
- **WHEN** the backend admin wallet calls createEvent with a unique bytes32 eventId, a cUSD ticket price, and the creator's wallet address
- **THEN** the contract SHALL store the event metadata (ticket price, creator address, initial pool of 0, distributed = false) and the event MUST be open for participant registration.

### Requirement: Escrow Registration and Deposit
The BitPatchVault contract SHALL accept cUSD ticket deposits from participants registering for a specific event via the `register(bytes32 eventId)` function. It MUST verify that the event exists, is open for registration, the participant has not already registered, and the exact ticket price amount in cUSD is transferred via ERC20 `transferFrom`.

#### Scenario: Successful ticket deposit
- **WHEN** a participant calls register(bytes32 eventId) and the MiniPay wallet approves the cUSD ERC20 transfer of the exact ticket price
- **THEN** the contract SHALL transfer cUSD from the participant to the vault, record the participant's address in the event's participants array, mark the participant as registered in the isRegistered mapping, and increment the event's total prize pool by the ticket amount.

#### Scenario: Rejected duplicate registration
- **WHEN** a participant who is already registered for an event attempts to call register again for the same eventId
- **THEN** the contract SHALL revert the transaction with an appropriate error message.

#### Scenario: Rejected incorrect ticket amount
- **WHEN** a participant attempts to register with a cUSD amount that does not match the event's configured ticket price
- **THEN** the contract SHALL revert the transaction.

### Requirement: Authorized Prize Distribution
The BitPatchVault contract SHALL allow only the backend admin wallet to distribute the accumulated prize pool to the winners via `distributePrize(bytes32 eventId, address[] memory winners, uint256[] memory shares)`. Non-admin callers MUST be rejected.

#### Scenario: Admin distributes prize pool to winners
- **WHEN** the backend admin wallet calls distributePrize with the event ID, an array of winner addresses, and an array of cUSD share amounts that sum to the total prize pool
- **THEN** the contract SHALL transfer the specified cUSD shares from the escrow pool directly to each winner's wallet address, mark the event as distributed, and prevent further distributions for that event.

#### Scenario: Non-admin caller rejected
- **WHEN** any wallet address other than the authorized backend admin wallet attempts to call distributePrize
- **THEN** the contract SHALL revert the transaction with an authorization error.

### Requirement: Emergency Refund Process
The BitPatchVault contract SHALL allow the backend admin wallet to refund the exact ticket price to all registered participants via `emergencyRefund(bytes32 eventId)` if the consensus voting declares the jury as fraudulent or the event enters a disputed state requiring full refund.

#### Scenario: Admin triggers emergency refund for disputed event
- **WHEN** the backend admin wallet calls emergencyRefund for an event that has not yet been distributed
- **THEN** the contract SHALL transfer the exact cUSD ticket price back to each registered participant's wallet without any deductions and clear the event prize pool.

#### Scenario: Emergency refund on already distributed event
- **WHEN** the backend admin wallet calls emergencyRefund for an event already marked as distributed
- **THEN** the contract SHALL revert the transaction since funds have already been disbursed.

### Requirement: State Variables and Data Mapping
The BitPatchVault contract MUST store a mapping from each unique `bytes32 eventId` to the total accumulated prize pool (uint256), the distribution status (bool), the creator wallet address, the ticket price, and a dynamic array of all registered participant addresses.

#### Scenario: Querying event data
- **WHEN** any external caller queries the contract for a given eventId
- **THEN** the contract SHALL return the total prize pool, distribution status, creator address, ticket price, and number of registered participants.
