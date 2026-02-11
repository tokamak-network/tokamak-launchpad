// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ILaunchpadToken
 * @notice Interface for TON-backed launchpad tokens with bonding curve pricing
 */
interface ILaunchpadToken is IERC20 {
    // ============ Events ============

    /// @notice Emitted when tokens are minted via TON deposit
    event TokensMinted(address indexed user, uint256 tonDeposited, uint256 tokensMinted, uint256 newPrice);

    /// @notice Emitted when tokens are burned for TON redemption
    event TokensBurned(address indexed user, uint256 tokensBurned, uint256 tonReturned, uint256 newPrice);

    /// @notice Emitted when the minimum reserve ratio is updated by the creator
    event ReserveRatioUpdated(uint256 oldRatio, uint256 newRatio);

    /// @notice Emitted when the creator triggers an emergency pause
    event EmergencyPaused(address indexed by, string reason);

    /// @notice Emitted when the creator lifts an emergency pause
    event EmergencyUnpaused(address indexed by);

    /// @notice Emitted when token metadata (description or image URL) is updated
    event MetadataUpdated(string description, string imageUrl);

    /// @notice Emitted when additional TON is deposited to the reserve
    event ReserveDeposited(address indexed depositor, uint256 amount);

    /// @notice Emitted when fees are accrued to a recipient's pending balance
    event FeeAccrued(address indexed recipient, uint256 amount);

    /// @notice Emitted when a recipient withdraws their accrued fees
    event FeeWithdrawn(address indexed recipient, uint256 amount);

    // ============ View Functions ============

    /// @notice Get pending fee balance for a given account
    function pendingFees(address account) external view returns (uint256);

    /// @notice Get total unclaimed fees held in the contract
    function totalAccruedFees() external view returns (uint256);

    /// @notice Get current token price based on the bonding curve
    function getCurrentPrice() external view returns (uint256);

    /// @notice Get current reserve ratio in basis points (10000 = 100%)
    function getReserveRatio() external view returns (uint256);

    /// @notice Get total TON held in the reserve
    function tonReserve() external view returns (uint256);

    /// @notice Calculate tokens received for a given TON deposit
    function calculateMintAmount(uint256 tonAmount) external view returns (uint256 tokenAmount, uint256 effectivePrice);

    /// @notice Calculate TON returned for burning a given amount of tokens
    function calculateBurnReturn(uint256 tokenAmount) external view returns (uint256 tonAmount, uint256 effectivePrice);

    /// @notice Get the token creator address
    function creator() external view returns (address);

    /// @notice Get the factory address that deployed this token
    function factory() external view returns (address);

    /// @notice Get the token description
    function description() external view returns (string memory);

    /// @notice Get the token image URL
    function imageUrl() external view returns (string memory);

    // ============ State-Changing Functions ============

    /// @notice Mint tokens by sending TON (msg.value)
    function mint() external payable returns (uint256 tokenAmount);

    /// @notice Burn tokens to redeem TON from the reserve
    function burn(uint256 tokenAmount) external returns (uint256 tonAmount);

    /// @notice Withdraw accrued fees (callable by any address with pending fees)
    function withdrawFees() external;

    // ============ Creator Functions ============

    /// @notice Increase the minimum reserve ratio (creator only, can never decrease)
    function updateMinReserveRatio(uint256 newRatio) external;

    /// @notice Update token description and image URL (creator only)
    function updateMetadata(string calldata _description, string calldata _imageUrl) external;
}
