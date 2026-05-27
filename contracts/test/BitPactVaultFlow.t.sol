// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {BitPactVault} from "../src/BitPactVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockBlacklistedUSDC} from "./mocks/MockBlacklistedUSDC.sol";

/// @dev Mock USDC with 6 decimals (mirrors native Circle USDC on Celo)
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title BitPactVault — End-to-End Lifecycle & Backend-Invariant Tests
/// @notice These tests model the *real* off-chain → on-chain flow the backend
///         performs (createEvent → register → distribute/refund) and pin down
///         the economic invariant the Express backend must respect:
///
///             sum(shares) MUST equal the on-chain prizePool
///                        (= actual number of depositors * ticketPrice)
///
///         The backend computes the pool from the Supabase participant *count*
///         (routes/events.js resolveConsensus), not from the on-chain
///         prizePool. Any divergence between DB rows and real depositors
///         makes distributePrize revert. The phantom-participant test below
///         reproduces that exact failure.
contract BitPactVaultFlowTest is Test {
    BitPactVault public vault;
    MockUSDC public usdc;

    address admin = address(0xAD);
    address creator = address(0xC1);
    address alice = address(0xA1);
    address bob = address(0xB0);
    address carol = address(0xCA);
    address dave = address(0xD4); // invited via Social Connect but never deposits

    bytes32 eventId = keccak256("flow-event");
    uint256 ticketPrice = 5_000_000; // 5 USDC at 6 decimals

    function setUp() public {
        usdc = new MockUSDC();
        vault = new BitPactVault(admin, address(usdc));

        address[4] memory players = [alice, bob, carol, dave];
        for (uint256 i; i < players.length; ++i) {
            usdc.mint(players[i], 100_000_000); // 100 USDC each
            vm.prank(players[i]);
            usdc.approve(address(vault), type(uint256).max);
        }
    }

    // ──────────────────────────────────────────────
    //  Happy path: full lifecycle ending in a payout
    // ──────────────────────────────────────────────

    function test_flow_fullLifecycle_distributeSingleWinner() public {
        // Backend: createEvent on POST /api/events
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        // Frontend: three players approve + register on-chain
        _register(alice);
        _register(bob);
        _register(carol);

        (, , uint256 pool, bool distributed, uint256 count) = vault.getEventInfo(eventId);
        assertEq(pool, ticketPrice * 3, "pool should equal 3 deposits");
        assertEq(count, 3);
        assertFalse(distributed);

        // Backend resolveConsensus: pool computed from the SAME 3 depositors -> matches
        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 3;

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares);

        assertEq(usdc.balanceOf(alice), aliceBefore + ticketPrice * 3, "winner gets full pool");
        (, , , bool distAfter, ) = vault.getEventInfo(eventId);
        assertTrue(distAfter);
    }

    // ──────────────────────────────────────────────
    //  Reject path: everyone votes reject -> refund
    // ──────────────────────────────────────────────

    function test_flow_consensusRejected_refundsAllDepositors() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);
        _register(alice);
        _register(bob);
        _register(carol);

        uint256 aBefore = usdc.balanceOf(alice);
        uint256 bBefore = usdc.balanceOf(bob);
        uint256 cBefore = usdc.balanceOf(carol);

        vm.prank(admin);
        vault.emergencyRefund(eventId);

        assertEq(usdc.balanceOf(alice), aBefore + ticketPrice);
        assertEq(usdc.balanceOf(bob), bBefore + ticketPrice);
        assertEq(usdc.balanceOf(carol), cBefore + ticketPrice);
    }

    // ──────────────────────────────────────────────
    //  BUG REPRODUCTION: phantom participant (Social Connect invite)
    //
    //  Frontend handleAddResolvedPlayer() inserts a DB participant row with
    //  tx_hash = "social-connect-invite", which the backend register handler
    //  trusts WITHOUT an on-chain deposit. resolveConsensus then computes
    //  totalPool = ticket_price * dbParticipantCount (= 4), but the vault only
    //  holds 3 real deposits. distributePrize reverts with SharesMismatch and
    //  (because the error is swallowed in resolveConsensus) the event is still
    //  marked "ended" while the funds stay locked.
    // ──────────────────────────────────────────────

    function test_flow_phantomParticipant_causesSharesMismatch() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        // Only THREE players actually deposit on-chain...
        _register(alice);
        _register(bob);
        _register(carol);
        // ...dave was invited via Social Connect: a DB row exists, no deposit.

        uint256 realPool = ticketPrice * 3; // what the contract holds
        uint256 backendPool = ticketPrice * 4; // what resolveConsensus computes (DB count = 4)
        assertTrue(backendPool != realPool, "backend over-counts the pool");

        // Single winner gets the WHOLE backend-computed pool -> exceeds real pool.
        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = backendPool;

        vm.prank(admin);
        vm.expectRevert(BitPactVault.SharesMismatch.selector);
        vault.distributePrize(eventId, winners, shares);

        // Funds remain trapped: pool still full, event not distributed.
        (, , uint256 pool, bool distributed, ) = vault.getEventInfo(eventId);
        assertEq(pool, realPool, "pool untouched after failed distribution");
        assertFalse(distributed, "event not actually distributed on-chain");
    }

    // ──────────────────────────────────────────────
    //  Correct fix illustration: pool read from on-chain getEventInfo
    // ──────────────────────────────────────────────

    function test_flow_poolFromOnChainState_distributesCorrectly() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);
        _register(alice);
        _register(bob);
        _register(carol);

        // The robust approach: derive shares from the ON-CHAIN prizePool.
        (, , uint256 onChainPool, , ) = vault.getEventInfo(eventId);

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        uint256[] memory shares = new uint256[](2);
        shares[0] = onChainPool / 2;
        shares[1] = onChainPool - (onChainPool / 2); // remainder-safe

        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares); // does NOT revert
        (, , , bool distributed, ) = vault.getEventInfo(eventId);
        assertTrue(distributed);
    }

    // ──────────────────────────────────────────────
    //  Characterization: USDC blacklist causes whole-batch revert
    //
    //  Documents the "Known Risk" we publish in contracts/README.md:
    //  Circle USDC can blacklist any address. Because distributePrize and
    //  emergencyRefund transfer in a loop and revert on first failure,
    //  a single blacklisted winner / participant freezes the whole pool
    //  until creator routes recovery through `disputed` + `appeal`, or
    //  backend triggers `settlement_failed` retry with different inputs.
    // ──────────────────────────────────────────────

    function test_flow_blacklistedRecipient_revertsBatchDistribute() public {
        MockBlacklistedUSDC blUsdc = new MockBlacklistedUSDC();
        BitPactVault freshVault = new BitPactVault(admin, address(blUsdc));

        // Mint + approve 3 players
        address[3] memory players = [alice, bob, carol];
        for (uint256 i; i < players.length; ++i) {
            blUsdc.mint(players[i], 100_000_000);
            vm.prank(players[i]);
            blUsdc.approve(address(freshVault), type(uint256).max);
        }

        bytes32 freshEvent = keccak256("fresh-blacklist-distribute");
        vm.prank(admin);
        freshVault.createEvent(freshEvent, ticketPrice, creator);

        // All three register normally
        vm.prank(alice);
        freshVault.register(freshEvent);
        vm.prank(bob);
        freshVault.register(freshEvent);
        vm.prank(carol);
        freshVault.register(freshEvent);

        uint256 aliceBefore = blUsdc.balanceOf(alice);
        uint256 bobBefore = blUsdc.balanceOf(bob);
        uint256 carolBefore = blUsdc.balanceOf(carol);

        // Circle blacklists `bob` AFTER deposit
        blUsdc.blacklist(bob);

        address[] memory winners = new address[](3);
        winners[0] = alice;
        winners[1] = bob;
        winners[2] = carol;
        uint256[] memory shares = new uint256[](3);
        shares[0] = ticketPrice;
        shares[1] = ticketPrice;
        shares[2] = ticketPrice;

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(MockBlacklistedUSDC.BlacklistedRecipient.selector, bob)
        );
        freshVault.distributePrize(freshEvent, winners, shares);

        // Whole batch reverted: nobody got paid, event not distributed,
        // pool still trapped in vault.
        assertEq(blUsdc.balanceOf(alice), aliceBefore, "alice unchanged");
        assertEq(blUsdc.balanceOf(bob), bobBefore, "bob unchanged");
        assertEq(blUsdc.balanceOf(carol), carolBefore, "carol unchanged");
        (, , uint256 pool, bool distributed, ) = freshVault.getEventInfo(freshEvent);
        assertEq(pool, ticketPrice * 3, "pool still locked");
        assertFalse(distributed, "event not marked distributed");
    }

    function test_flow_blacklistedRecipient_revertsBatchRefund() public {
        MockBlacklistedUSDC blUsdc = new MockBlacklistedUSDC();
        BitPactVault freshVault = new BitPactVault(admin, address(blUsdc));

        address[3] memory players = [alice, bob, carol];
        for (uint256 i; i < players.length; ++i) {
            blUsdc.mint(players[i], 100_000_000);
            vm.prank(players[i]);
            blUsdc.approve(address(freshVault), type(uint256).max);
        }

        bytes32 freshEvent = keccak256("fresh-blacklist-refund");
        vm.prank(admin);
        freshVault.createEvent(freshEvent, ticketPrice, creator);

        vm.prank(alice);
        freshVault.register(freshEvent);
        vm.prank(bob);
        freshVault.register(freshEvent);
        vm.prank(carol);
        freshVault.register(freshEvent);

        // Circle blacklists `carol` AFTER deposit
        blUsdc.blacklist(carol);

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(MockBlacklistedUSDC.BlacklistedRecipient.selector, carol)
        );
        freshVault.emergencyRefund(freshEvent);

        // Funds stay locked — refund never partial.
        (, , uint256 pool, bool distributed, ) = freshVault.getEventInfo(freshEvent);
        assertEq(pool, ticketPrice * 3, "pool still locked");
        assertFalse(distributed, "event not marked distributed");
    }

    // ──────────────────────────────────────────────
    //  Helper
    // ──────────────────────────────────────────────

    function _register(address who) internal {
        vm.prank(who);
        vault.register(eventId);
    }
}
