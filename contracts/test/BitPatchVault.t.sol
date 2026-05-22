// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {BitPatchVault} from "../src/BitPatchVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal mock cUSD token for testing
contract MockCUSD is ERC20 {
    constructor() ERC20("Mock cUSD", "cUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract BitPatchVaultTest is Test {
    BitPatchVault public vault;
    MockCUSD public token;

    address admin = address(0xAD);
    address creator = address(0xC1);
    address alice = address(0xA1);
    address bob = address(0xB0);
    address charlie = address(0xC3);
    address dave = address(0xD4);

    bytes32 eventId = keccak256("event-001");
    uint256 ticketPrice = 5 ether; // 5 cUSD (18 decimals)

    function setUp() public {
        token = new MockCUSD();
        vault = new BitPatchVault(admin, address(token));

        // Mint cUSD to participants
        token.mint(alice, 100 ether);
        token.mint(bob, 100 ether);
        token.mint(charlie, 100 ether);
        token.mint(dave, 100 ether);

        // Approve vault to spend cUSD
        vm.prank(alice);
        token.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        token.approve(address(vault), type(uint256).max);
        vm.prank(charlie);
        token.approve(address(vault), type(uint256).max);
        vm.prank(dave);
        token.approve(address(vault), type(uint256).max);
    }

    // ──────────────────────────────────────────────
    //  Constructor Tests
    // ──────────────────────────────────────────────

    function test_constructor_setsAdminAndToken() public view {
        assertEq(vault.admin(), admin);
        assertEq(address(vault.cUSD()), address(token));
    }

    // ──────────────────────────────────────────────
    //  createEvent Tests
    // ──────────────────────────────────────────────

    function test_createEvent_success() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        (address c, uint256 tp, uint256 pp, bool dist, uint256 count) = vault.getEventInfo(eventId);
        assertEq(c, creator);
        assertEq(tp, ticketPrice);
        assertEq(pp, 0);
        assertFalse(dist);
        assertEq(count, 0);
    }

    function test_createEvent_revertNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert(BitPatchVault.OnlyAdmin.selector);
        vault.createEvent(eventId, ticketPrice, creator);
    }

    function test_createEvent_revertDuplicate() public {
        vm.startPrank(admin);
        vault.createEvent(eventId, ticketPrice, creator);
        vm.expectRevert(BitPatchVault.EventAlreadyExists.selector);
        vault.createEvent(eventId, ticketPrice, creator);
        vm.stopPrank();
    }

    // ──────────────────────────────────────────────
    //  register Tests
    // ──────────────────────────────────────────────

    function test_register_success() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        vm.prank(alice);
        vault.register(eventId);

        (, , uint256 pp, , uint256 count) = vault.getEventInfo(eventId);
        assertEq(pp, ticketPrice);
        assertEq(count, 1);
        assertTrue(vault.isParticipant(eventId, alice));
    }

    function test_register_multipleParticipants() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        vm.prank(alice);
        vault.register(eventId);
        vm.prank(bob);
        vault.register(eventId);

        (, , uint256 pp, , uint256 count) = vault.getEventInfo(eventId);
        assertEq(pp, ticketPrice * 2);
        assertEq(count, 2);
    }

    function test_register_revertDuplicate() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        vm.prank(alice);
        vault.register(eventId);

        vm.prank(alice);
        vm.expectRevert(BitPatchVault.AlreadyRegistered.selector);
        vault.register(eventId);
    }

    function test_register_revertEventNotFound() public {
        vm.prank(alice);
        vm.expectRevert(BitPatchVault.EventNotFound.selector);
        vault.register(keccak256("nonexistent"));
    }

    function test_register_revertAfterDistributed() public {
        _createAndRegisterFourParticipants();

        // Distribute first
        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 4;

        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares);

        // Attempt register after distribution
        vm.prank(alice);
        vm.expectRevert(BitPatchVault.EventAlreadyDistributed.selector);
        vault.register(eventId);
    }

    // ──────────────────────────────────────────────
    //  distributePrize Tests
    // ──────────────────────────────────────────────

    function test_distributePrize_singleWinner() public {
        _createAndRegisterFourParticipants();

        uint256 totalPool = ticketPrice * 4;
        uint256 aliceBefore = token.balanceOf(alice);

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = totalPool;

        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares);

        assertEq(token.balanceOf(alice), aliceBefore + totalPool);

        (, , , bool dist, ) = vault.getEventInfo(eventId);
        assertTrue(dist);
    }

    function test_distributePrize_multiWinner() public {
        _createAndRegisterFourParticipants();

        uint256 totalPool = ticketPrice * 4;
        uint256 aliceBefore = token.balanceOf(alice);
        uint256 bobBefore = token.balanceOf(bob);

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        uint256[] memory shares = new uint256[](2);
        shares[0] = totalPool * 70 / 100; // 70% to 1st place
        shares[1] = totalPool * 30 / 100; // 30% to 2nd place

        vm.prank(admin);
        vault.distributePrize(eventId, winners, shares);

        assertEq(token.balanceOf(alice), aliceBefore + shares[0]);
        assertEq(token.balanceOf(bob), bobBefore + shares[1]);
    }

    function test_distributePrize_revertNonAdmin() public {
        _createAndRegisterFourParticipants();

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 4;

        vm.prank(alice);
        vm.expectRevert(BitPatchVault.OnlyAdmin.selector);
        vault.distributePrize(eventId, winners, shares);
    }

    function test_distributePrize_revertSharesMismatch() public {
        _createAndRegisterFourParticipants();

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 3; // wrong: should be 4 * ticketPrice

        vm.prank(admin);
        vm.expectRevert(BitPatchVault.SharesMismatch.selector);
        vault.distributePrize(eventId, winners, shares);
    }

    function test_distributePrize_revertDoubleDistribute() public {
        _createAndRegisterFourParticipants();

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 4;

        vm.startPrank(admin);
        vault.distributePrize(eventId, winners, shares);

        vm.expectRevert(BitPatchVault.EventAlreadyDistributed.selector);
        vault.distributePrize(eventId, winners, shares);
        vm.stopPrank();
    }

    function test_distributePrize_revertEmptyWinners() public {
        _createAndRegisterFourParticipants();

        address[] memory winners = new address[](0);
        uint256[] memory shares = new uint256[](0);

        vm.prank(admin);
        vm.expectRevert(BitPatchVault.EmptyWinners.selector);
        vault.distributePrize(eventId, winners, shares);
    }

    function test_distributePrize_revertLengthMismatch() public {
        _createAndRegisterFourParticipants();

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 4;

        vm.prank(admin);
        vm.expectRevert(BitPatchVault.LengthMismatch.selector);
        vault.distributePrize(eventId, winners, shares);
    }

    // ──────────────────────────────────────────────
    //  emergencyRefund Tests
    // ──────────────────────────────────────────────

    function test_emergencyRefund_success() public {
        _createAndRegisterFourParticipants();

        uint256 aliceBefore = token.balanceOf(alice);
        uint256 bobBefore = token.balanceOf(bob);
        uint256 charlieBefore = token.balanceOf(charlie);
        uint256 daveBefore = token.balanceOf(dave);

        vm.prank(admin);
        vault.emergencyRefund(eventId);

        assertEq(token.balanceOf(alice), aliceBefore + ticketPrice);
        assertEq(token.balanceOf(bob), bobBefore + ticketPrice);
        assertEq(token.balanceOf(charlie), charlieBefore + ticketPrice);
        assertEq(token.balanceOf(dave), daveBefore + ticketPrice);

        (, , , bool dist, ) = vault.getEventInfo(eventId);
        assertTrue(dist);
    }

    function test_emergencyRefund_revertNonAdmin() public {
        _createAndRegisterFourParticipants();

        vm.prank(alice);
        vm.expectRevert(BitPatchVault.OnlyAdmin.selector);
        vault.emergencyRefund(eventId);
    }

    function test_emergencyRefund_revertAfterDistributed() public {
        _createAndRegisterFourParticipants();

        // Distribute first
        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = ticketPrice * 4;

        vm.startPrank(admin);
        vault.distributePrize(eventId, winners, shares);

        vm.expectRevert(BitPatchVault.EventAlreadyDistributed.selector);
        vault.emergencyRefund(eventId);
        vm.stopPrank();
    }

    // ──────────────────────────────────────────────
    //  View Function Tests
    // ──────────────────────────────────────────────

    function test_getEventInfo_revertNotFound() public {
        vm.expectRevert(BitPatchVault.EventNotFound.selector);
        vault.getEventInfo(keccak256("nonexistent"));
    }

    function test_isParticipant_returnsFalseForNonParticipant() public {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        assertFalse(vault.isParticipant(eventId, alice));
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    function _createAndRegisterFourParticipants() internal {
        vm.prank(admin);
        vault.createEvent(eventId, ticketPrice, creator);

        vm.prank(alice);
        vault.register(eventId);
        vm.prank(bob);
        vault.register(eventId);
        vm.prank(charlie);
        vault.register(eventId);
        vm.prank(dave);
        vault.register(eventId);
    }
}
