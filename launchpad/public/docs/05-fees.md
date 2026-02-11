# Fees

| Fee | Rate | Recipient | When |
|---|---|---|---|
| **Creator Spread** | 0.5% | Token creator | Every mint and burn |
| **Protocol Fee** | 0.1% | Platform | Every mint and burn |
| **Token Creation Fee** | 10 TON | Platform | One-time at token creation |

- Fees are calculated on the TON amount (before deposit for mints, before payout for burns).
- Creator and protocol fees accumulate in the token contract and are withdrawn separately via `withdrawFees()`.
- The creation fee accumulates in the factory contract and is withdrawn by the platform.
