// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LaunchpadToken.sol";

/**
 * @title LaunchpadFactory
 * @notice Factory contract for creating TON-backed ERC-20 tokens
 * @dev Deploys LaunchpadToken contracts with customizable parameters
 *
 * FEATURES:
 * - Permissionless token creation
 * - Configurable creation fee
 * - Token registry for discovery
 * - Event logging for indexing
 *
 * SECURITY:
 * - ReentrancyGuard on creation
 * - Input validation
 * - No admin control over created tokens
 */
contract LaunchpadFactory is Ownable, ReentrancyGuard {
    // ============ Constants ============
    uint256 public constant MIN_BASE_PRICE = 1e12; // 0.000001 TON minimum
    uint256 public constant MAX_BASE_PRICE = 1e24; // 1,000,000 TON maximum
    uint256 public constant MIN_RESERVE_RATIO = 5000; // 50% minimum
    uint256 public constant MAX_RESERVE_RATIO = 10000; // 100% maximum
    uint256 public constant MAX_CURVE_COEFFICIENT = 1e18; // Maximum curve steepness
    uint256 public constant MIN_INITIAL_MINT = 1e15; // Minimum initial TON deposit

    // ============ State Variables ============
    uint256 public creationFee; // Fee in TON to create a token
    address public feeRecipient; // Address receiving creation fees

    // Registry
    address[] public allTokens;
    mapping(address => bool) public isLaunchpadToken;
    mapping(address => address[]) public tokensByCreator;
    mapping(bytes32 => address) public tokenBySymbol; // symbol hash => token address

    // ============ Events ============
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

    // ============ Constructor ============
    /**
     * @notice Initialize the factory
     * @param _creationFee Initial fee to create a token (in TON wei)
     * @param _feeRecipient Address to receive creation fees
     */
    constructor(uint256 _creationFee, address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        creationFee = _creationFee;
        feeRecipient = _feeRecipient;
    }

    // ============ Token Creation ============

    /**
     * @notice Create a new TON-backed token
     * @param name Token name (e.g., "My Awesome Token")
     * @param symbol Token symbol (e.g., "MAT")
     * @param basePrice Starting price per token in TON wei
     * @param curveCoefficient Rate of price increase (scaled by 1e18)
     * @param minReserveRatio Minimum reserve ratio in basis points (e.g., 8000 = 80%)
     * @return token Address of the newly created token
     * @return tokensMinted Amount of tokens minted to creator
     *
     * @dev The msg.value must cover:
     *      - creationFee (goes to feeRecipient)
     *      - initialDeposit (goes to token reserve, creator gets tokens)
     *
     * Example parameters for a typical launch:
     * - basePrice: 1e15 (0.001 TON per token initially)
     * - curveCoefficient: 1e12 (gentle curve)
     * - minReserveRatio: 8000 (80% reserve)
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 basePrice,
        uint256 curveCoefficient,
        uint256 minReserveRatio,
        string calldata description,
        string calldata imageUrl
    ) external payable nonReentrant returns (address token, uint256 tokensMinted) {
        // Validation
        require(bytes(name).length > 0 && bytes(name).length <= 64, "Invalid name length");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 16, "Invalid symbol length");
        require(basePrice >= MIN_BASE_PRICE && basePrice <= MAX_BASE_PRICE, "Invalid base price");
        require(curveCoefficient <= MAX_CURVE_COEFFICIENT, "Curve coefficient too high");
        require(minReserveRatio >= MIN_RESERVE_RATIO && minReserveRatio <= MAX_RESERVE_RATIO, "Invalid reserve ratio");

        // Check symbol uniqueness
        bytes32 symbolHash = keccak256(bytes(symbol));
        require(tokenBySymbol[symbolHash] == address(0), "Symbol already exists");

        // Calculate required payment
        require(msg.value >= creationFee + MIN_INITIAL_MINT, "Insufficient payment");
        uint256 initialDeposit = msg.value - creationFee;

        // Deploy token contract
        LaunchpadToken newToken = new LaunchpadToken(
            name,
            symbol,
            msg.sender,
            basePrice,
            curveCoefficient,
            minReserveRatio,
            description,
            imageUrl,
            feeRecipient
        );

        token = address(newToken);

        // Register token
        allTokens.push(token);
        isLaunchpadToken[token] = true;
        tokensByCreator[msg.sender].push(token);
        tokenBySymbol[symbolHash] = token;

        // Creation fee stays in factory (pull pattern - feeRecipient withdraws later)

        // Initial mint: deposit TON and mint tokens directly to creator
        tokensMinted = newToken.factoryMint{value: initialDeposit}(msg.sender);

        emit TokenCreated(
            token,
            msg.sender,
            name,
            symbol,
            basePrice,
            curveCoefficient,
            minReserveRatio,
            initialDeposit,
            block.timestamp,
            description,
            imageUrl
        );
    }


    // ============ View Functions ============

    /**
     * @notice Get all token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /**
     * @notice Get tokens created by a specific address
     */
    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }

    /**
     * @notice Get token by symbol
     */
    function getTokenBySymbol(string calldata symbol) external view returns (address) {
        return tokenBySymbol[keccak256(bytes(symbol))];
    }

    /**
     * @notice Get paginated list of tokens
     * @param offset Starting index
     * @param limit Maximum tokens to return
     */
    function getTokensPaginated(uint256 offset, uint256 limit) external view returns (address[] memory tokens) {
        require(offset < allTokens.length || allTokens.length == 0, "Offset out of bounds");

        uint256 end = offset + limit;
        if (end > allTokens.length) {
            end = allTokens.length;
        }

        uint256 length = end - offset;
        tokens = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            tokens[i] = allTokens[offset + i];
        }
    }

    /**
     * @notice Calculate creation cost
     * @param initialMintAmount Desired initial TON to deposit
     */
    function calculateCreationCost(uint256 initialMintAmount) external view returns (uint256) {
        require(initialMintAmount >= MIN_INITIAL_MINT, "Initial mint too low");
        return creationFee + initialMintAmount;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update creation fee
     */
    function setCreationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = newFee;
        emit CreationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Withdraw accumulated fees (backup)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(feeRecipient).call{value: balance}("");
        require(success, "Withdrawal failed");
        emit FeesWithdrawn(feeRecipient, balance);
    }
}
