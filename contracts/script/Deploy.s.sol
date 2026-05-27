// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BitPactVault} from "../src/BitPactVault.sol";

/// @title Deploy BitPactVault to Celo (Sepolia / Mainnet)
/// @notice USDC native token addresses (per openspec/specs/usdc-integration):
///         - Celo Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
///         - Celo Sepolia: 0x01C5C0122039549AD1493B8220cABEdD739BC44E
/// @dev    Usage:
///         export ADMIN_WALLET_ADDRESS=0x...
///         export USDC_TOKEN_ADDRESS=0x...
///         forge script script/Deploy.s.sol:DeployBitPactVault \
///           --rpc-url $CELO_RPC_URL \
///           --broadcast \
///           --private-key $DEPLOYER_PRIVATE_KEY \
///           -vvvv
contract DeployBitPactVault is Script {
    function run() external {
        // Read admin wallet address from environment
        address adminWallet = vm.envAddress("ADMIN_WALLET_ADDRESS");
        // Read USDC token address from environment
        address usdcToken = vm.envAddress("USDC_TOKEN_ADDRESS");

        vm.startBroadcast();

        BitPactVault vault = new BitPactVault(adminWallet, usdcToken);
        console.log("BitPactVault deployed at:", address(vault));
        console.log("Admin wallet:", adminWallet);
        console.log("USDC token:", usdcToken);

        vm.stopBroadcast();
    }
}
