# For Token Creators

## Creating a Token

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

## Choosing Your Parameters

**Base Price** — This is the price of the very first token. A lower base price means tokens are cheap to start and the price grows over time. A higher base price means tokens start expensive.

**Curve Coefficient** — This controls how aggressively the price scales:
- **Gentle curve (e.g., 1e8):** Price increases slowly. Good for community tokens where you want broad participation.
- **Steep curve (e.g., 1e15):** Price increases rapidly. Early buyers benefit significantly. Better for scarce/premium tokens.
- **Zero (flat curve):** Price stays at the base price regardless of supply.

**Min Reserve Ratio** — The minimum percentage of the token's theoretical value that must be held in TON reserves. A higher ratio means stronger backing and more stable redemptions. Set between 50% and 100%.

## Creator Privileges

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
