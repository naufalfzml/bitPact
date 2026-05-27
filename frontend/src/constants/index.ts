export const VAULT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// USDC native token address. Prefer NEXT_PUBLIC_USDC_TOKEN_ADDRESS; fall back
// to the legacy NEXT_PUBLIC_CUSD_TOKEN_ADDRESS name for older .env files,
// then to the Celo Sepolia default for new dev setups.
const _legacyCusd = process.env.NEXT_PUBLIC_CUSD_TOKEN_ADDRESS;
if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS && _legacyCusd) {
  // eslint-disable-next-line no-console
  console.warn(
    "[bitPact] NEXT_PUBLIC_CUSD_TOKEN_ADDRESS is deprecated — rename it to " +
      "NEXT_PUBLIC_USDC_TOKEN_ADDRESS in your .env."
  );
}
export const USDC_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
  _legacyCusd ||
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E"
) as `0x${string}`;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Build a Blockscout explorer URL for a transaction hash on the configured
 * Celo network. Falls back to Sepolia (the default for `CELO_NETWORK` in
 * backend/lib/blockchain.js) when the network env is missing.
 */
export function getTxExplorerUrl(txHash: string): string {
  const net = (process.env.NEXT_PUBLIC_CELO_NETWORK || "sepolia").toLowerCase();
  if (net === "mainnet") return `https://celo.blockscout.com/tx/${txHash}`;
  if (net === "alfajores") return `https://celo-alfajores.blockscout.com/tx/${txHash}`;
  return `https://celo-sepolia.blockscout.com/tx/${txHash}`;
}

export const VAULT_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_admin", type: "address", internalType: "address" },
      { name: "_usdc", type: "address", internalType: "address" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "createEvent",
    inputs: [
      { name: "eventId", type: "bytes32", internalType: "bytes32" },
      { name: "ticketPrice", type: "uint256", internalType: "uint256" },
      { name: "creator", type: "address", internalType: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "distributePrize",
    inputs: [
      { name: "eventId", type: "bytes32", internalType: "bytes32" },
      { name: "winners", type: "address[]", internalType: "address[]" },
      { name: "shares", type: "uint256[]", internalType: "uint256[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "emergencyRefund",
    inputs: [{ name: "eventId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "eventExists",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getEventInfo",
    inputs: [{ name: "eventId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "creator", type: "address", internalType: "address" },
      { name: "ticketPrice", type: "uint256", internalType: "uint256" },
      { name: "prizePool", type: "uint256", internalType: "uint256" },
      { name: "distributed", type: "bool", internalType: "bool" },
      { name: "participantCount", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isParticipant",
    inputs: [
      { name: "eventId", type: "bytes32", internalType: "bytes32" },
      { name: "user", type: "address", internalType: "address" }
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "register",
    inputs: [{ name: "eventId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "EventCreated",
    inputs: [
      { name: "eventId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "ticketPrice", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "FundsRefunded",
    inputs: [
      { name: "eventId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "totalRefunded", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ParticipantRegistered",
    inputs: [
      { name: "eventId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "participant", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PrizeDistributed",
    inputs: [
      { name: "eventId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "totalPrize", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  }
] as const;

export const USDC_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: true, internalType: "address" },
      { name: "value", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  }
] as const;
