// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title BitPatchVault
/// @notice Blind escrow vault for bitPatch tournament prize pools on Celo.
///         Holds cUSD deposits, distributes shares to winners, or refunds all participants.
/// @dev    Only the backend admin wallet may call mutating functions (createEvent, distributePrize, emergencyRefund).
contract BitPatchVault {
    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    struct EventInfo {
        address creator;
        uint256 ticketPrice;
        uint256 prizePool;
        bool distributed;
        address[] participants;
        mapping(address => bool) isRegistered;
    }

    mapping(bytes32 => EventInfo) private events;
    mapping(bytes32 => bool) public eventExists;

    address public immutable admin;
    IERC20 public immutable cUSD;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event EventCreated(bytes32 indexed eventId, address indexed creator, uint256 ticketPrice);
    event ParticipantRegistered(bytes32 indexed eventId, address indexed participant, uint256 amount);
    event PrizeDistributed(bytes32 indexed eventId, uint256 totalPrize);
    event FundsRefunded(bytes32 indexed eventId, uint256 totalRefunded);

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

    /// @param _admin  Backend admin wallet address authorised to execute critical functions
    /// @param _cUSD   ERC-20 cUSD token address on Celo
    constructor(address _admin, address _cUSD) {
        require(_admin != address(0), "admin zero");
        require(_cUSD != address(0), "cUSD zero");
        admin = _admin;
        cUSD = IERC20(_cUSD);
    }

    // ──────────────────────────────────────────────
    //  Create Event
    // ──────────────────────────────────────────────

    /// @notice Create a new tournament event on-chain (admin-only).
    /// @param eventId     Unique event identifier (keccak256 of off-chain UUID)
    /// @param ticketPrice Entry fee in cUSD (wei denomination)
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
    //  Register (Participant deposits cUSD)
    // ──────────────────────────────────────────────

    /// @notice Register for a tournament by depositing the exact ticket price in cUSD.
    ///         Caller must have approved this contract for at least `ticketPrice` cUSD beforehand.
    /// @param eventId The event to register for
    function register(bytes32 eventId) external {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        if (e.distributed) revert EventAlreadyDistributed();
        if (e.isRegistered[msg.sender]) revert AlreadyRegistered();
        if (e.ticketPrice == 0) revert InvalidTicketPrice();

        bool success = cUSD.transferFrom(msg.sender, address(this), e.ticketPrice);
        if (!success) revert TransferFailed();

        e.isRegistered[msg.sender] = true;
        e.participants.push(msg.sender);
        e.prizePool += e.ticketPrice;

        emit ParticipantRegistered(eventId, msg.sender, e.ticketPrice);
    }

    // ──────────────────────────────────────────────
    //  Distribute Prize
    // ──────────────────────────────────────────────

    /// @notice Distribute the prize pool to winners (admin-only).
    ///         Sum of `shares` must equal the total `prizePool`.
    /// @param eventId  The event whose prize pool to distribute
    /// @param winners  Ordered list of winner addresses
    /// @param shares   Corresponding cUSD amounts each winner receives
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
            bool success = cUSD.transfer(winners[i], shares[i]);
            if (!success) revert TransferFailed();
        }

        emit PrizeDistributed(eventId, e.prizePool);
    }

    // ──────────────────────────────────────────────
    //  Emergency Refund
    // ──────────────────────────────────────────────

    /// @notice Refund every participant their ticket price (admin-only).
    ///         Can only be called before prize distribution.
    /// @param eventId The event to refund
    function emergencyRefund(bytes32 eventId) external onlyAdmin {
        if (!eventExists[eventId]) revert EventNotFound();

        EventInfo storage e = events[eventId];
        if (e.distributed) revert EventAlreadyDistributed();

        e.distributed = true; // prevent re-entrancy & double refund

        uint256 refundPerPerson = e.ticketPrice;
        uint256 totalRefunded;

        for (uint256 i; i < e.participants.length; ++i) {
            bool success = cUSD.transfer(e.participants[i], refundPerPerson);
            if (!success) revert TransferFailed();
            totalRefunded += refundPerPerson;
        }

        e.prizePool = 0;

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
}
