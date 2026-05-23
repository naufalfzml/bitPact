const {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  parseEther,
  parseAbi,
  getContract,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { celo, celoAlfajores } = require("viem/chains");

// Determine target chain from environment
const targetChain =
  process.env.CELO_NETWORK === "mainnet" ? celo : celoAlfajores;

// Viem Public Client — for reading on-chain data
const publicClient = createPublicClient({
  chain: targetChain,
  transport: http(process.env.CELO_RPC_URL),
});

// Admin account from private key
const adminAccount = privateKeyToAccount(
  process.env.ADMIN_WALLET_PRIVATE_KEY
);

// Viem Wallet Client — for writing transactions (admin-signed)
const walletClient = createWalletClient({
  account: adminAccount,
  chain: targetChain,
  transport: http(process.env.CELO_RPC_URL),
});

// BitPatchVault ABI (only the functions we call from backend)
const VAULT_ABI = parseAbi([
  "function createEvent(bytes32 eventId, uint256 ticketPrice, address creator) external",
  "function distributePrize(bytes32 eventId, address[] calldata winners, uint256[] calldata shares) external",
  "function emergencyRefund(bytes32 eventId) external",
  "function getEventInfo(bytes32 eventId) external view returns (address creator, uint256 ticketPrice, uint256 prizePool, bool distributed, uint256 participantCount)",
  "function isParticipant(bytes32 eventId, address user) external view returns (bool)",
  "event EventCreated(bytes32 indexed eventId, address indexed creator, uint256 ticketPrice)",
  "event ParticipantRegistered(bytes32 indexed eventId, address indexed participant, uint256 amount)",
  "event PrizeDistributed(bytes32 indexed eventId, uint256 totalPrize)",
  "event FundsRefunded(bytes32 indexed eventId, uint256 totalRefunded)",
]);

// cUSD ERC-20 minimal ABI (for reading transfer events / balances)
const CUSD_ABI = parseAbi([
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/**
 * Convert a UUID string into a bytes32 keccak256 hash
 * used as eventId on-chain.
 */
function uuidToBytes32(uuid) {
  return keccak256(toHex(uuid));
}

module.exports = {
  publicClient,
  walletClient,
  adminAccount,
  VAULT_ABI,
  CUSD_ABI,
  uuidToBytes32,
  parseEther,
};
