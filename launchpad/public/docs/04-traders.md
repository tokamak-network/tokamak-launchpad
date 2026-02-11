# For Traders

## Buying Tokens (Minting)

Send TON to the token's `mint()` function. You'll receive tokens based on the current bonding curve price.

**What happens when you buy:**
1. A 0.5% creator spread and 0.1% protocol fee are deducted from your TON.
2. The remaining TON is added to the token's reserve.
3. Tokens are minted to your wallet based on the bonding curve price.
4. The price increases for the next buyer.

## Selling Tokens (Burning)

Call `burn()` with the number of tokens you want to sell. Your tokens are destroyed and you receive TON from the reserve.

**What happens when you sell:**
1. The bonding curve calculates the gross TON value of your tokens.
2. A 0.5% creator spread and 0.1% protocol fee are deducted.
3. The net TON is sent to your wallet.
4. The price decreases for subsequent trades.

**Important:** Selling may be temporarily paused if the reserve ratio drops below the minimum threshold. This protects all holders from under-collateralization.

## Transferring Tokens

All launchpad tokens are standard ERC-20 tokens. You can freely transfer them between wallets, use them in DeFi protocols, or trade them on DEXes — just like any other ERC-20 token.

## Price Preview

Before buying or selling, you can preview the outcome:
- `calculateMintAmount(tonAmount)` — Shows how many tokens you'd receive for a given TON deposit.
- `calculateBurnReturn(tokenAmount)` — Shows how much TON you'd receive for burning a given number of tokens.
