// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/LaunchpadFactory.sol";
import "../contracts/LaunchpadToken.sol";

contract LaunchpadFactoryTest is Test {
    LaunchpadFactory public factory;

    address public owner = address(this);
    address public feeRecipient = address(0x1);
    address public creator = address(0x2);
    address public user1 = address(0x3);

    uint256 constant CREATION_FEE = 0.1 ether;
    uint256 constant MIN_INITIAL_MINT = 0.001 ether;
    uint256 constant DEFAULT_BASE_PRICE = 0.001 ether;
    uint256 constant DEFAULT_CURVE = 1e8; // Gentle curve for better reserve ratio
    uint256 constant DEFAULT_RESERVE_RATIO = 5000; // 50% - lower for bonding curve model

    string constant DEFAULT_DESCRIPTION = "A test token for the launchpad";
    string constant DEFAULT_IMAGE_URL = "https://example.com/token.png";

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 basePrice,
        uint256 curveCoefficient,
        uint256 minReserveRatio,
        uint256 initialMint,
        uint256 timestamp,
        string description,
        string imageUrl
    );
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event FeesWithdrawn(address recipient, uint256 amount);

    function setUp() public {
        vm.deal(creator, 100 ether);
        vm.deal(user1, 100 ether);

        factory = new LaunchpadFactory(CREATION_FEE, feeRecipient);
    }

    // ============ Deployment Tests ============

    function test_DeploymentSetsCreationFee() public view {
        assertEq(factory.creationFee(), CREATION_FEE);
    }

    function test_DeploymentSetsFeeRecipient() public view {
        assertEq(factory.feeRecipient(), feeRecipient);
    }

    function test_DeploymentStartsWithZeroTokens() public view {
        assertEq(factory.tokenCount(), 0);
    }

    function test_DeploymentSetsOwner() public view {
        assertEq(factory.owner(), owner);
    }

    // ============ Token Creation Tests ============

    function test_CreateToken() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, uint256 tokensMinted) = factory.createToken{value: totalPayment}(
            "My Token",
            "MTK",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        assertNotEq(tokenAddr, address(0));
        assertGt(tokensMinted, 0);
        assertEq(factory.tokenCount(), 1);
    }

    function test_CreateTokenEmitsEvent() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectEmit(false, true, false, false);
        emit TokenCreated(address(0), creator, "", "", 0, 0, 0, 0, 0, "", "");

        factory.createToken{value: totalPayment}(
            "Event Token",
            "EVT",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenRegistersCorrectly() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Registry Token",
            "REG",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        // Check registry
        assertTrue(factory.isLaunchpadToken(tokenAddr));

        address[] memory allTokens = factory.getAllTokens();
        assertEq(allTokens.length, 1);
        assertEq(allTokens[0], tokenAddr);

        address[] memory creatorTokens = factory.getTokensByCreator(creator);
        assertEq(creatorTokens.length, 1);
        assertEq(creatorTokens[0], tokenAddr);

        address bySymbol = factory.getTokenBySymbol("REG");
        assertEq(bySymbol, tokenAddr);
    }

    function test_CreateTokenMintsToCreator() public {
        uint256 initialDeposit = 1 ether;
        uint256 totalPayment = CREATION_FEE + initialDeposit;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Mint Token",
            "MINT",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));
        assertGt(token.balanceOf(creator), 0);
        assertEq(token.tonReserve(), initialDeposit);
    }

    function test_CreateTokenTransfersFeeToRecipient() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;
        uint256 balanceBefore = feeRecipient.balance;

        vm.prank(creator);
        factory.createToken{value: totalPayment}(
            "Fee Token",
            "FEE",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        assertEq(feeRecipient.balance, balanceBefore + CREATION_FEE);
    }

    function test_CreateTokenFailsWithInsufficientPayment() public {
        vm.prank(creator);
        vm.expectRevert("Insufficient payment");
        factory.createToken{value: CREATION_FEE}( // Missing initial deposit
            "Cheap Token",
            "CHEAP",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithDuplicateSymbol() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        factory.createToken{value: totalPayment}(
            "First Token",
            "DUP",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        vm.prank(user1);
        vm.expectRevert("Symbol already exists");
        factory.createToken{value: totalPayment}(
            "Second Token",
            "DUP",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithEmptyName() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectRevert("Invalid name length");
        factory.createToken{value: totalPayment}(
            "",
            "EMPTY",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithEmptySymbol() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectRevert("Invalid symbol length");
        factory.createToken{value: totalPayment}(
            "Valid Name",
            "",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithInvalidBasePrice() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectRevert("Invalid base price");
        factory.createToken{value: totalPayment}(
            "Zero Price",
            "ZERO",
            0, // Invalid
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithLowReserveRatio() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectRevert("Invalid reserve ratio");
        factory.createToken{value: totalPayment}(
            "Low Reserve",
            "LOW",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            4000, // Below 50% minimum
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithHighReserveRatio() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectRevert("Invalid reserve ratio");
        factory.createToken{value: totalPayment}(
            "High Reserve",
            "HIGH",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            10001, // Above 100%
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );
    }

    // ============ Token Lookup Tests ============

    function test_GetAllTokens() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.startPrank(creator);
        factory.createToken{value: totalPayment}("Token1", "TK1", DEFAULT_BASE_PRICE, DEFAULT_CURVE, DEFAULT_RESERVE_RATIO, DEFAULT_DESCRIPTION, DEFAULT_IMAGE_URL);
        factory.createToken{value: totalPayment}("Token2", "TK2", DEFAULT_BASE_PRICE, DEFAULT_CURVE, DEFAULT_RESERVE_RATIO, DEFAULT_DESCRIPTION, DEFAULT_IMAGE_URL);
        factory.createToken{value: totalPayment}("Token3", "TK3", DEFAULT_BASE_PRICE, DEFAULT_CURVE, DEFAULT_RESERVE_RATIO, DEFAULT_DESCRIPTION, DEFAULT_IMAGE_URL);
        vm.stopPrank();

        address[] memory allTokens = factory.getAllTokens();
        assertEq(allTokens.length, 3);
    }

    function test_GetTokensByCreator() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        factory.createToken{value: totalPayment}("Creator1", "C1", DEFAULT_BASE_PRICE, DEFAULT_CURVE, DEFAULT_RESERVE_RATIO, DEFAULT_DESCRIPTION, DEFAULT_IMAGE_URL);

        vm.prank(creator);
        factory.createToken{value: totalPayment}("Creator2", "C2", DEFAULT_BASE_PRICE, DEFAULT_CURVE, DEFAULT_RESERVE_RATIO, DEFAULT_DESCRIPTION, DEFAULT_IMAGE_URL);

        vm.prank(user1);
        factory.createToken{value: totalPayment}("User1", "U1", DEFAULT_BASE_PRICE, DEFAULT_CURVE, DEFAULT_RESERVE_RATIO, DEFAULT_DESCRIPTION, DEFAULT_IMAGE_URL);

        address[] memory creatorTokens = factory.getTokensByCreator(creator);
        assertEq(creatorTokens.length, 2);

        address[] memory user1Tokens = factory.getTokensByCreator(user1);
        assertEq(user1Tokens.length, 1);
    }

    function test_GetTokensPaginated() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.startPrank(creator);
        for (uint256 i = 0; i < 5; i++) {
            factory.createToken{value: totalPayment}(
                string(abi.encodePacked("Token", vm.toString(i))),
                string(abi.encodePacked("TK", vm.toString(i))),
                DEFAULT_BASE_PRICE,
                DEFAULT_CURVE,
                DEFAULT_RESERVE_RATIO,
                DEFAULT_DESCRIPTION,
                DEFAULT_IMAGE_URL
            );
        }
        vm.stopPrank();

        address[] memory page1 = factory.getTokensPaginated(0, 2);
        assertEq(page1.length, 2);

        address[] memory page2 = factory.getTokensPaginated(2, 2);
        assertEq(page2.length, 2);

        address[] memory page3 = factory.getTokensPaginated(4, 2);
        assertEq(page3.length, 1);
    }

    function test_GetTokenBySymbol() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Symbol Test",
            "SYM",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        assertEq(factory.getTokenBySymbol("SYM"), tokenAddr);
        assertEq(factory.getTokenBySymbol("NONEXISTENT"), address(0));
    }

    // ============ Admin Functions Tests ============

    function test_OwnerCanSetCreationFee() public {
        uint256 newFee = 0.2 ether;

        vm.expectEmit(true, true, false, false);
        emit CreationFeeUpdated(CREATION_FEE, newFee);

        factory.setCreationFee(newFee);

        assertEq(factory.creationFee(), newFee);
    }

    function test_NonOwnerCannotSetCreationFee() public {
        vm.prank(user1);
        vm.expectRevert();
        factory.setCreationFee(0.5 ether);
    }

    function test_OwnerCanSetFeeRecipient() public {
        address newRecipient = address(0x999);

        vm.expectEmit(true, true, false, false);
        emit FeeRecipientUpdated(feeRecipient, newRecipient);

        factory.setFeeRecipient(newRecipient);

        assertEq(factory.feeRecipient(), newRecipient);
    }

    function test_NonOwnerCannotSetFeeRecipient() public {
        vm.prank(user1);
        vm.expectRevert();
        factory.setFeeRecipient(user1);
    }

    function test_CannotSetZeroFeeRecipient() public {
        vm.expectRevert("Invalid recipient");
        factory.setFeeRecipient(address(0));
    }

    function test_CalculateCreationCost() public view {
        uint256 initialMint = 5 ether;
        uint256 cost = factory.calculateCreationCost(initialMint);
        assertEq(cost, CREATION_FEE + initialMint);
    }

    function test_CalculateCreationCostFailsWithLowMint() public {
        vm.expectRevert("Initial mint too low");
        factory.calculateCreationCost(0.0001 ether);
    }

    // ============ Created Token Functionality Tests ============

    function test_CreatedTokenAllowsPublicMinting() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Public Token",
            "PUB",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));

        vm.prank(user1);
        token.mint{value: 0.5 ether}();

        assertGt(token.balanceOf(user1), 0);
    }

    function test_CreatedTokenAllowsBurning() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Burn Token",
            "BURN",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));

        // Mint smaller amount to maintain healthy reserve ratio
        vm.prank(user1);
        token.mint{value: 0.1 ether}();

        uint256 balance = token.balanceOf(user1);
        uint256 tonBefore = user1.balance;

        // Burn smaller portion to stay within reserve ratio
        vm.prank(user1);
        token.burn(balance / 10);

        assertEq(token.balanceOf(user1), balance - balance / 10);
        assertGt(user1.balance, tonBefore);
    }

    function test_CreatedTokenSetsCorrectCreator() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Creator Test",
            "CRT",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));
        assertEq(token.creator(), creator);
    }

    function test_CreatedTokenSetsCorrectFactory() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Factory Test",
            "FAC",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));
        assertEq(token.factory(), address(factory));
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreateTokenWithVariousParams(
        uint256 basePrice,
        uint256 curveCoefficient,
        uint256 reserveRatio,
        uint256 initialDeposit
    ) public {
        basePrice = bound(basePrice, 1e12, 1e24);
        curveCoefficient = bound(curveCoefficient, 0, 1e18);
        reserveRatio = bound(reserveRatio, 5000, 10000);
        initialDeposit = bound(initialDeposit, MIN_INITIAL_MINT, 10 ether);

        uint256 totalPayment = CREATION_FEE + initialDeposit;

        vm.prank(creator);
        (address tokenAddr, uint256 tokensMinted) = factory.createToken{value: totalPayment}(
            "Fuzz Token",
            "FUZZ",
            basePrice,
            curveCoefficient,
            reserveRatio,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        assertNotEq(tokenAddr, address(0));
        assertGt(tokensMinted, 0);

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));
        assertEq(token.tonReserve(), initialDeposit);
    }

    // ============ Metadata Tests ============

    function test_CreateTokenStoresDescription() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Desc Token",
            "DESC",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));
        assertEq(token.description(), DEFAULT_DESCRIPTION);
    }

    function test_CreateTokenStoresImageUrl() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        (address tokenAddr, ) = factory.createToken{value: totalPayment}(
            "Img Token",
            "IMG",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE_URL
        );

        LaunchpadToken token = LaunchpadToken(payable(tokenAddr));
        assertEq(token.imageUrl(), DEFAULT_IMAGE_URL);
    }

    function test_CreateTokenFailsWithEmptyImageUrl() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        vm.prank(creator);
        vm.expectRevert("Image URL required");
        factory.createToken{value: totalPayment}(
            "No Image",
            "NOIMG",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            ""
        );
    }

    function test_CreateTokenFailsWithTooLongDescription() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        // Create a string longer than 512 bytes
        bytes memory longDesc = new bytes(513);
        for (uint256 i = 0; i < 513; i++) {
            longDesc[i] = "a";
        }

        vm.prank(creator);
        vm.expectRevert("Description too long");
        factory.createToken{value: totalPayment}(
            "Long Desc",
            "LONG",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            string(longDesc),
            DEFAULT_IMAGE_URL
        );
    }

    function test_CreateTokenFailsWithTooLongImageUrl() public {
        uint256 totalPayment = CREATION_FEE + 1 ether;

        // Create a string longer than 256 bytes
        bytes memory longUrl = new bytes(257);
        for (uint256 i = 0; i < 257; i++) {
            longUrl[i] = "a";
        }

        vm.prank(creator);
        vm.expectRevert("Image URL too long");
        factory.createToken{value: totalPayment}(
            "Long URL",
            "LURL",
            DEFAULT_BASE_PRICE,
            DEFAULT_CURVE,
            DEFAULT_RESERVE_RATIO,
            DEFAULT_DESCRIPTION,
            string(longUrl)
        );
    }
}
