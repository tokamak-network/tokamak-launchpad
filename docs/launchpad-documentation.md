# TON-Backed Token Launchpad

## Overview

The TON-Backed Token Launchpad is a permissionless platform for creating and trading ERC-20 tokens on the Tokamak Network. Every token launched through the platform is backed by TON reserves and priced using an automated bonding curve — no order books, no liquidity providers needed.

Anyone can create a token. Anyone can buy or sell. The price adjusts automatically based on supply and demand.

---

## How It Works

### The Bonding Curve

Every token on the launchpad follows a **quadratic bonding curve** that determines its price:

```
Price = Base Price + (Curve Coefficient x Supply^2)
```

- **Base Price** — The starting price when no tokens exist. Set by the creator at launch.
- **Curve Coefficient** — Controls how steeply the price rises as more tokens are minted. A higher coefficient means the price increases faster.
- **Supply** — The current total supply of tokens.

This means:
- **Buying tokens** increases the supply, which pushes the price **up**.
- **Selling (burning) tokens** decreases the supply, which pushes the price **down**.
- **Early buyers** get tokens at a lower price and benefit as demand grows.

### Token Lifecycle

```
1. Creator launches token  -->  Sets parameters, deposits initial TON
2. Public minting          -->  Anyone sends TON, receives tokens
3. Price rises with demand -->  Bonding curve adjusts automatically
4. Trading                 -->  Standard ERC-20 transfers between wallets
5. Selling / Redemption    -->  Burn tokens to get TON back from the reserve
```

---

## For Token Creators

### Creating a Token

To launch a token, you need to provide:

| Parameter | Description | Constraints |
|---|---|---|
| **Name** | Your token's display name | 1–64 characters |
| **Symbol** | Ticker symbol (must be unique) | 1–16 characters, case-sensitive |
| **Base Price** | Starting price per token in TON | 0.000001 – 1,000,000 TON |
| **Curve Coefficient** | How fast the price increases | 0 – 1e18 |
| **Min Reserve Ratio** | Minimum TON backing percentage | 50% – 100% |
| **Description** | About your token | Up to 512 characters |
| **Image URL** | Token logo/image | Up to 256 characters, required |

**Cost to create:** 10 TON creation fee + your initial TON deposit (minimum 0.001 TON).

The initial deposit goes directly into your token's reserve, and you receive the first minted tokens at the base price.

### Choosing Your Parameters

**Base Price** — This is the price of the very first token. A lower base price means tokens are cheap to start and the price grows over time. A higher base price means tokens start expensive.

**Curve Coefficient** — This controls how aggressively the price scales:
- **Gentle curve (e.g., 1e8):** Price increases slowly. Good for community tokens where you want broad participation.
- **Steep curve (e.g., 1e15):** Price increases rapidly. Early buyers benefit significantly. Better for scarce/premium tokens.
- **Zero (flat curve):** Price stays at the base price regardless of supply.

**Min Reserve Ratio** — The minimum percentage of the token's theoretical value that must be held in TON reserves. A higher ratio means stronger backing and more stable redemptions. Set between 50% and 100%.

### Creator Privileges

As a token creator, you can:
- **Update metadata** — Change the description and image URL at any time.
- **Increase the reserve ratio** — Raise the minimum backing requirement (can never lower it).
- **Emergency pause** — Temporarily halt all minting and burning if something goes wrong.
- **Earn fees** — Receive 0.5% of every buy and sell as a creator spread.

You **cannot**:
- Mint tokens for free (no admin minting).
- Drain the reserve.
- Lower the reserve ratio.
- Control who can buy or sell.

---

## For Traders

### Buying Tokens (Minting)

Send TON to the token's `mint()` function. You'll receive tokens based on the current bonding curve price.

**What happens when you buy:**
1. A 0.5% creator spread and 0.1% protocol fee are deducted from your TON.
2. The remaining TON is added to the token's reserve.
3. Tokens are minted to your wallet based on the bonding curve price.
4. The price increases for the next buyer.

### Selling Tokens (Burning)

Call `burn()` with the number of tokens you want to sell. Your tokens are destroyed and you receive TON from the reserve.

