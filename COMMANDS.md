# TON-Backed Token Launchpad - Commands Reference

## Build Commands

| Command | Description |
|---------|-------------|
| `make build` | Compile all contracts |
| `make clean` | Remove build artifacts |

## Test Commands

| Command | Description |
|---------|-------------|
| `make test` | Run all tests |
| `make test-v` | Run tests with verbose output (-vvv) |
| `make test-vv` | Run tests with very verbose output (-vvvv) |
| `make test-gas` | Run tests with gas report |
| `make coverage` | Generate test coverage report |
| `make snapshot` | Generate gas snapshot |

## Local Development

| Command | Description |
|---------|-------------|
| `make anvil` | Start local Anvil node |
| `make deploy-local` | Deploy contracts to local Anvil |
| `make demo-local` | Run full token lifecycle demo on local |

## Thanos Sepolia Deployment

| Command | Description |
|---------|-------------|
| `make deploy-thanos` | Deploy and verify contracts on Thanos Sepolia |
| `make deploy-thanos-no-verify` | Deploy without verification |

> **Note:** Ensure `THANOS_SEPOLIA_RPC_URL` and `PRIVATE_KEY` are set in your `.env` file before deploying.

## Contract Verification

Use these commands if automatic verification fails or for manually deployed contracts:

| Command | Description |
|---------|-------------|
| `make verify-factory CONTRACT=<address>` | Verify LaunchpadFactory contract |
| `make verify-token CONTRACT=<address>` | Verify LaunchpadToken contract |
| `make verify-vault CONTRACT=<address>` | Verify TONVault contract |

### Example

```bash
make verify-factory CONTRACT=0x1234567890abcdef1234567890abcdef12345678
```

## Code Quality

| Command | Description |
|---------|-------------|
| `make fmt` | Format Solidity code |
| `make fmt-check` | Check code formatting without changes |
| `make slither` | Run Slither static analysis (requires slither installed) |

## Dependencies

| Command | Description |
|---------|-------------|
| `make install` | Install OpenZeppelin and forge-std |
| `make update` | Update all dependencies |

## Quick Start

```bash
# 1. Install dependencies
make install

# 2. Build contracts
make build

# 3. Run tests
make test

# 4. Start local node (in a separate terminal)
make anvil

# 5. Deploy locally
make deploy-local

# 6. Run demo
make demo-local
```

## Thanos Sepolia Deployment

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and RPC URL

# 2. Deploy and verify
make deploy-thanos
```

## Help

Run `make help` to see all available commands in the terminal.
