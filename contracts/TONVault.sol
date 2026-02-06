// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TONVault
 * @notice Central vault for managing TON reserves across all launchpad tokens
 * @dev Provides additional security layer and reserve tracking
 *
 * ARCHITECTURE:
 * - Each LaunchpadToken has its own reserve tracked here
 * - Vault holds all TON centrally but accounting is per-token
 * - Only authorized tokens can deposit/withdraw their reserves
 *
 * SECURITY:
 * - ReentrancyGuard on all state-changing functions
 * - Only registered tokens can interact
 * - Transparent reserve tracking per token
 */
contract TONVault is ReentrancyGuard, Ownable {
    // ============ State Variables ============
    address public factory;
    mapping(address => uint256) public tokenReserves;
    mapping(address => bool) public authorizedTokens;
    uint256 public totalReserves;

    // ============ Events ============
    event TokenAuthorized(address indexed token);
    event TokenDeauthorized(address indexed token);
    event Deposited(address indexed token, uint256 amount, uint256 newReserve);
    event Withdrawn(address indexed token, address indexed to, uint256 amount, uint256 newReserve);
    event FactoryUpdated(address oldFactory, address newFactory);

    // ============ Modifiers ============
    modifier onlyAuthorized() {
        require(authorizedTokens[msg.sender], "Not authorized");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    // ============ Constructor ============
    constructor() Ownable(msg.sender) {}

    // ============ Factory Functions ============

    /**
     * @notice Set the factory address (only owner, once)
     */
    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "Invalid factory");
        address oldFactory = factory;
        factory = _factory;
        emit FactoryUpdated(oldFactory, _factory);
    }

    /**
     * @notice Authorize a token to use the vault (factory only)
     */
    function authorizeToken(address token) external onlyFactory {
        require(token != address(0), "Invalid token");
        require(!authorizedTokens[token], "Already authorized");
        authorizedTokens[token] = true;
        emit TokenAuthorized(token);
    }

    // ============ Token Functions ============

    /**
     * @notice Deposit TON for a token's reserve
     */
    function deposit() external payable onlyAuthorized nonReentrant {
        require(msg.value > 0, "Must send TON");

        tokenReserves[msg.sender] += msg.value;
        totalReserves += msg.value;

        emit Deposited(msg.sender, msg.value, tokenReserves[msg.sender]);
    }

    /**
     * @notice Withdraw TON from a token's reserve
     * @param to Address to send TON to
     * @param amount Amount to withdraw
     */
    function withdraw(address to, uint256 amount) external onlyAuthorized nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(tokenReserves[msg.sender] >= amount, "Insufficient reserve");

        tokenReserves[msg.sender] -= amount;
        totalReserves -= amount;

        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, to, amount, tokenReserves[msg.sender]);
    }

    // ============ View Functions ============

    /**
     * @notice Get reserve for a specific token
     */
    function getReserve(address token) external view returns (uint256) {
        return tokenReserves[token];
    }

    /**
     * @notice Check if a token is authorized
     */
    function isAuthorized(address token) external view returns (bool) {
        return authorizedTokens[token];
    }

    /**
     * @notice Get total reserves across all tokens
     */
    function getTotalReserves() external view returns (uint256) {
        return totalReserves;
    }

    // ============ Admin Functions ============

    /**
     * @notice Emergency deauthorize a token (owner only)
     * @dev Use with caution - only for malicious tokens
     */
    function deauthorizeToken(address token) external onlyOwner {
        require(authorizedTokens[token], "Not authorized");
        authorizedTokens[token] = false;
        emit TokenDeauthorized(token);
    }

    // ============ Receive ============
    receive() external payable {
        revert("Use deposit()");
    }
}
