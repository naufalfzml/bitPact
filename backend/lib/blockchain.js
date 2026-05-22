const { ethers } = require("ethers");

// Celo Alfajores RPC provider
const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);

// Backend admin wallet signer
const adminWallet = new ethers.Wallet(
  process.env.ADMIN_WALLET_PRIVATE_KEY,
  provider
);

// BitPatchVault ABI (only the functions we call from backend)
const VAULT_ABI = [
  "function createEvent(bytes32 eventId, uint256 ticketPrice, address creator) external",
  "function distributePrize(bytes32 eventId, address[] calldata winners, uint256[] calldata shares) external",
  "function emergencyRefund(bytes32 eventId) external",
  "function getEventInfo(bytes32 eventId) external view returns (address creator, uint256 ticketPrice, uint256 prizePool, bool distributed, uint256 participantCount)",
  "function isParticipant(bytes32 eventId, address user) external view returns (bool)",
  "event EventCreated(bytes32 indexed eventId, address indexed creator, uint256 ticketPrice)",
  "event ParticipantRegistered(bytes32 indexed eventId, address indexed participant, uint256 amount)",
  "event PrizeDistributed(bytes32 indexed eventId, uint256 totalPrize)",
  "event FundsRefunded(bytes32 indexed eventId, uint256 totalRefunded)",
];

// Contract instance connected to admin signer
const vaultContract = new ethers.Contract(
  process.env.VAULT_CONTRACT_ADDRESS,
  VAULT_ABI,
  adminWallet
);

// cUSD ERC-20 minimal ABI (for reading transfer events / balances)
const CUSD_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const cUSDContract = new ethers.Contract(
  process.env.CUSD_TOKEN_ADDRESS,
  CUSD_ABI,
  provider
);

/**
 * Convert a UUID string into a bytes32 keccak256 hash
 * used as eventId on-chain.
 */
function uuidToBytes32(uuid) {
  return ethers.keccak256(ethers.toUtf8Bytes(uuid));
}

module.exports = {
  provider,
  adminWallet,
  vaultContract,
  cUSDContract,
  uuidToBytes32,
};
