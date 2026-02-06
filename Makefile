# Include .env file if it exists
-include .env

# Default target
.PHONY: all
all: build

# ============ Build ============

.PHONY: build
build:
	forge build

.PHONY: clean
clean:
	forge clean

# ============ Test ============

.PHONY: test
test:
	forge test

.PHONY: test-v
test-v:
	forge test -vvv

.PHONY: test-vv
test-vv:
	forge test -vvvv

.PHONY: test-gas
test-gas:
	forge test --gas-report

.PHONY: coverage
coverage:
	forge coverage

.PHONY: snapshot
snapshot:
	forge snapshot

# ============ Local Development ============

.PHONY: anvil
anvil:
	anvil

.PHONY: deploy-local
deploy-local:
	forge script script/Deploy.s.sol:DeployLocalScript --rpc-url http://localhost:8545 --broadcast

.PHONY: demo-local
demo-local:
	forge script script/DemoLifecycle.s.sol:DemoLifecycleScript --rpc-url http://localhost:8545 --broadcast

# ============ Thanos Sepolia Deployment ============

.PHONY: deploy-thanos
deploy-thanos:
	forge script script/Deploy.s.sol:DeployScript \
		--rpc-url $(THANOS_SEPOLIA_RPC_URL) \
		--broadcast \
		--verify \
		--verifier blockscout \
		--verifier-url 'https://explorer.thanos-sepolia.tokamak.network/api/' \
		-vvvv

.PHONY: deploy-thanos-no-verify
deploy-thanos-no-verify:
	forge script script/Deploy.s.sol:DeployScript \
		--rpc-url $(THANOS_SEPOLIA_RPC_URL) \
		--broadcast \
		-vvvv

# ============ Verification ============

.PHONY: verify
verify:
	@echo "Usage:"
	@echo "  make verify-factory CONTRACT=<address>"
	@echo "  make verify-token CONTRACT=<address>"
	@echo "  make verify-vault CONTRACT=<address>"

.PHONY: verify-factory
verify-factory:
	forge verify-contract \
		--rpc-url https://rpc.thanos-sepolia.tokamak.network \
		--verifier blockscout \
		--verifier-url 'https://explorer.thanos-sepolia.tokamak.network/api/' \
		$(CONTRACT) \
		contracts/LaunchpadFactory.sol:LaunchpadFactory

.PHONY: verify-token
verify-token:
	forge verify-contract \
		--rpc-url https://rpc.thanos-sepolia.tokamak.network \
		--verifier blockscout \
		--verifier-url 'https://explorer.thanos-sepolia.tokamak.network/api/' \
		$(CONTRACT) \
		contracts/LaunchpadToken.sol:LaunchpadToken

.PHONY: verify-vault
verify-vault:
	forge verify-contract \
		--rpc-url https://rpc.thanos-sepolia.tokamak.network \
		--verifier blockscout \
		--verifier-url 'https://explorer.thanos-sepolia.tokamak.network/api/' \
		$(CONTRACT) \
		contracts/TONVault.sol:TONVault

# ============ Utilities ============

.PHONY: fmt
fmt:
	forge fmt

.PHONY: fmt-check
fmt-check:
	forge fmt --check

.PHONY: slither
slither:
	slither . --config-file slither.config.json

.PHONY: install
install:
	forge install OpenZeppelin/openzeppelin-contracts --no-commit
	forge install foundry-rs/forge-std --no-commit

.PHONY: update
update:
	forge update

# ============ Help ============

.PHONY: help
help:
	@echo "TON-Backed Token Launchpad - Makefile Commands"
	@echo ""
	@echo "Build:"
	@echo "  make build          - Compile contracts"
	@echo "  make clean          - Clean build artifacts"
	@echo ""
	@echo "Test:"
	@echo "  make test           - Run tests"
	@echo "  make test-v         - Run tests with verbose output"
	@echo "  make test-vv        - Run tests with very verbose output"
	@echo "  make test-gas       - Run tests with gas report"
	@echo "  make coverage       - Generate coverage report"
	@echo ""
	@echo "Local Development:"
	@echo "  make anvil          - Start local Anvil node"
	@echo "  make deploy-local   - Deploy to local Anvil"
	@echo "  make demo-local     - Run demo lifecycle on local"
	@echo ""
	@echo "Thanos Sepolia:"
	@echo "  make deploy-thanos           - Deploy and verify on Thanos Sepolia"
	@echo "  make deploy-thanos-no-verify - Deploy without verification"
	@echo ""
	@echo "Manual Verification (if needed):"
	@echo "  make verify-factory CONTRACT=<address> - Verify LaunchpadFactory"
	@echo "  make verify-token CONTRACT=<address>   - Verify LaunchpadToken"
	@echo "  make verify-vault CONTRACT=<address>   - Verify TONVault"
	@echo ""
	@echo "Utilities:"
	@echo "  make fmt            - Format code"
	@echo "  make install        - Install dependencies"
	@echo "  make update         - Update dependencies"
