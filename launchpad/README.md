# TONLaunch

A permissionless token launchpad built on the Tokamak Network. Create bonding-curve ERC-20 tokens backed by TON — no order books or liquidity providers needed.

**Live on:** Thanos Sepolia testnet

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (install with `npm i -g pnpm`)
- A **WalletConnect** project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com))
- **Pinata** API keys for IPFS image uploads ([pinata.cloud](https://pinata.cloud))

### 1. Install dependencies

```bash
cd launchpad
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect project ID for RainbowKit |
| `PINATA_API_KEY` | Yes | Pinata API key for IPFS image uploads |
| `PINATA_SECRET_API_KEY` | Yes | Pinata secret key |
| `NEXT_PUBLIC_LAUNCHPAD_FACTORY` | No | Override factory address (defaults to Thanos Sepolia deployment) |
| `NEXT_PUBLIC_TON_VAULT` | No | Override TON vault address |

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
pnpm build
pnpm start
```

---

## Folder Structure

```
launchpad/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (fonts, providers, shell)
│   ├── page.tsx                # Home page (hero, how it works, docs CTA)
│   ├── globals.css             # Tailwind config, CSS variables, animations
│   ├── create/
│   │   └── page.tsx            # Create token form
│   ├── tokens/
│   │   └── page.tsx            # Token list / explore
│   ├── token/
│   │   └── [address]/
│   │       ├── page.tsx        # Token detail (trade, stats, history)
│   │       └── loading.tsx     # Loading skeleton
│   ├── docs/
│   │   └── page.tsx            # Documentation viewer
│   └── api/
│       └── upload/
│           ├── image/route.ts  # IPFS image upload via Pinata
│           └── metadata/route.ts
│
├── src/
│   ├── views/                  # Page-level view components
│   │   ├── Home.tsx            # Landing page with hero & token pills
│   │   ├── CreateToken.tsx     # Token creation form + deployment modal
│   │   ├── TokenList.tsx       # Explore tokens grid + floating bar
│   │   ├── TokenDetail.tsx     # Token profile, trade panel, history
│   │   └── Docs.tsx            # Markdown docs viewer with sidebar
│   │
│   ├── components/             # Reusable UI components
│   │   ├── Header.tsx          # Floating island header
│   │   ├── Shell.tsx           # Layout shell (header + main + theme toggle)
│   │   ├── BuySellForm.tsx     # Buy/sell trade form (side-by-side)
│   │   ├── CreatorManage.tsx   # Creator admin controls
│   │   ├── TokenCard.tsx       # Token grid card
│   │   ├── TokenPill.tsx       # Floating token pill (hero)
│   │   ├── TokenImage.tsx      # Token image with IPFS + fallback
│   │   ├── TokenHistory.tsx    # Recent trades table
│   │   ├── ChainGuard.tsx      # Wrong-chain warning banner
│   │   └── ThemeToggle.tsx     # Light/dark mode toggle
│   │
│   ├── hooks/                  # React hooks for contract interaction
│   │   ├── useLaunchpadFactory.ts  # Factory reads + createToken write
│   │   ├── useLaunchpadToken.ts    # Token reads + mint/burn writes
│   │   ├── useTokenHistory.ts      # Blockscout event log fetcher
│   │   └── useTxToast.ts           # Transaction toast notifications
│   │
│   ├── config/
│   │   ├── chains.ts           # Thanos Sepolia chain definition
│   │   └── contracts.ts        # Contract addresses + explorer URLs
│   │
│   ├── abis/                   # Contract ABIs (JSON)
│   │   ├── LaunchpadFactory.json
│   │   ├── LaunchpadToken.json
│   │   └── TONVault.json
│   │
│   ├── lib/
│   │   ├── format.ts           # formatTon, formatTokens, ipfsToGateway
│   │   └── ipfs.ts             # IPFS upload helpers
│   │
│   └── Providers.tsx           # Wagmi + RainbowKit + QueryClient setup
│
├── public/
│   ├── docs/                   # Markdown documentation files
│   │   ├── _meta.json          # Section manifest (order + titles)
│   │   ├── 01-overview.md
│   │   ├── 02-how-it-works.md
│   │   ├── 03-creators.md
│   │   ├── 04-traders.md
│   │   ├── 05-fees.md
│   │   ├── 06-reserve-safety.md
│   │   ├── 07-security.md
│   │   ├── 08-technical-reference.md
│   │   └── 09-faq.md
│   ├── default-token.png       # Fallback token image
│   ├── tokamak-symbol.svg      # Logo icon
│   └── tokamak-logotext.svg    # Logo with text
│
├── .env.example                # Environment variable template
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Typography plugin |
| Wallet | RainbowKit + Wagmi v2 |
| Chain | Viem (Thanos Sepolia) |
| State | TanStack React Query |
| IPFS | Pinata SDK |
| Markdown | react-markdown + remark-gfm |
| Notifications | Sonner |

---

## Smart Contracts

The frontend interacts with two contracts deployed on **Thanos Sepolia**:

| Contract | Address |
|---|---|
| LaunchpadFactory | `0xc2e17015d43E9D97C324ea297DF9e34b726146a8` |

View them on the [Thanos Sepolia Explorer](https://explorer.thanos-sepolia.tokamak.network).

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm dev:webpack` | Start dev server (Webpack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | Run ESLint |
