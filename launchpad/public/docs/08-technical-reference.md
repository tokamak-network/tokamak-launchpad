# Technical Reference

## Contract Architecture

```
LaunchpadFactory (single deployment)
    |
    |-- createToken() --> deploys LaunchpadToken instances
    |
    +-- Token Registry (tracks all deployed tokens)

LaunchpadToken (one per token)
    |
    |-- Bonding Curve Engine (pricing)
    |-- TON Reserve (backing)
    |-- Fee Accounting (creator + protocol)
    +-- ERC-20 Standard (transfers, approvals)
```

## LaunchpadFactory

The factory is the entry point for creating tokens. It validates parameters, deploys a new `LaunchpadToken` contract, registers it in the on-chain registry, and performs the initial mint.

**Key Functions:**

| Function | Description |
|---|---|
| `createToken(...)` | Create a new token with the specified parameters. Requires `creationFee + initialDeposit` as msg.value. |
| `getAllTokens()` | Returns all deployed token addresses. |
| `getTokensByCreator(address)` | Returns tokens created by a specific address. |
| `getTokenBySymbol(string)` | Look up a token by its symbol (case-sensitive). |
| `getTokensPaginated(offset, limit)` | Paginated token list for efficient querying. |
| `calculateCreationCost(initialMintAmount)` | Preview total TON needed to create a token. |

**Admin Functions (Platform Owner):**

| Function | Description |
|---|---|
| `setCreationFee(newFee)` | Update the token creation fee. |
| `setFeeRecipient(address)` | Update the fee recipient address. |
| `withdrawFees()` | Withdraw accumulated creation fees. |

## LaunchpadToken

Each launched token is an independent `LaunchpadToken` contract with its own reserve, bonding curve, and fee accounting.

**Read Functions:**

| Function | Returns |
|---|---|
| `getCurrentPrice()` | Current price per token in TON wei |
| `getReserveRatio()` | Reserve ratio in basis points (10000 = 100%) |
| `tonReserve()` | Total TON in the reserve |
| `totalSupply()` | Total token supply |
| `calculateMintAmount(tonAmount)` | Tokens received and effective price for a given TON deposit |
| `calculateBurnReturn(tokenAmount)` | TON returned and effective price for burning tokens |
| `pendingFees(address)` | Unclaimed fee balance for an address |
| `totalAccruedFees()` | Total unclaimed fees in the contract |
| `creator()` | Token creator address |
| `description()` | Token description |
| `imageUrl()` | Token image URL |

**User Functions:**

| Function | Description |
|---|---|
| `mint()` | Send TON (as msg.value) to buy tokens |
| `burn(tokenAmount)` | Sell tokens back for TON |
| `withdrawFees()` | Claim accrued fees (for creator or protocol recipient) |
| `depositReserve()` | Donate TON to the reserve to improve the ratio |
| `transfer(to, amount)` | Standard ERC-20 transfer |
| `approve(spender, amount)` | Standard ERC-20 approval |

**Creator Functions:**

| Function | Description |
|---|---|
| `updateMetadata(description, imageUrl)` | Update token description and image |
| `updateMinReserveRatio(newRatio)` | Increase the minimum reserve ratio (cannot decrease) |
| `emergencyPause(reason)` | Pause all minting and burning |
| `emergencyUnpause()` | Resume operations (requires healthy reserve ratio) |

## Constants

| Constant | Value | Description |
|---|---|---|
| `BUY_SELL_SPREAD` | 50 (0.5%) | Creator fee on every trade |
| `PROTOCOL_FEE` | 10 (0.1%) | Protocol fee on every trade |
| `MIN_RESERVE_RATIO_FLOOR` | 5000 (50%) | Lowest allowed reserve ratio setting |
| `MAX_RESERVE_RATIO` | 10000 (100%) | Maximum reserve ratio |
| `MIN_BASE_PRICE` | 1e12 | Minimum base price (~0.000001 TON) |
| `MAX_BASE_PRICE` | 1e24 | Maximum base price (~1,000,000 TON) |
| `MAX_CURVE_COEFFICIENT` | 1e18 | Maximum curve steepness |
| `MIN_INITIAL_MINT` | 1e15 | Minimum initial deposit (~0.001 TON) |

## Events

**LaunchpadFactory:**

| Event | When |
|---|---|
| `TokenCreated(token, creator, name, symbol, ...)` | New token is launched |
| `CreationFeeUpdated(oldFee, newFee)` | Creation fee is changed |
| `FeeRecipientUpdated(oldRecipient, newRecipient)` | Fee recipient is changed |
| `FeesWithdrawn(recipient, amount)` | Creation fees are withdrawn |

**LaunchpadToken:**

| Event | When |
|---|---|
| `TokensMinted(user, tonDeposited, tokensMinted, newPrice)` | Tokens are bought |
| `TokensBurned(user, tokensBurned, tonReturned, newPrice)` | Tokens are sold |
| `ReserveRatioUpdated(oldRatio, newRatio)` | Min reserve ratio is changed |
| `EmergencyPaused(by, reason)` | Token is paused |
| `EmergencyUnpaused(by)` | Token is unpaused |
| `MetadataUpdated(description, imageUrl)` | Metadata is updated |
| `ReserveDeposited(depositor, amount)` | TON donated to reserve |
| `FeeAccrued(recipient, amount)` | Fee credited to recipient |
| `FeeWithdrawn(recipient, amount)` | Fee claimed by recipient |
