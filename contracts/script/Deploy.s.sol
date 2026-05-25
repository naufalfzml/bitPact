// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BitPactVault} from "../src/BitPactVault.sol";

/// @title Deploy BitPactVault to Celo Alfajores Testnet
/// @dev   Usage:
///        forge script script/Deploy.s.sol:DeployBitPactVault \
///          --rpc-url $CELO_RPC_URL \
///          --broadcast \
///          --private-key $DEPLOYER_PRIVATE_KEY \
///          -vvvv
contract DeployBitPactVault is Script {
    // Celo Alfajores Testnet cUSD token address
    address constant CUSD_ALFAJORES = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    function run() external {
        // Read admin wallet address from environment
        address adminWallet = vm.envAddress("ADMIN_WALLET_ADDRESS");
        // Read cUSD token address from environment
        address cUSDToken = vm.envAddress("CUSD_TOKEN_ADDRESS");

        vm.startBroadcast();

        BitPactVault vault = new BitPactVault(adminWallet, cUSDToken);
        console.log("BitPactVault deployed at:", address(vault));
        console.log("Admin wallet:", adminWallet);
        console.log("cUSD token:", cUSDToken);

        vm.stopBroadcast();
    }
}
