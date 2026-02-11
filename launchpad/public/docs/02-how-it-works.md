# How It Works

## The Bonding Curve

Every token on the launchpad follows a **quadratic bonding curve** that determines its price:

```
Price = Base Price + (Curve Coefficient × Supply²)
```

- **Base Price** — The starting price when no tokens exist. Set by the creator at launch.
- **Curve Coefficient** — Controls how steeply the price rises as more tokens are minted. A higher coefficient means the price increases faster.
- **Supply** — The current total supply of tokens.

This means:
- **Buying tokens** increases the supply, which pushes the price **up**.
- **Selling (burning) tokens** decreases the supply, which pushes the price **down**.
- **Early buyers** get tokens at a lower price and benefit as demand grows.

## Token Lifecycle

```
1. Creator launches token  →  Sets parameters, deposits initial TON
2. Public minting          →  Anyone sends TON, receives tokens
3. Price rises with demand →  Bonding curve adjusts automatically
4. Trading                 →  Standard ERC-20 transfers between wallets
5. Selling / Redemption    →  Burn tokens to get TON back from the reserve
```
