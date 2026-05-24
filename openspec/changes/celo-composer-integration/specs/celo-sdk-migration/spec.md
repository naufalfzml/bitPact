## ADDED Requirements

### Requirement: Backend blockchain interaction SHALL use Viem
Express.js backend server API SHALL utilize Celo-native SDK Viem for on-chain contract read, write, and event auditing operations. It MUST explicitly remove dependencies on Ethers.js v6.

#### Scenario: Backend client initialization
- **WHEN** Express.js server starts up
- **THEN** it SHALL initialize a Viem client using `celo` chain configuration and the active RPC node from `CELO_RPC_URL`

#### Scenario: Dynamic contract interaction
- **WHEN** a tournament is ended and winners are validated
- **THEN** the backend SHALL invoke `distributePrize` on `BitPatchVault` contract using the configured admin wallet signer via Viem's `writeContract` client

### Requirement: Frontend connection SHALL auto-detect MiniPay environment
Next.js Web3 client console SHALL explicitly query the injected provider properties to determine if the execution is running inside the Opera MiniPay browser, and optimize the connect interface accordingly.

#### Scenario: Automatic injected wallet handshake
- **WHEN** page loads in Opera MiniPay browser
- **THEN** client SHALL detect `window.ethereum.isMiniPay` as `true` and bypass external wallet prompts, displaying only the connected balance or address
