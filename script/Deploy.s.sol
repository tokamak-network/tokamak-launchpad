// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/LaunchpadFactory.sol";

/**
 * @title Deploy
 * @notice Deployment script for TON-Backed Token Launchpad
 *
 * Usage:
 * - Local: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 * - Thanos Sepolia: forge script script/Deploy.s.sol --rpc-url $THANOS_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    // Configuration
    uint256 public constant CREATION_FEE = 10 ether; // 10 TON

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("============================================================");
        console.log("TON-BACKED TOKEN LAUNCHPAD DEPLOYMENT");
        console.log("============================================================");
        console.log("Deployer:", deployer);
        console.log("Deployer Balance:", deployer.balance / 1e18, "TON");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying LaunchpadFactory...");
        LaunchpadFactory factory = new LaunchpadFactory(CREATION_FEE, deployer);
        console.log("  LaunchpadFactory deployed at:", address(factory));

        vm.stopBroadcast();

        // Summary
        console.log("");
        console.log("============================================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("============================================================");
        console.log("LaunchpadFactory: ", address(factory));
        console.log("Creation Fee:     ", CREATION_FEE / 1e18, "TON");
        console.log("Fee Recipient:    ", deployer);
        console.log("============================================================");
    }
}

/**
 * @title DeployLocal
 * @notice Simplified deployment for local testing with anvil
 *
 * Usage: forge script script/Deploy.s.sol:DeployLocalScript --rpc-url http://localhost:8545 --broadcast
 */
contract DeployLocalScript is Script {
    function run() external {
        // Use anvil's default private key
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        // Deploy factory with 0 creation fee for testing
        LaunchpadFactory factory = new LaunchpadFactory(0, vm.addr(deployerPrivateKey));

        console.log("LaunchpadFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
