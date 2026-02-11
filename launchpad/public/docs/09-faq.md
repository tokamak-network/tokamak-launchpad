# FAQ

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
