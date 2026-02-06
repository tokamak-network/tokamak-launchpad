// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ILaunchpadToken.sol";

/**
 * @title LaunchpadToken
 * @notice ERC-20 token backed by TON with hybrid bonding curve pricing
 * @dev Implements a quadratic bonding curve with reserve floor protection
 *
 * BACKING MODEL:
 * - Price follows: P = basePrice + (curveCoefficient × supply²)
 * - Minimum reserve ratio enforced (default 80%)
 * - Buy/sell spread provides protocol sustainability
 *
 * SECURITY:
 * - ReentrancyGuard on all state-changing functions
 * - Reserve ratio checks prevent under-collateralization
 * - Pausable for emergency situations
 * - No admin minting (fair launch guarantee)
 */
contract LaunchpadToken is ERC20, ReentrancyGuard, Pausable, ILaunchpadToken {
    // ============ Constants ============
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_RESERVE_RATIO = 10000; // 100% in basis points
    uint256 public constant MIN_RESERVE_RATIO_FLOOR = 5000; // 50% minimum allowed setting
    uint256 public constant BUY_SELL_SPREAD = 300; // 3% spread in basis points

    // ============ Immutables ============
    address public immutable override factory;
    address public immutable override creator;
    uint256 public immutable basePrice; // Starting price in TON wei
    uint256 public immutable curveCoefficient; // Price increase rate


    // ============ State Variables ============
    uint256 public minReserveRatio; // In basis points (8000 = 80%)
    uint256 public tonReserve; // Total TON locked in contract
    bool public redemptionsPaused; // True if reserve ratio too low
    bool private initialized; // For factory initial mint

    // ============ Constructor ============
    /**
     * @notice Creates a new TON-backed token
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _creator Address of token creator
     * @param _basePrice Initial price per token in TON wei
     * @param _curveCoefficient Rate of price increase (scaled by 1e18)
     * @param _minReserveRatio Minimum reserve ratio in basis points
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _creator,
        uint256 _basePrice,
        uint256 _curveCoefficient,
        uint256 _minReserveRatio
    ) ERC20(_name, _symbol) {
        require(_creator != address(0), "Invalid creator");
        require(_basePrice > 0, "Base price must be > 0");
        require(_minReserveRatio >= MIN_RESERVE_RATIO_FLOOR, "Reserve ratio too low");
        require(_minReserveRatio <= MAX_RESERVE_RATIO, "Reserve ratio too high");

        factory = msg.sender;
        creator = _creator;
        basePrice = _basePrice;
        curveCoefficient = _curveCoefficient;
        minReserveRatio = _minReserveRatio;
    }

    // ============ Modifiers ============
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    // ============ View Functions ============

    /**
     * @notice Get current price per token based on bonding curve
     * @return Current price in TON wei
     * @dev Price = basePrice + (curveCoefficient × supply² / PRECISION²)
     */
    function getCurrentPrice() public view override returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return basePrice;
        }
        // P = basePrice + (curveCoefficient × supply²) / PRECISION²
        // Using PRECISION² to maintain precision with squared supply
        uint256 curveComponent = (curveCoefficient * supply * supply) / (PRECISION * PRECISION);
        return basePrice + curveComponent;
    }

    /**
     * @notice Get the current reserve ratio
     * @return Reserve ratio in basis points (10000 = 100%)
     */
    function getReserveRatio() public view override returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return MAX_RESERVE_RATIO; // 100% when no supply
        }

        uint256 theoreticalValue = (supply * getCurrentPrice()) / PRECISION;
        if (theoreticalValue == 0) {
            return MAX_RESERVE_RATIO;
        }

        return (tonReserve * MAX_RESERVE_RATIO) / theoreticalValue;
    }

    /**
     * @notice Get total TON locked in reserve
     */
    function getTonReserve() external view override returns (uint256) {
        return tonReserve;
    }

    /**
     * @notice Calculate tokens received for a given TON deposit
     * @param tonAmount Amount of TON to deposit
     * @return tokenAmount Tokens that would be minted
     * @return effectivePrice Average price per token for this purchase
     */
    function calculateMintAmount(uint256 tonAmount) public view override returns (uint256 tokenAmount, uint256 effectivePrice) {
        require(tonAmount > 0, "Amount must be > 0");

        uint256 currentSupply = totalSupply();
        uint256 currentPrice = getCurrentPrice();

        // For small purchases relative to supply, use simple division
        // For larger purchases, we need to integrate the curve
        // Using numerical approximation: split into small steps

        uint256 remainingTon = tonAmount;
        uint256 totalTokens = 0;
        uint256 stepSize = tonAmount / 100; // 1% steps
        if (stepSize == 0) stepSize = tonAmount;

        uint256 simulatedSupply = currentSupply;

        while (remainingTon > 0) {
            uint256 stepTon = remainingTon > stepSize ? stepSize : remainingTon;
            uint256 stepPrice = _calculatePriceAtSupply(simulatedSupply);

            if (stepPrice == 0) stepPrice = basePrice;

            uint256 stepTokens = (stepTon * PRECISION) / stepPrice;
            totalTokens += stepTokens;
            simulatedSupply += stepTokens;
            remainingTon -= stepTon;
        }

        tokenAmount = totalTokens;
        effectivePrice = totalTokens > 0 ? (tonAmount * PRECISION) / totalTokens : currentPrice;
    }

    /**
     * @notice Calculate TON returned for burning tokens
     * @param tokenAmount Amount of tokens to burn
     * @return tonAmount TON that would be returned (minus spread)
     * @return effectivePrice Average price per token for this sale
     */
    function calculateBurnReturn(uint256 tokenAmount) public view override returns (uint256 tonAmount, uint256 effectivePrice) {
        require(tokenAmount > 0, "Amount must be > 0");
        require(tokenAmount <= totalSupply(), "Exceeds supply");

        uint256 currentSupply = totalSupply();

        // Calculate gross return by integrating down the curve
        uint256 remainingTokens = tokenAmount;
        uint256 totalTon = 0;
        uint256 stepSize = tokenAmount / 100;
        if (stepSize == 0) stepSize = tokenAmount;

        uint256 simulatedSupply = currentSupply;

        while (remainingTokens > 0) {
            uint256 stepTokens = remainingTokens > stepSize ? stepSize : remainingTokens;
            simulatedSupply -= stepTokens;
            uint256 stepPrice = _calculatePriceAtSupply(simulatedSupply);

            uint256 stepTon = (stepTokens * stepPrice) / PRECISION;
            totalTon += stepTon;
            remainingTokens -= stepTokens;
        }

        // Apply sell spread
        uint256 spreadDeduction = (totalTon * BUY_SELL_SPREAD) / MAX_RESERVE_RATIO;
        tonAmount = totalTon - spreadDeduction;

        // Ensure we don't return more than reserve
        if (tonAmount > tonReserve) {
            tonAmount = tonReserve;
        }

        effectivePrice = tokenAmount > 0 ? (tonAmount * PRECISION) / tokenAmount : 0;
    }

    // ============ State-Changing Functions ============

    /**
     * @notice Mint tokens by depositing TON
     * @return tokenAmount Amount of tokens minted
     * @dev Follows bonding curve pricing, updates reserve
     */
    function mint() external payable override nonReentrant whenNotPaused returns (uint256 tokenAmount) {
        require(msg.value > 0, "Must send TON");

        (uint256 tokens, ) = calculateMintAmount(msg.value);
        require(tokens > 0, "Would mint 0 tokens");

        // Update state before external calls
        tonReserve += msg.value;

        // Mint tokens to user
        _mint(msg.sender, tokens);

        // Check reserve ratio is healthy
        _checkAndUpdateRedemptionStatus();

        emit TokensMinted(msg.sender, msg.value, tokens, getCurrentPrice());

        return tokens;
    }

    /**
     * @notice Factory function to mint initial tokens to creator
     * @param recipient Address to receive minted tokens
     * @return tokenAmount Amount of tokens minted
     * @dev Can only be called once by factory during creation
     */
    function factoryMint(address recipient) external payable nonReentrant returns (uint256 tokenAmount) {
        require(msg.sender == factory, "Only factory");
        require(!initialized, "Already initialized");
        require(msg.value > 0, "Must send TON");
        require(recipient != address(0), "Invalid recipient");

        initialized = true;

        (uint256 tokens, ) = calculateMintAmount(msg.value);
        require(tokens > 0, "Would mint 0 tokens");

        // Update state
        tonReserve += msg.value;

        // Mint tokens to recipient (creator)
        _mint(recipient, tokens);

        // Check reserve ratio is healthy
        _checkAndUpdateRedemptionStatus();

        emit TokensMinted(recipient, msg.value, tokens, getCurrentPrice());

        return tokens;
    }

    /**
     * @notice Burn tokens to redeem TON
     * @param tokenAmount Amount of tokens to burn
     * @return tonAmount Amount of TON returned
     * @dev Subject to reserve ratio requirements and spread
     */
    function burn(uint256 tokenAmount) external override nonReentrant whenNotPaused returns (uint256 tonAmount) {
        require(!redemptionsPaused, "Redemptions paused - low reserve");
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        (uint256 tonReturn, ) = calculateBurnReturn(tokenAmount);
        require(tonReturn > 0, "Would return 0 TON");
        require(tonReturn <= tonReserve, "Insufficient reserve");

        // Check that post-burn reserve ratio stays healthy
        uint256 postBurnSupply = totalSupply() - tokenAmount;
        if (postBurnSupply > 0) {
            uint256 postBurnReserve = tonReserve - tonReturn;
            uint256 postBurnPrice = _calculatePriceAtSupply(postBurnSupply);
            uint256 theoreticalValue = (postBurnSupply * postBurnPrice) / PRECISION;

            if (theoreticalValue > 0) {
                uint256 postBurnRatio = (postBurnReserve * MAX_RESERVE_RATIO) / theoreticalValue;
                require(postBurnRatio >= minReserveRatio, "Would breach reserve ratio");
            }
        }

        // Update state before external calls
        tonReserve -= tonReturn;
        _burn(msg.sender, tokenAmount);

        // Transfer TON to user
        (bool success, ) = payable(msg.sender).call{value: tonReturn}("");
        require(success, "TON transfer failed");

        _checkAndUpdateRedemptionStatus();

        emit TokensBurned(msg.sender, tokenAmount, tonReturn, getCurrentPrice());

        return tonReturn;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update minimum reserve ratio (creator only)
     * @param newRatio New reserve ratio in basis points
     * @dev Can only increase the ratio, not decrease (protection mechanism)
     */
    function updateMinReserveRatio(uint256 newRatio) external override onlyCreator {
        require(newRatio >= minReserveRatio, "Can only increase ratio");
        require(newRatio <= MAX_RESERVE_RATIO, "Ratio too high");

        uint256 oldRatio = minReserveRatio;
        minReserveRatio = newRatio;

        _checkAndUpdateRedemptionStatus();

        emit ReserveRatioUpdated(oldRatio, newRatio);
    }

    /**
     * @notice Emergency pause (creator only)
     * @param reason Reason for pausing
     */
    function emergencyPause(string calldata reason) external onlyCreator {
        _pause();
        emit EmergencyPaused(msg.sender, reason);
    }

    /**
     * @notice Unpause after emergency (creator only)
     */
    function emergencyUnpause() external onlyCreator {
        require(getReserveRatio() >= minReserveRatio, "Reserve ratio too low");
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Deposit additional TON to restore reserve ratio
     * @dev Anyone can call this to help restore health
     */
    function depositReserve() external payable nonReentrant {
        require(msg.value > 0, "Must send TON");
        tonReserve += msg.value;
        _checkAndUpdateRedemptionStatus();
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate price at a given supply level
     */
    function _calculatePriceAtSupply(uint256 supply) internal view returns (uint256) {
        if (supply == 0) {
            return basePrice;
        }
        uint256 curveComponent = (curveCoefficient * supply * supply) / (PRECISION * PRECISION);
        return basePrice + curveComponent;
    }

    /**
     * @notice Check reserve ratio and update redemption status
     */
    function _checkAndUpdateRedemptionStatus() internal {
        uint256 ratio = getReserveRatio();
        if (ratio < minReserveRatio) {
            redemptionsPaused = true;
        } else {
            redemptionsPaused = false;
        }
    }

    // ============ Receive Function ============

    /**
     * @notice Accept direct TON deposits as reserve
     */
    receive() external payable {
        tonReserve += msg.value;
        _checkAndUpdateRedemptionStatus();
    }
}
