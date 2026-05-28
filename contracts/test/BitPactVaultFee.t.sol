// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BitPactVault} from "../src/BitPactVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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

/// @title BitPactVault — Protocol Fee Tests (feeBps = 200 = 2%)
/// @notice Pins down the entry-surcharge fee behaviour: register pulls ticket+fee
///         while prizePool tracks tickets only; distribute pays the full pool to
///         winners and forwards the escrowed fee to admin; refund returns ticket+fee.
contract BitPactVaultFeeTest is Test {
    BitPactVault public vault;
    MockUSDC public usdc;

    address admin = address(0xAD);
    address creator = address(0xC1);
    address alice = address(0xA1);
    address bob = address(0xB0);
    address carol = address(0xCA);

    bytes32 eventId = keccak256("fee-event");
    uint256 ticketPrice = 5_000_000; // 5 USDC at 6 decimals
    uint16 constant FEE_BPS = 200; // 2%
    uint256 feePerPerson = (5_000_000 * 200) / 10000; // 0.10 USDC = 100_000

    function setUp() public {
        usdc = new MockUSDC();
        vault = new BitPactVault(admin, address(usdc), FEE_BPS);

        address[3] memory players = [alice, bob, carol];
        for (uint256 i; i < players.length; ++i) {
            usdc.mint(players[i], 100_000_000); // 100 USDC each
            vm.prank(players[i]);
            usdc.approve(address(vault), type(uint256).max);
        }
    }

    function _createAndRegisterThree() internal {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);
        vm.prank(alice);
        vault.register(eventId);
        vm.prank(bob);
        vault.register(eventId);
        vm.prank(carol);
        vault.register(eventId);
    }

    // ──────────────────────────────────────────────
    //  Constructor cap
    // ──────────────────────────────────────────────

    function test_constructor_setsFeeBps() public view {
        assertEq(vault.feeBps(), FEE_BPS);
    }

    function test_constructor_revertFeeTooHigh() public {
        vm.expectRevert(bytes("fee too high"));
        new BitPactVault(admin, address(usdc), 1001);
    }

    function test_constructor_allowsMaxFee() public {
        BitPactVault maxed = new BitPactVault(admin, address(usdc), 1000);
        assertEq(maxed.feeBps(), 1000);
    }

    // ──────────────────────────────────────────────
    //  Register pulls ticket + fee; pool tracks ticket only
    // ──────────────────────────────────────────────

    function test_register_pullsTicketPlusFee() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.register(eventId);

        // Participant paid ticket + fee
        assertEq(usdc.balanceOf(alice), aliceBefore - (ticketPrice + feePerPerson));
        // Vault holds the full ticket + fee
        assertEq(usdc.balanceOf(address(vault)), ticketPrice + feePerPerson);

        // prizePool tracks tickets only (fee excluded)
        (, , uint256 pool, , uint256 count) = vault.getEventInfo(eventId);
        assertEq(pool, ticketPrice, "pool excludes fee");
        assertEq(count, 1);
    }

    // ──────────────────────────────────────────────
    //  Distribute: winner gets full pool, admin gets fee
    // ──────────────────────────────────────────────

    function test_distribute_winnerGetsPool_adminGetsFee() public {
        _createAndRegisterThree();

        uint256 pool = ticketPrice * 3;
        uint256 totalFee = feePerPerson * 3;

        // sanity: vault holds pool + fee
        assertEq(usdc.balanceOf(address(vault)), pool + totalFee);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 adminBefore = usdc.balanceOf(admin);

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = pool;

        vm.expectEmit(true, false, false, true);
        emit BitPactVault.FeeCollected(eventId, totalFee);

        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares);

        // Admin (treasury) receives the accumulated fee at distribute time
        assertEq(usdc.balanceOf(admin), adminBefore + totalFee, "admin gets fee");
        // Pull-payment: winner not pushed; full pool recorded as claimable & still escrowed
        assertEq(usdc.balanceOf(alice), aliceBefore, "winner not pushed at distribute");
        assertEq(vault.claimableOf(eventId, alice), pool);
        assertEq(usdc.balanceOf(address(vault)), pool, "pool still escrowed pre-claim");

        // Winner claims the full pool
        vm.prank(alice);
        vault.claim(eventId);
        assertEq(usdc.balanceOf(alice), aliceBefore + pool, "winner gets full pool");
        assertEq(usdc.balanceOf(address(vault)), 0, "vault drained after claim");
    }

    function test_distribute_multiWinner_adminStillGetsFee() public {
        _createAndRegisterThree();

        uint256 pool = ticketPrice * 3;
        uint256 totalFee = feePerPerson * 3;
        uint256 adminBefore = usdc.balanceOf(admin);

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        uint256[] memory shares = new uint256[](2);
        shares[0] = pool / 2;
        shares[1] = pool - (pool / 2);

        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares);

        assertEq(usdc.balanceOf(admin), adminBefore + totalFee);
        // Pool stays escrowed as claimable until winners claim.
        assertEq(usdc.balanceOf(address(vault)), pool);

        vm.prank(alice);
        vault.claim(eventId);
        vm.prank(bob);
        vault.claim(eventId);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    // ──────────────────────────────────────────────
    //  Refund returns ticket + fee; admin gets nothing
    // ──────────────────────────────────────────────

    function test_refund_returnsTicketPlusFee() public {
        _createAndRegisterThree();

        uint256 aBefore = usdc.balanceOf(alice);
        uint256 bBefore = usdc.balanceOf(bob);
        uint256 cBefore = usdc.balanceOf(carol);
        uint256 adminBefore = usdc.balanceOf(admin);

        vm.prank(admin);
        vault.emergencyRefund(eventId);

        assertEq(usdc.balanceOf(alice), aBefore + ticketPrice + feePerPerson);
        assertEq(usdc.balanceOf(bob), bBefore + ticketPrice + feePerPerson);
        assertEq(usdc.balanceOf(carol), cBefore + ticketPrice + feePerPerson);

        // Admin receives no fee on refund
        assertEq(usdc.balanceOf(admin), adminBefore, "admin gets no fee on refund");
        // Vault drained to zero
        assertEq(usdc.balanceOf(address(vault)), 0, "vault drained on refund");
    }
}
