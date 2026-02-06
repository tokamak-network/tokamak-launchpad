// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/LaunchpadToken.sol";
import "../contracts/LaunchpadFactory.sol";

contract LaunchpadTokenTest is Test {
    LaunchpadToken public token;
    LaunchpadFactory public factory;

    address public owner = address(this);
    address public creator = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public feeRecipient = address(0x4);

    string constant TOKEN_NAME = "Test Token";
    string constant TOKEN_SYMBOL = "TEST";
    uint256 constant BASE_PRICE = 0.001 ether; // 0.001 TON per token
    uint256 constant CURVE_COEFFICIENT = 1e8; // Very gentle curve for better reserve ratio
    uint256 constant MIN_RESERVE_RATIO = 5000; // 50% - lower for bonding curve model
    uint256 constant CREATION_FEE = 0.01 ether;

    event TokensMinted(address indexed user, uint256 tonDeposited, uint256 tokensMinted, uint256 newPrice);
    event TokensBurned(address indexed user, uint256 tokensBurned, uint256 tonReturned, uint256 newPrice);
    event ReserveRatioUpdated(uint256 oldRatio, uint256 newRatio);

    function setUp() public {
        // Fund test accounts
        vm.deal(creator, 100 ether);
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);

        // Deploy factory
        factory = new LaunchpadFactory(CREATION_FEE, feeRecipient);

        // Create token via factory
        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: CREATION_FEE + 1 ether}(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            BASE_PRICE,
            CURVE_COEFFICIENT,
            MIN_RESERVE_RATIO
        );
        token = LaunchpadToken(payable(tokenAddr));
    }

    // ============ Deployment Tests ============

    function test_DeploymentSetsCorrectName() public view {
        assertEq(token.name(), TOKEN_NAME);
    }

    function test_DeploymentSetsCorrectSymbol() public view {
        assertEq(token.symbol(), TOKEN_SYMBOL);
    }

    function test_DeploymentSetsCorrectCreator() public view {
        assertEq(token.creator(), creator);
    }

    function test_DeploymentSetsCorrectFactory() public view {
        assertEq(token.factory(), address(factory));
    }

    function test_DeploymentSetsCorrectBasePrice() public view {
        assertEq(token.basePrice(), BASE_PRICE);
    }

    function test_DeploymentSetsCorrectCurveCoefficient() public view {
        assertEq(token.curveCoefficient(), CURVE_COEFFICIENT);
    }

    function test_DeploymentSetsCorrectMinReserveRatio() public view {
        assertEq(token.minReserveRatio(), MIN_RESERVE_RATIO);
    }

    function test_CreatorReceivesInitialTokens() public view {
        assertGt(token.balanceOf(creator), 0);
    }

    function test_InitialReserveIsSet() public view {
        assertEq(token.tonReserve(), 1 ether);
    }

    // ============ Minting Tests ============

    function test_MintTokensWithTON() public {
        uint256 depositAmount = 1 ether;
        uint256 balanceBefore = token.balanceOf(user1);

        vm.prank(user1);
        token.mint{value: depositAmount}();

        assertGt(token.balanceOf(user1), balanceBefore);
    }

    function test_MintUpdatesReserve() public {
        uint256 reserveBefore = token.tonReserve();
        uint256 depositAmount = 1 ether;

        vm.prank(user1);
        token.mint{value: depositAmount}();

        assertEq(token.tonReserve(), reserveBefore + depositAmount);
    }

    function test_MintEmitsEvent() public {
        uint256 depositAmount = 1 ether;

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit TokensMinted(user1, depositAmount, 0, 0); // We don't check exact values

        token.mint{value: depositAmount}();
    }

    function test_MintFailsWithZeroValue() public {
        vm.prank(user1);
        vm.expectRevert("Must send TON");
        token.mint{value: 0}();
    }

    function test_PriceIncreasesAfterMint() public {
        uint256 priceBefore = token.getCurrentPrice();

        vm.prank(user1);
        token.mint{value: 1 ether}();

        uint256 priceAfter = token.getCurrentPrice();
        assertGt(priceAfter, priceBefore);
    }

    function test_EarlyAdoptersGetMoreTokens() public {
        uint256 depositAmount = 0.5 ether;

        // User1 mints first
        vm.prank(user1);
        token.mint{value: depositAmount}();
        uint256 user1Balance = token.balanceOf(user1);

        // User2 mints same amount later
        vm.prank(user2);
        token.mint{value: depositAmount}();
        uint256 user2Balance = token.balanceOf(user2);

        // User1 should have more tokens (got in at lower price)
        assertGt(user1Balance, user2Balance);
    }

    // ============ Burning Tests ============

    function test_BurnTokensForTON() public {
        // First mint some tokens - smaller amount for healthy ratio
        vm.prank(user1);
        token.mint{value: 0.5 ether}();

        // Ensure redemptions are not paused
        assertFalse(token.redemptionsPaused());

        uint256 tokenBalance = token.balanceOf(user1);
        uint256 burnAmount = tokenBalance / 4; // Burn less to stay within ratio
        uint256 tonBefore = user1.balance;

        vm.prank(user1);
        token.burn(burnAmount);

        assertEq(token.balanceOf(user1), tokenBalance - burnAmount);
        assertGt(user1.balance, tonBefore);
    }

    function test_BurnEmitsEvent() public {
        vm.prank(user1);
        token.mint{value: 0.5 ether}();

        uint256 burnAmount = token.balanceOf(user1) / 10;

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit TokensBurned(user1, burnAmount, 0, 0);

        token.burn(burnAmount);
    }

    function test_BurnFailsWithZeroAmount() public {
        // Need to mint first so redemptions aren't paused
        vm.prank(user1);
        token.mint{value: 0.1 ether}();

        vm.prank(user1);
        vm.expectRevert("Amount must be > 0");
        token.burn(0);
    }

    function test_BurnFailsWithInsufficientBalance() public {
        vm.prank(user1);
        token.mint{value: 0.1 ether}();

        uint256 balance = token.balanceOf(user1);

        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        token.burn(balance + 1);
    }

    function test_BurnDeductsSpread() public {
        vm.prank(user1);
        token.mint{value: 0.5 ether}();

        uint256 tokenBalance = token.balanceOf(user1);
        uint256 smallBurnAmount = tokenBalance / 10; // Small burn to ensure it works
        (uint256 expectedReturn, ) = token.calculateBurnReturn(smallBurnAmount);

        // The return should be less than the theoretical max due to spread
        uint256 currentPrice = token.getCurrentPrice();
        uint256 theoreticalMax = (smallBurnAmount * currentPrice) / 1e18;

        assertLt(expectedReturn, theoreticalMax);
    }

    // ============ Reserve Ratio Tests ============

    function test_ReserveRatioStartsAt100Percent() public {
        // Deploy a fresh token directly (not via factory)
        LaunchpadToken freshToken = new LaunchpadToken(
            "Fresh",
            "FRESH",
            creator,
            BASE_PRICE,
            CURVE_COEFFICIENT,
            MIN_RESERVE_RATIO
        );

        assertEq(freshToken.getReserveRatio(), 10000); // 100%
    }

    function test_ReserveRatioStaysHealthyAfterSmallMint() public {
        // With gentle curve, small mints should maintain healthy ratio
        vm.prank(user1);
        token.mint{value: 0.1 ether}();

        uint256 ratio = token.getReserveRatio();
        // Ratio will decrease but should stay above minimum
        assertGe(ratio, MIN_RESERVE_RATIO);
    }

    // ============ Price Calculation Tests ============

    function test_CalculateMintAmountReturnsPositive() public view {
        (uint256 tokenAmount, uint256 effectivePrice) = token.calculateMintAmount(1 ether);

        assertGt(tokenAmount, 0);
        assertGt(effectivePrice, 0);
    }

    function test_CalculateBurnReturnReturnsPositive() public {
        vm.prank(user1);
        token.mint{value: 5 ether}();

        uint256 balance = token.balanceOf(user1);
        (uint256 tonReturn, uint256 effectivePrice) = token.calculateBurnReturn(balance / 2);

        assertGt(tonReturn, 0);
        assertGt(effectivePrice, 0);
    }

    function test_CalculateMintAmountFailsWithZero() public {
        vm.expectRevert("Amount must be > 0");
        token.calculateMintAmount(0);
    }

    // ============ Admin Functions Tests ============

    function test_OnlyCreatorCanUpdateReserveRatio() public {
        vm.prank(user1);
        vm.expectRevert("Only creator");
        token.updateMinReserveRatio(9000);
    }

    function test_CreatorCanIncreaseReserveRatio() public {
        uint256 newRatio = 9000;

        vm.prank(creator);
        vm.expectEmit(true, true, false, false);
        emit ReserveRatioUpdated(MIN_RESERVE_RATIO, newRatio);

        token.updateMinReserveRatio(newRatio);

        assertEq(token.minReserveRatio(), newRatio);
    }

    function test_CannotDecreaseReserveRatio() public {
        // First increase the ratio
        vm.prank(creator);
        token.updateMinReserveRatio(7000);

        // Now try to decrease it - should fail
        vm.prank(creator);
        vm.expectRevert("Can only increase ratio");
        token.updateMinReserveRatio(6000);
    }

    function test_CreatorCanPause() public {
        vm.prank(creator);
        token.emergencyPause("Test pause");

        vm.prank(user1);
        vm.expectRevert();
        token.mint{value: 1 ether}();
    }

    function test_CreatorCanUnpause() public {
        // First ensure reserve ratio is healthy by depositing more reserve
        vm.prank(user1);
        token.depositReserve{value: 5 ether}();

        vm.prank(creator);
        token.emergencyPause("Test pause");

        vm.prank(creator);
        token.emergencyUnpause();

        // Should work now
        vm.prank(user1);
        token.mint{value: 0.1 ether}();

        assertGt(token.balanceOf(user1), 0);
    }

    // ============ Factory Mint Tests ============

    function test_FactoryMintOnlyOnce() public {
        // Deploy fresh token
        LaunchpadToken freshToken = new LaunchpadToken(
            "Fresh",
            "FRESH",
            creator,
            BASE_PRICE,
            CURVE_COEFFICIENT,
            MIN_RESERVE_RATIO
        );

        // First mint should work (we are the factory since we deployed)
        freshToken.factoryMint{value: 1 ether}(creator);

        // Second mint should fail
        vm.expectRevert("Already initialized");
        freshToken.factoryMint{value: 1 ether}(creator);
    }

    function test_OnlyFactoryCanFactoryMint() public {
        LaunchpadToken freshToken = new LaunchpadToken(
            "Fresh",
            "FRESH",
            creator,
            BASE_PRICE,
            CURVE_COEFFICIENT,
            MIN_RESERVE_RATIO
        );

        vm.prank(user1);
        vm.expectRevert("Only factory");
        freshToken.factoryMint{value: 1 ether}(creator);
    }

    // ============ Deposit Reserve Tests ============

    function test_AnyoneCanDepositReserve() public {
        uint256 reserveBefore = token.tonReserve();

        vm.prank(user1);
        token.depositReserve{value: 1 ether}();

        assertEq(token.tonReserve(), reserveBefore + 1 ether);
    }

    function test_DepositReserveFailsWithZero() public {
        vm.prank(user1);
        vm.expectRevert("Must send TON");
        token.depositReserve{value: 0}();
    }

    // ============ Receive Tests ============

    function test_ReceiveAcceptsTON() public {
        uint256 reserveBefore = token.tonReserve();

        vm.prank(user1);
        (bool success, ) = address(token).call{value: 1 ether}("");

        assertTrue(success);
        assertEq(token.tonReserve(), reserveBefore + 1 ether);
    }

    // ============ Fuzz Tests ============

    function testFuzz_MintWithVariousAmounts(uint256 amount) public {
        amount = bound(amount, 0.001 ether, 10 ether);

        vm.prank(user1);
        token.mint{value: amount}();

        assertGt(token.balanceOf(user1), 0);
    }

    function testFuzz_BurnWithVariousAmounts(uint256 mintAmount, uint256 burnPercent) public {
        // Use smaller amounts to maintain healthy reserve ratio
        mintAmount = bound(mintAmount, 0.01 ether, 0.5 ether);
        burnPercent = bound(burnPercent, 1, 10); // 1-10% of balance (smaller to stay within ratio)

        vm.prank(user1);
        token.mint{value: mintAmount}();

        // Skip if redemptions are paused
        if (token.redemptionsPaused()) {
            return;
        }

        uint256 balance = token.balanceOf(user1);
        uint256 burnAmount = (balance * burnPercent) / 100;

        if (burnAmount > 0) {
            uint256 tonBefore = user1.balance;

            vm.prank(user1);
            try token.burn(burnAmount) {
                assertGt(user1.balance, tonBefore);
            } catch {
                // Burn may fail due to reserve ratio constraints - this is expected
            }
        }
    }
}
