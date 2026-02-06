// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/LaunchpadFactory.sol";
import "../contracts/LaunchpadToken.sol";

/**
 * @title DemoLifecycle
 * @notice Demonstrates the complete lifecycle of a TON-backed token
 *
 * This script shows:
 * 1. Token Creation
 * 2. Initial Mint (creator)
 * 3. Public Participation (minting)
 * 4. Trading/Transfers
 * 5. Burning/Redemption
 *
 * Usage:
 * - Local: forge script script/DemoLifecycle.s.sol:DemoLifecycleScript --rpc-url http://localhost:8545 --broadcast
 */
contract DemoLifecycleScript is Script {
    // Anvil default accounts
    uint256 constant DEPLOYER_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant CREATOR_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 constant USER1_KEY = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    uint256 constant USER2_KEY = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;

    address deployer;
    address creator;
    address user1;
    address user2;

    LaunchpadFactory factory;
    LaunchpadToken token;

    function run() external {
        deployer = vm.addr(DEPLOYER_KEY);
        creator = vm.addr(CREATOR_KEY);
        user1 = vm.addr(USER1_KEY);
        user2 = vm.addr(USER2_KEY);

        console.log("======================================================================");
        console.log("TON-BACKED TOKEN LAUNCHPAD - LIFECYCLE DEMO");
        console.log("======================================================================");
        console.log("");

        // Step 0: Deploy Factory
        _deployFactory();

        // Step 1: Create Token
        _createToken();

        // Step 2: Public Participation
        _publicMinting();

        // Step 3: Check State
        _checkTokenState();

        // Step 4: Trading
        _trading();

        // Step 5: Burning
        _burning();

        // Final State
        _finalState();
    }

    function _deployFactory() internal {
        console.log("STEP 0: Deploying Factory...");

        vm.broadcast(DEPLOYER_KEY);
        factory = new LaunchpadFactory(0.01 ether, deployer);

        console.log("Factory deployed at:", address(factory));
        console.log("");
    }

    function _createToken() internal {
        console.log("======================================================================");
        console.log("STEP 1: TOKEN CREATION");
        console.log("======================================================================");

        uint256 basePrice = 0.0001 ether;
        uint256 curveCoefficient = 1e10;
        uint256 minReserveRatio = 8000;
        uint256 creationFee = factory.creationFee();
        uint256 initialDeposit = 1 ether;

        console.log("Token Parameters:");
        console.log("  Name: Demo Meme Token");
        console.log("  Symbol: DMEME");
        console.log("  Base Price:", basePrice / 1e18, "TON");
        console.log("  Reserve Ratio:", minReserveRatio / 100, "%");
        console.log("  Initial Deposit:", initialDeposit / 1e18, "TON");
        console.log("");

        vm.broadcast(CREATOR_KEY);
        (address tokenAddr, uint256 tokensMinted) = factory.createToken{value: creationFee + initialDeposit}(
            "Demo Meme Token",
            "DMEME",
            basePrice,
            curveCoefficient,
            minReserveRatio
        );

        token = LaunchpadToken(payable(tokenAddr));

        console.log("Token created at:", tokenAddr);
        console.log("Creator received:", tokensMinted / 1e18, "DMEME");
        console.log("Reserve:", token.tonReserve() / 1e18, "TON");
        console.log("Current price:", token.getCurrentPrice(), "wei");
        console.log("");
    }

    function _publicMinting() internal {
        console.log("======================================================================");
        console.log("STEP 2: PUBLIC PARTICIPATION");
        console.log("======================================================================");

        uint256 user1Deposit = 0.5 ether;
        uint256 priceBefore = token.getCurrentPrice();

        console.log("User1 depositing", user1Deposit / 1e18, "TON...");

        vm.broadcast(USER1_KEY);
        token.mint{value: user1Deposit}();

        uint256 priceAfter = token.getCurrentPrice();
        uint256 user1Balance = token.balanceOf(user1);

        console.log("  User1 received:", user1Balance / 1e18, "DMEME");
        console.log("  Price before:", priceBefore, "wei");
        console.log("  Price after:", priceAfter, "wei");
        console.log("");

        // User2 mints same amount
        uint256 user2Deposit = 0.5 ether;
        console.log("User2 depositing", user2Deposit / 1e18, "TON...");

        vm.broadcast(USER2_KEY);
        token.mint{value: user2Deposit}();

        uint256 user2Balance = token.balanceOf(user2);

        console.log("  User2 received:", user2Balance / 1e18, "DMEME");
        console.log("  Early adopter advantage: User1 got more tokens for same TON");
        console.log("");
    }

    function _checkTokenState() internal view {
        console.log("======================================================================");
        console.log("STEP 3: TOKEN STATE");
        console.log("======================================================================");

        console.log("Total Supply:", token.totalSupply() / 1e18, "DMEME");
        console.log("TON Reserve:", token.tonReserve() / 1e18, "TON");
        console.log("Current Price:", token.getCurrentPrice(), "wei");
        console.log("Reserve Ratio:", token.getReserveRatio() / 100, "%");
        console.log("");
    }

    function _trading() internal {
        console.log("======================================================================");
        console.log("STEP 4: TRADING (TRANSFERS)");
        console.log("======================================================================");

        uint256 user1Balance = token.balanceOf(user1);
        uint256 transferAmount = user1Balance / 4;

        console.log("User1 transferring", transferAmount / 1e18, "DMEME to User2...");

        vm.broadcast(USER1_KEY);
        token.transfer(user2, transferAmount);

        console.log("User1 balance:", token.balanceOf(user1) / 1e18, "DMEME");
        console.log("User2 balance:", token.balanceOf(user2) / 1e18, "DMEME");
        console.log("");
    }

    function _burning() internal {
        console.log("======================================================================");
        console.log("STEP 5: BURNING / REDEMPTION");
        console.log("======================================================================");

        uint256 user1Balance = token.balanceOf(user1);
        uint256 burnAmount = user1Balance / 2;

        (uint256 expectedReturn, ) = token.calculateBurnReturn(burnAmount);
        console.log("User1 burning", burnAmount / 1e18, "DMEME...");
        console.log("Expected TON return:", expectedReturn / 1e18, "TON");

        uint256 tonBefore = user1.balance;

        vm.broadcast(USER1_KEY);
        token.burn(burnAmount);

        uint256 tonAfter = user1.balance;
        console.log("Actual TON received:", (tonAfter - tonBefore) / 1e18, "TON");
        console.log("User1 remaining tokens:", token.balanceOf(user1) / 1e18, "DMEME");
        console.log("");
    }

    function _finalState() internal view {
        console.log("======================================================================");
        console.log("FINAL TOKEN STATE");
        console.log("======================================================================");

        console.log("Total Supply:", token.totalSupply() / 1e18, "DMEME");
        console.log("TON Reserve:", token.tonReserve() / 1e18, "TON");
        console.log("Current Price:", token.getCurrentPrice(), "wei");
        console.log("Reserve Ratio:", token.getReserveRatio() / 100, "%");
        console.log("");
        console.log("Balances:");
        console.log("  Creator:", token.balanceOf(creator) / 1e18, "DMEME");
        console.log("  User1:", token.balanceOf(user1) / 1e18, "DMEME");
        console.log("  User2:", token.balanceOf(user2) / 1e18, "DMEME");
        console.log("");
        console.log("======================================================================");
        console.log("DEMO COMPLETE");
        console.log("======================================================================");
    }
}
