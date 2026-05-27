// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockBlacklistedUSDC
/// @notice Mock USDC that mirrors Circle's blacklist behavior: any `transfer`
///         or `transferFrom` to/from a blacklisted address reverts. Used by
///         characterization tests to demonstrate the "whole-batch revert"
///         risk in `BitPactVault.distributePrize` and `emergencyRefund`.
/// @dev    Uses 6 decimals like real native USDC on Celo.
contract MockBlacklistedUSDC is ERC20 {
    mapping(address => bool) public isBlacklisted;

    error BlacklistedSender(address account);
    error BlacklistedRecipient(address account);

    constructor() ERC20("Mock Blacklisted USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Mark an address as blacklisted. Subsequent transfers
    ///         involving this address will revert.
    function blacklist(address account) external {
        isBlacklisted[account] = true;
    }

    /// @notice Lift a blacklist for testing flows that recover after blacklist.
    function unBlacklist(address account) external {
        isBlacklisted[account] = false;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && isBlacklisted[from]) revert BlacklistedSender(from);
        if (to != address(0) && isBlacklisted[to]) revert BlacklistedRecipient(to);
        super._update(from, to, value);
    }
}
