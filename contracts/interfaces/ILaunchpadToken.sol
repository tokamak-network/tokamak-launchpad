// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ILaunchpadToken
 * @notice Interface for TON-backed launchpad tokens
 */
interface ILaunchpadToken is IERC20 {
    // Events
    event TokensMinted(address indexed user, uint256 tonDeposited, uint256 tokensMinted, uint256 newPrice);
    event TokensBurned(address indexed user, uint256 tokensBurned, uint256 tonReturned, uint256 newPrice);
    event ReserveRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event EmergencyPaused(address indexed by, string reason);
    event EmergencyUnpaused(address indexed by);

    // View functions
    function getCurrentPrice() external view returns (uint256);
    function getReserveRatio() external view returns (uint256);
    function getTonReserve() external view returns (uint256);
    function calculateMintAmount(uint256 tonAmount) external view returns (uint256 tokenAmount, uint256 effectivePrice);
    function calculateBurnReturn(uint256 tokenAmount) external view returns (uint256 tonAmount, uint256 effectivePrice);
    function creator() external view returns (address);
    function factory() external view returns (address);

    // State-changing functions
    function mint() external payable returns (uint256 tokenAmount);
    function burn(uint256 tokenAmount) external returns (uint256 tonAmount);

    // Admin functions (creator only)
    function updateMinReserveRatio(uint256 newRatio) external;
}
