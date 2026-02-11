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
 * - Minimum reserve ratio enforced (floor 50%)
 * - 0.5% creator spread + 0.1% protocol fee on mint and burn
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
    uint256 public constant BUY_SELL_SPREAD = 50; // 0.5% creator spread in basis points
    uint256 public constant PROTOCOL_FEE = 10; // 0.1% protocol fee in basis points

    // ============ Immutables ============
    address public immutable override factory;
    address public immutable override creator;
    address public immutable protocolFeeRecipient; // Address receiving protocol fees
    uint256 public immutable basePrice; // Starting price in TON wei
    uint256 public immutable curveCoefficient; // Price increase rate

    // ============ Metadata ============
    string public tokenDescription;
    string public override imageUrl;

    // ============ State Variables ============
    uint256 public minReserveRatio; // In basis points (8000 = 80%)
    uint256 public override tonReserve; // Total TON locked in contract
    bool public redemptionsPaused; // True if reserve ratio too low
    bool private initialized; // For factory initial mint
    mapping(address => uint256) public override pendingFees; // Accrued fees per recipient
    uint256 public override totalAccruedFees; // Total unclaimed fees in contract

    // ============ Constructor ============
    /**
     * @notice Creates a new TON-backed token
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _creator Address of token creator
     * @param _basePrice Initial price per token in TON wei
     * @param _curveCoefficient Rate of price increase (scaled by 1e18)
     * @param _minReserveRatio Minimum reserve ratio in basis points
     * @param _description Token description (max 512 bytes)
     * @param _imageUrl Token image URL (max 256 bytes, must be non-empty)
     * @param _protocolFeeRecipient Address to receive protocol fees
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _creator,
        uint256 _basePrice,
        uint256 _curveCoefficient,
        uint256 _minReserveRatio,
        string memory _description,
        string memory _imageUrl,
        address _protocolFeeRecipient
    ) ERC20(_name, _symbol) {
        require(_creator != address(0), "Invalid creator");
        require(_basePrice > 0, "Base price must be > 0");
        require(_minReserveRatio >= MIN_RESERVE_RATIO_FLOOR, "Reserve ratio too low");
        require(_minReserveRatio <= MAX_RESERVE_RATIO, "Reserve ratio too high");
        require(bytes(_description).length <= 512, "Description too long");
        require(bytes(_imageUrl).length > 0, "Image URL required");
        require(bytes(_imageUrl).length <= 256, "Image URL too long");
        require(_protocolFeeRecipient != address(0), "Invalid protocol fee recipient");

        factory = msg.sender;
        creator = _creator;
        protocolFeeRecipient = _protocolFeeRecipient;
        basePrice = _basePrice;
        curveCoefficient = _curveCoefficient;
        minReserveRatio = _minReserveRatio;
        tokenDescription = _description;
        imageUrl = _imageUrl;
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
        return _calculatePriceAtSupply(totalSupply());
    }

    /**
     * @notice Get the current reserve ratio
     * @return Reserve ratio in basis points (10000 = 100%)
     * @dev Uses the bonding curve integral (actual cost basis) as the denominator,
     *      not supply × currentPrice, to avoid understating the ratio
     */
    function getReserveRatio() public view override returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return MAX_RESERVE_RATIO; // 100% when no supply
        }

        uint256 theoreticalValue = _integrateFromZero(supply);
        if (theoreticalValue == 0) {
            return MAX_RESERVE_RATIO;
        }

        uint256 ratio = (tonReserve * MAX_RESERVE_RATIO) / theoreticalValue;
        // Cap at 100% — above means overcollateralized
        if (ratio > MAX_RESERVE_RATIO) {
            return MAX_RESERVE_RATIO;
        }
        return ratio;
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
        effectivePrice = (tonAmount * PRECISION) / totalTokens;
    }

    /**
     * @notice Calculate TON returned for burning tokens
     * @param tokenAmount Amount of tokens to burn
     * @return tonAmount TON that would be returned (minus spread and protocol fee)
     * @return effectivePrice Average price per token for this sale
     */
    function calculateBurnReturn(uint256 tokenAmount) public view override returns (uint256 tonAmount, uint256 effectivePrice) {
        (tonAmount, effectivePrice, , ) = _calculateBurnReturn(tokenAmount);
    }

    /**
     * @notice Internal burn return calculation that also returns fee amounts
     * @param tokenAmount Amount of tokens to burn
     * @return tonAmount Net TON returned to the user after fees
     * @return effectivePrice Average price per token for this sale
     * @return spreadAmount Creator spread fee deducted
     * @return protocolAmount Protocol fee deducted
     */
    function _calculateBurnReturn(uint256 tokenAmount)
        internal
        view
        returns (uint256 tonAmount, uint256 effectivePrice, uint256 spreadAmount, uint256 protocolAmount)
    {
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

        // Apply fees
        spreadAmount = (totalTon * BUY_SELL_SPREAD) / MAX_RESERVE_RATIO;
        protocolAmount = (totalTon * PROTOCOL_FEE) / MAX_RESERVE_RATIO;
        tonAmount = totalTon - spreadAmount - protocolAmount;

        // Ensure we don't return more than reserve
        if (tonAmount > tonReserve) {
            tonAmount = tonReserve;
            spreadAmount = 0;
            protocolAmount = 0;
        }

        effectivePrice = tokenAmount > 0 ? (tonAmount * PRECISION) / tokenAmount : 0;
    }

    // ============ State-Changing Functions ============

    /**
     * @notice Mint tokens by depositing TON
     * @return tokenAmount Amount of tokens minted
     * @dev Deducts creator spread and protocol fee before calculating mint amount
     */
    function mint() external payable override nonReentrant whenNotPaused returns (uint256 tokenAmount) {
        require(msg.value > 0, "Must send TON");

        // Deduct fees
        uint256 spreadAmount = (msg.value * BUY_SELL_SPREAD) / MAX_RESERVE_RATIO;
        uint256 protocolAmount = (msg.value * PROTOCOL_FEE) / MAX_RESERVE_RATIO;
        uint256 depositAmount = msg.value - spreadAmount - protocolAmount;

        (uint256 tokens, ) = calculateMintAmount(depositAmount);
        require(tokens > 0, "Would mint 0 tokens");

        // Update state before external calls
        tonReserve += depositAmount;

        // Mint tokens to user
        _mint(msg.sender, tokens);

        // Check reserve ratio is healthy
        _checkAndUpdateRedemptionStatus();

        // Accrue fees (pull pattern)
        _accrueFees(spreadAmount, protocolAmount);

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

        // Ensure reserve ratio is healthy at creation
        require(getReserveRatio() >= minReserveRatio, "Initial reserve ratio too low");

        emit TokensMinted(recipient, msg.value, tokens, getCurrentPrice());

        return tokens;
    }

    /**
     * @notice Burn tokens to redeem TON
     * @param tokenAmount Amount of tokens to burn
     * @return tonAmount Amount of TON returned
     * @dev Subject to reserve ratio requirements, creator spread, and protocol fee
     */
    function burn(uint256 tokenAmount) external override nonReentrant whenNotPaused returns (uint256 tonAmount) {
        require(!redemptionsPaused, "Redemptions paused - low reserve");
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        (uint256 tonReturn, , uint256 spreadAmount, uint256 protocolAmount) = _calculateBurnReturn(tokenAmount);
        require(tonReturn > 0, "Would return 0 TON");

        uint256 totalDeduction = tonReturn + spreadAmount + protocolAmount;
        require(totalDeduction <= tonReserve, "Insufficient reserve");

        // Check that post-burn reserve ratio stays healthy
        uint256 postBurnSupply = totalSupply() - tokenAmount;
        if (postBurnSupply > 0) {
            uint256 postBurnReserve = tonReserve - totalDeduction;
            uint256 theoreticalValue = _integrateFromZero(postBurnSupply);

            if (theoreticalValue > 0) {
                uint256 postBurnRatio = (postBurnReserve * MAX_RESERVE_RATIO) / theoreticalValue;
                require(postBurnRatio >= minReserveRatio, "Would breach reserve ratio");
            }
        }

        // Update state before external calls
        tonReserve -= totalDeduction;
        _burn(msg.sender, tokenAmount);

        // Transfer TON to user
        (bool success, ) = payable(msg.sender).call{value: tonReturn}("");
        require(success, "TON transfer failed");

        // Accrue fees (pull pattern)
        _accrueFees(spreadAmount, protocolAmount);

        _checkAndUpdateRedemptionStatus();

        emit TokensBurned(msg.sender, tokenAmount, tonReturn, getCurrentPrice());

        return tonReturn;
    }

    // ============ Creator Functions ============

    /**
     * @notice Get token description
     * @return Token description string
     */
    function description() external view override returns (string memory) {
        return tokenDescription;
    }

    /**
     * @notice Update token metadata (creator only)
     * @param _description New description (max 512 bytes, can be empty)
     * @param _imageUrl New image URL (max 256 bytes, must be non-empty)
     */
    function updateMetadata(string calldata _description, string calldata _imageUrl) external override onlyCreator {
        require(bytes(_description).length <= 512, "Description too long");
        require(bytes(_imageUrl).length > 0, "Image URL required");
        require(bytes(_imageUrl).length <= 256, "Image URL too long");

        tokenDescription = _description;
        imageUrl = _imageUrl;

        emit ILaunchpadToken.MetadataUpdated(_description, _imageUrl);
    }

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
     * @dev Blocks both minting and burning. Use emergencyUnpause to resume.
     */
    function emergencyPause(string calldata reason) external onlyCreator {
        _pause();
        emit EmergencyPaused(msg.sender, reason);
    }

    /**
     * @notice Unpause after emergency (creator only)
     * @dev Requires reserve ratio to be at or above minReserveRatio before unpausing
     */
    function emergencyUnpause() external onlyCreator {
        require(getReserveRatio() >= minReserveRatio, "Reserve ratio too low");
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    // ============ Public Functions ============

    /**
     * @notice Withdraw accrued fees (creator spread or protocol fee)
     * @dev Callable by any address with a non-zero pendingFees balance.
     *      Uses pull pattern to prevent DoS via failed transfers.
     */
    function withdrawFees() external override nonReentrant {
        uint256 amount = pendingFees[msg.sender];
        require(amount > 0, "No fees to withdraw");

        pendingFees[msg.sender] = 0;
        totalAccruedFees -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Fee withdrawal failed");

        emit FeeWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Deposit additional TON to increase the reserve ratio
     * @dev Anyone can call this to help restore health.
     *      Deposited TON beyond the 100% ratio threshold cannot be withdrawn
     *      and is effectively a permanent donation to the reserve.
     */
    function depositReserve() external payable nonReentrant {
        require(msg.value > 0, "Must send TON");
        tonReserve += msg.value;
        _checkAndUpdateRedemptionStatus();
        emit ReserveDeposited(msg.sender, msg.value);
    }

    // ============ Internal Functions ============

    /**
     * @notice Accrue fees for later withdrawal (pull pattern)
     * @param spreadAmount Creator spread fee to accrue
     * @param protocolAmount Protocol fee to accrue
     */
    function _accrueFees(uint256 spreadAmount, uint256 protocolAmount) internal {
        if (spreadAmount > 0) {
            pendingFees[creator] += spreadAmount;
            totalAccruedFees += spreadAmount;
            emit FeeAccrued(creator, spreadAmount);
        }
        if (protocolAmount > 0) {
            pendingFees[protocolFeeRecipient] += protocolAmount;
            totalAccruedFees += protocolAmount;
            emit FeeAccrued(protocolFeeRecipient, protocolAmount);
        }
    }

    /**
     * @notice Calculate price at a given supply level
     * @param supply Token supply to evaluate the bonding curve at
     * @return Price in TON wei at the given supply
     * @dev P(supply) = basePrice + curveCoefficient × supply² / PRECISION²
     */
    function _calculatePriceAtSupply(uint256 supply) internal view returns (uint256) {
        if (supply == 0) {
            return basePrice;
        }
        uint256 curveComponent = (curveCoefficient * supply * supply) / (PRECISION * PRECISION);
        return basePrice + curveComponent;
    }

    /**
     * @notice Integrate bonding curve from 0 to supply (total cost basis)
     * @param supply Upper bound of the integration (token supply)
     * @return Total theoretical value in TON wei
     * @dev ∫₀ˢ P(s) ds = basePrice×S/PRECISION + curveCoefficient×S³/(3×PRECISION³)
     */
    function _integrateFromZero(uint256 supply) internal view returns (uint256) {
        if (supply == 0) return 0;
        uint256 basePart = (supply * basePrice) / PRECISION;
        uint256 curveComponent = (curveCoefficient * supply * supply) / (PRECISION * PRECISION);
        uint256 curvePart = (curveComponent * supply) / (3 * PRECISION);
        return basePart + curvePart;
    }

    /**
     * @notice Check reserve ratio and update redemption status
     * @dev Pauses redemptions (burns) if ratio drops below minReserveRatio,
     *      and unpauses them when ratio is restored. Does not affect minting.
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

    /// @notice Rejects direct TON transfers. Use mint() or depositReserve() instead.
    receive() external payable {
        revert("Use depositReserve()");
    }
}
