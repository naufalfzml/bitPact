// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title BitPactVault
/// @notice Blind escrow vault for bitPact tournament prize pools on Celo.
///         Holds USDC deposits, records winner prizes as claimable, or refunds all participants.
/// @dev    Admin-only mutating functions: createEvent, distributePrize, emergencyRefund.
///         register() and claim() are permissionless (participants / winners act for themselves).
contract BitPactVault {
    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    struct EventInfo {
        address creator;
        uint256 ticketPrice;
        uint256 prizePool;
        uint256 feePool; // escrowed protocol fee, paid to admin on distribute, refunded otherwise
        bool distributed;
        address[] participants;
        mapping(address => bool) isRegistered;
        mapping(address => uint256) claimable; // pull-payment: prize each winner can claim
    }

    mapping(bytes32 => EventInfo) private events;
    mapping(bytes32 => bool) public eventExists;

    address public immutable admin;
    IERC20 public immutable usdc;

    /// @notice Protocol fee in basis points (e.g. 200 = 2%), charged as an entry surcharge.
    uint16 public immutable feeBps;

    uint16 private constant MAX_FEE_BPS = 1000; // hard cap 10% safety
    uint16 private constant BPS_DENOMINATOR = 10000;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event EventCreated(bytes32 indexed eventId, address indexed creator, uint256 ticketPrice);
    event ParticipantRegistered(bytes32 indexed eventId, address indexed participant, uint256 amount);
    event PrizeDistributed(bytes32 indexed eventId, uint256 totalPrize);
    event FundsRefunded(bytes32 indexed eventId, uint256 totalRefunded);
    event FeeCollected(bytes32 indexed eventId, uint256 amount);
    event PrizeClaimed(bytes32 indexed eventId, address indexed winner, uint256 amount);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error OnlyAdmin();
    error EventAlreadyExists();
    error EventNotFound();
    error EventAlreadyDistributed();
    error AlreadyRegistered();
    error InvalidTicketPrice();
    error TransferFailed();
    error SharesMismatch();
    error EmptyWinners();
    error LengthMismatch();
    error NothingToClaim();

    // ──────────────────────────────────────────────
    //  Modifier
    // ──────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /// @param _admin  Backend admin wallet address authorised to execute critical functions.
    ///                Also the treasury that receives the protocol fee on distribution.
    /// @param _usdc   ERC-20 USDC token address on Celo
    /// @param _feeBps Protocol fee in basis points charged as an entry surcharge on register
    ///                (200 = 2%). Immutable; must be <= MAX_FEE_BPS (1000 = 10%).
    constructor(address _admin, address _usdc, uint16 _feeBps) {
        require(_admin != address(0), "admin zero");
        require(_usdc != address(0), "usdc zero");
        require(_feeBps <= MAX_FEE_BPS, "fee too high");
        admin = _admin;
        usdc = IERC20(_usdc);
        feeBps = _feeBps;
    }

    // ──────────────────────────────────────────────
    //  Create Event
    // ──────────────────────────────────────────────

    /// @notice Create a new tournament event on-chain (admin-only).
    /// @param eventId     Unique event identifier (keccak256 of off-chain UUID)
    /// @param ticketPrice Entry fee in USDC (6-decimal denomination)
    /// @param creator     Wallet address of the tournament creator / jury
    function createEvent(bytes32 eventId, uint256 ticketPrice, address creator) external onlyAdmin {
        if (eventExists[eventId]) revert EventAlreadyExists();

        EventInfo storage e = events[eventId];
        e.creator = creator;
        e.ticketPrice = ticketPrice;
        eventExists[eventId] = true;

        emit EventCreated(eventId, creator, ticketPrice);
    }

    // ──────────────────────────────────────────────
    //  Register (Participant deposits USDC)
    // ──────────────────────────────────────────────

    /// @notice Register for a tournament by depositing the ticket price plus protocol fee in USDC.
    ///         The fee (`ticketPrice * feeBps / 10000`) is escrowed separately and does NOT inflate
    ///         the prize pool — winners still receive 100% of the ticket deposits.
    ///         Caller must have approved this contract for at least `ticketPrice + fee` USDC beforehand.
    /// @param eventId The event to register for
    function register(bytes32 eventId) external {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        if (e.distributed) revert EventAlreadyDistributed();
        if (e.isRegistered[msg.sender]) revert AlreadyRegistered();
        if (e.ticketPrice == 0) revert InvalidTicketPrice();

        uint256 fee = (e.ticketPrice * feeBps) / BPS_DENOMINATOR;
        uint256 total = e.ticketPrice + fee;

        bool success = usdc.transferFrom(msg.sender, address(this), total);
        if (!success) revert TransferFailed();

        e.isRegistered[msg.sender] = true;
        e.participants.push(msg.sender);
        e.prizePool += e.ticketPrice; // pool tracks ticket deposits only
        e.feePool += fee; // fee accumulated separately, escrowed

        emit ParticipantRegistered(eventId, msg.sender, e.ticketPrice);
    }

    // ──────────────────────────────────────────────
    //  Distribute Prize
    // ──────────────────────────────────────────────

    /// @notice Finalise a tournament by recording each winner's claimable prize (admin-only).
    ///         Sum of `shares` must equal the total `prizePool` (ticket deposits only — the
    ///         protocol fee is not part of the pool), so winners can claim 100% of the pot.
    ///         This uses pull-payment: instead of pushing USDC to winners, it credits
    ///         `claimable[winner] += share`; each winner later calls `claim()`. The escrowed
    ///         protocol fee is forwarded to the admin treasury here.
    /// @dev    Pull-payment isolates transfer failures: a single blacklisted winner only fails
    ///         their own `claim()`, never blocking the others or this finalisation.
    /// @param eventId  The event whose prize pool to finalise
    /// @param winners  Ordered list of winner addresses
    /// @param shares   Corresponding USDC amounts each winner can claim
    function distributePrize(
        bytes32 eventId,
        address[] calldata winners,
        uint256[] calldata shares
    ) external onlyAdmin {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        if (e.distributed) revert EventAlreadyDistributed();
        if (winners.length == 0) revert EmptyWinners();
        if (winners.length != shares.length) revert LengthMismatch();

        uint256 totalShares;
        for (uint256 i; i < shares.length; ++i) {
            totalShares += shares[i];
        }
        if (totalShares != e.prizePool) revert SharesMismatch();

        e.distributed = true;

        for (uint256 i; i < winners.length; ++i) {
            e.claimable[winners[i]] += shares[i];
        }

        emit PrizeDistributed(eventId, e.prizePool);

        uint256 fee = e.feePool;
        if (fee > 0) {
            e.feePool = 0;
            bool feeOk = usdc.transfer(admin, fee);
            if (!feeOk) revert TransferFailed();
            emit FeeCollected(eventId, fee);
        }
    }

    // ──────────────────────────────────────────────
    //  Claim Prize (pull-payment)
    // ──────────────────────────────────────────────

    /// @notice Claim the prize credited to the caller for a finalised event.
    ///         The caller pays their own gas. Reverts if nothing is claimable.
    /// @param eventId The event to claim from
    function claim(bytes32 eventId) external {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        uint256 amount = e.claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();

        e.claimable[msg.sender] = 0; // effects before interaction (CEI)

        bool success = usdc.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit PrizeClaimed(eventId, msg.sender, amount);
    }

    // ──────────────────────────────────────────────
    //  Emergency Refund
    // ──────────────────────────────────────────────

    /// @notice Refund every participant their ticket price plus protocol fee (admin-only).
    ///         The fee is returned in full since no distribution succeeded.
    ///         Can only be called before prize distribution.
    /// @param eventId The event to refund
    function emergencyRefund(bytes32 eventId) external onlyAdmin {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        if (e.distributed) revert EventAlreadyDistributed();

        e.distributed = true; // prevent re-entrancy & double refund

        uint256 feePerPerson = (e.ticketPrice * feeBps) / BPS_DENOMINATOR;
        uint256 refundPerPerson = e.ticketPrice + feePerPerson;
        uint256 totalRefunded;

        for (uint256 i; i < e.participants.length; ++i) {
            bool success = usdc.transfer(e.participants[i], refundPerPerson);
            if (!success) revert TransferFailed();
            totalRefunded += refundPerPerson;
        }

        e.prizePool = 0;
        e.feePool = 0;

        emit FundsRefunded(eventId, totalRefunded);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice Query event info (pool, distribution status, participant count).
    /// @param eventId The event to query
    /// @return creator        Tournament creator address
    /// @return ticketPrice    Entry fee per participant
    /// @return prizePool      Total accumulated prize pool
    /// @return distributed    Whether the prize has been distributed / refunded
    /// @return participantCount Number of registered participants
    function getEventInfo(bytes32 eventId)
        external
        view
        returns (
            address creator,
            uint256 ticketPrice,
            uint256 prizePool,
            bool distributed,
            uint256 participantCount
        )
    {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        return (e.creator, e.ticketPrice, e.prizePool, e.distributed, e.participants.length);
    }

    /// @notice Check whether an address is registered for an event.
    function isParticipant(bytes32 eventId, address user) external view returns (bool) {
        return events[eventId].isRegistered[user];
    }

    /// @notice Prize amount `account` can currently claim for an event (0 if none/already claimed).
    function claimableOf(bytes32 eventId, address account) external view returns (uint256) {
        return events[eventId].claimable[account];
    }
}
