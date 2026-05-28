# BitPactVault — Smart Contract

Blind escrow vault for **bitPact** tournament prize pools on Celo. Holds USDC
deposits, distributes shares to winners, or refunds all participants. Only the
backend admin wallet may call mutating functions (`createEvent`,
`distributePrize`, `emergencyRefund`).

Source: [src/BitPactVault.sol](src/BitPactVault.sol)
Public reference: [docs/SMART-CONTRACT.md](../docs/SMART-CONTRACT.md) *(generated
in change `docs-completion`)*

## Usage

### Build

```shell
forge build
```

### Test

```shell
forge test -vv
```

Test suites:
- `test/BitPactVault.t.sol` — 21 unit tests covering individual function guards.
- `test/BitPactVaultFlow.t.sol` — 6 end-to-end + characterization tests
  (lifecycle, phantom-participant DB bug, blacklist whole-batch revert).
- `test/BitPactVaultFee.t.sol` — 7 protocol-fee tests (`feeBps = 200`): register
  pulls ticket+fee, pool excludes fee, distribute pays admin, refund returns fee,
  constructor fee cap.

Total: **34 tests** (as of protocol-fee change).

### Deploy

The deploy script reads two env vars and writes the vault address to stdout.
USDC native token addresses (per `openspec/specs/usdc-integration`):

| Network | USDC native |
|---|---|
| Celo Mainnet | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| Celo Sepolia | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |

```shell
export ADMIN_WALLET_ADDRESS=0x...        # backend admin / onlyAdmin caller + fee treasury
export USDC_TOKEN_ADDRESS=0x...           # USDC token address per network
export PROTOCOL_FEE_BPS=200               # protocol fee in bps (200 = 2%); optional, defaults to 200
export CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org   # or forno.celo.org
export DEPLOYER_PRIVATE_KEY=0x...

forge script script/Deploy.s.sol:DeployBitPactVault \
  --rpc-url $CELO_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv
```

## Protocol Fee

The vault charges a **protocol fee** as an **entry surcharge** — it sits on top
of the ticket price and does **not** reduce the prize pool, so winners still
receive 100% of the deposited tickets.

- **`feeBps`** is set immutably in the constructor (`200` = 2%) and capped at
  `MAX_FEE_BPS = 1000` (10%); the constructor reverts with `"fee too high"`
  above the cap. Changing the fee requires a redeploy.
- **`register`** pulls `ticketPrice + fee` where `fee = ticketPrice * feeBps / 10000`
  (integer floor). `prizePool` accumulates ticket deposits only; the fee is
  escrowed separately in `feePool`. The frontend mirrors this integer math and
  approves `ticket + fee` (`PROTOCOL_FEE_BPS` in `frontend/src/constants/index.ts`
  must match the deployed `feeBps`).
- **`distributePrize`** still requires `sum(shares) == prizePool` and pays the
  full pool to winners, then forwards the escrowed `feePool` to `admin` (the
  treasury) and emits `FeeCollected(eventId, amount)`.
- **`emergencyRefund`** returns `ticketPrice + fee` to every participant (the
  fee is refunded since no payout occurred) and zeroes both `prizePool` and
  `feePool`.

> Rounding note: for very small ticket prices the floored fee can be `0`
> (e.g. a 0.01 USDC ticket at 2% → fee 0). This is acceptable; tiny pools yield
> negligible revenue.

The treasury is the `admin` wallet (no separate treasury address by design), so
fee revenue is co-mingled with the gas float and tracked off-chain.

## Known Risks

### USDC Blacklist (Whole-Batch Revert)

`distributePrize` and `emergencyRefund` perform `usdc.transfer()` in a loop
and revert the entire transaction on any single failure
([BitPactVault.sol:149-152](src/BitPactVault.sol#L149-L152) &
[L175-L179](src/BitPactVault.sol#L175-L179)).

Native USDC on Celo is operated by Circle and **can blacklist addresses**
(typically due to OFAC compliance). If a winner or participant becomes
blacklisted between deposit and settlement, the relevant call
(`distributePrize` or `emergencyRefund`) will revert at `cUSD.transfer()` →
funds remain locked in the vault.

The two characterization tests below document this behavior:
- `test_flow_blacklistedRecipient_revertsBatchDistribute`
- `test_flow_blacklistedRecipient_revertsBatchRefund`
*(both in `test/BitPactVaultFlow.t.sol`, using `MockBlacklistedUSDC`)*

#### Mitigations available today

- **`settlement_failed` + retry**: backend `settleEvent` catches the revert,
  records `settlement_error`, exposes `POST /api/events/:id/retry-settlement`
  for the creator to retry once the blacklist state changes. See
  archived spec `openspec/changes/archive/escrow-payout-integrity/` and the
  new UI in `openspec/changes/settlement-failed-recovery-ui/`.
- **`appeal` flow**: when the consensus vote ties 50/50 (status `disputed`),
  the creator can submit a revised winners list excluding the blacklisted
  address, then put it back to voting via `POST /api/events/:id/appeal`.

#### Planned (post-hackathon)

Refactor the payout model from "push transfer in a loop" to **pull-payment**:
`distributePrize` would only record `claimable[winner] += share`, then each
winner calls `claim()` independently. A single bad address fails its own
`claim()` and cannot DoS the rest of the pool.

This requires a new contract deployment (V2) and is intentionally deferred
to keep the hackathon scope tight.

### Re-entrancy

`distributePrize` and `emergencyRefund` follow the **checks-effects-interactions**
ordering: state changes (`e.distributed = true`, `e.prizePool = 0`) happen
before any external `usdc.transfer()` call. The contract does NOT include
OpenZeppelin's `ReentrancyGuard` because the state-first ordering already
prevents recursive entry on the standard ERC-20 token (USDC is a non-malicious
implementation).

This is acceptable for USDC on Celo, but **must be reconsidered** if the token
choice ever changes to one with hook-based transfer semantics
(mis. ERC-777 / ERC-4626).

### Trust model

`admin` is set immutably in the constructor and cannot be rotated without a
new deployment. If the backend admin key is ever compromised, the operator
must redeploy the vault and migrate users by:
1. Calling `emergencyRefund` from the compromised admin (if still possible)
   to return all live deposits.
2. Redeploying with a fresh admin.
3. Updating `VAULT_CONTRACT_ADDRESS` env in backend & frontend.

There is no on-chain admin rotation mechanism by design — keeps the contract
small and audit surface minimal.

## Foundry quick reference

```shell
forge build         # compile
forge test -vv      # run tests
forge fmt           # format
forge snapshot      # gas snapshots
anvil               # local node
```

Docs: https://book.getfoundry.sh/
