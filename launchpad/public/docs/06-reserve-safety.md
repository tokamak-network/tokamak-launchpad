# Reserve Ratio & Safety

## What is the Reserve Ratio?

The reserve ratio measures how well-backed a token is:

```
Reserve Ratio = TON in Reserve / Total Theoretical Value of All Tokens
```

A ratio of 100% means the reserve holds enough TON to buy back every token at its integrated bonding curve price. A ratio below 100% means partial backing.

## Minimum Reserve Ratio

Each token has a minimum reserve ratio (set at creation, 50%–100%). This acts as a safety floor:

- **If the ratio drops below the minimum:** Selling (burning) is automatically paused to prevent further reserve depletion. Buying is still allowed, which helps restore the ratio.
- **When the ratio recovers:** Selling is automatically re-enabled.

## Restoring the Reserve

If a token's reserve ratio is unhealthy, anyone can call `depositReserve()` to add TON directly to the reserve without minting new tokens. This raises the ratio and can re-enable selling.