**What happens when you sell:**
1. The bonding curve calculates the gross TON value of your tokens.
2. A 0.5% creator spread and 0.1% protocol fee are deducted.
3. The net TON is sent to your wallet.
4. The price decreases for subsequent trades.

**Important:** Selling may be temporarily paused if the reserve ratio drops below the minimum threshold. This protects all holders from under-collateralization.

### Transferring Tokens

All launchpad tokens are standard ERC-20 tokens. You can freely transfer them between wallets, use them in DeFi protocols, or trade them on DEXes — just like any other ERC-20 token.

### Price Preview

Before buying or selling, you can preview the outcome:
- `calculateMintAmount(tonAmount)` — Shows how many tokens you'd receive for a given TON deposit.
- `calculateBurnReturn(tokenAmount)` — Shows how much TON you'd receive for burning a given number of tokens.

---

## Fees

| Fee | Rate | Recipient | When |
|---|---|---|---|
| **Creator Spread** | 0.5% | Token creator | Every mint and burn |
| **Protocol Fee** | 0.1% | Platform | Every mint and burn |
| **Token Creation Fee** | 10 TON | Platform | One-time at token creation |

- Fees are calculated on the TON amount (before deposit for mints, before payout for burns).
- Creator and protocol fees accumulate in the token contract and are withdrawn separately via `withdrawFees()`.
- The creation fee accumulates in the factory contract and is withdrawn by the platform.

---

## Reserve Ratio & Safety

### What is the Reserve Ratio?

The reserve ratio measures how well-backed a token is:

```
Reserve Ratio = TON in Reserve / Total Theoretical Value of All Tokens
```

A ratio of 100% means the reserve holds enough TON to buy back every token at its integrated bonding curve price. A ratio below 100% means partial backing.

### Minimum Reserve Ratio

Each token has a minimum reserve ratio (set at creation, 50%–100%). This acts as a safety floor:

- **If the ratio drops below the minimum:** Selling (burning) is automatically paused to prevent further reserve depletion. Buying is still allowed, which helps restore the ratio.
- **When the ratio recovers:** Selling is automatically re-enabled.

### Restoring the Reserve

If a token's reserve ratio is unhealthy, anyone can call `depositReserve()` to add TON directly to the reserve without minting new tokens. This raises the ratio and can re-enable selling.

---

## Security

### Smart Contract Safety
- **Reentrancy protection** on all functions that move funds.
- **No admin minting** — even the creator cannot mint tokens without depositing TON.
- **Reserve ratio checks** on every mint and burn to prevent under-collateralization.
- **Pull pattern** for fee withdrawals — fees accumulate and are claimed by recipients, preventing DoS attacks.
- **Emergency pause** allows the creator to halt operations if needed.

### What the Platform Cannot Do
- Cannot access or drain token reserves.
- Cannot mint tokens on any launched token.
- Cannot modify token parameters after creation.
- Cannot prevent users from withdrawing their fees.

---

## Technical Reference

### Contract Architecture

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

### LaunchpadFactory

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

### LaunchpadToken

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

### Constants

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

### Events

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

---

## FAQ

**Can I lose my TON?**
Your TON is held in the token's smart contract reserve. You can always burn your tokens to get TON back, as long as selling isn't paused due to a low reserve ratio.

**Why can't I sell my tokens?**
Selling is paused when the reserve ratio drops below the token's minimum threshold. This is a safety mechanism. Once the ratio recovers (through new mints or reserve deposits), selling is automatically re-enabled.

**Who controls my token after creation?**
You (the creator) can update metadata, increase the reserve ratio, and pause/unpause. You cannot mint free tokens, drain reserves, or lower the reserve ratio. The platform has no control over your token.

**Can the same symbol be used twice?**
No. Each symbol must be unique across the platform. Symbol matching is case-sensitive ("TOK" and "tok" are different).

**What happens to fees?**
Creator fees (0.5%) accumulate in the token contract and can be withdrawn by the creator at any time. Protocol fees (0.1%) accumulate similarly and are withdrawn by the platform. The 10 TON creation fee is held in the factory contract.

**Is the code audited?**
The contracts are built on OpenZeppelin's battle-tested libraries (ERC20, ReentrancyGuard, Pausable, Ownable) and include comprehensive protections against common vulnerabilities. The source code is open and verifiable on-chain.
