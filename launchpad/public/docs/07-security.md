# Security

## Smart Contract Safety

- **Reentrancy protection** on all functions that move funds.
- **No admin minting** — even the creator cannot mint tokens without depositing TON.
- **Reserve ratio checks** on every mint and burn to prevent under-collateralization.
- **Pull pattern** for fee withdrawals — fees accumulate and are claimed by recipients, preventing DoS attacks.
- **Emergency pause** allows the creator to halt operations if needed.

## What the Platform Cannot Do

- Cannot access or drain token reserves.
- Cannot mint tokens on any launched token.
- Cannot modify token parameters after creation.
- Cannot prevent users from withdrawing their fees.
