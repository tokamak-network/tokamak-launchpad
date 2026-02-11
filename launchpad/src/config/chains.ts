import { defineChain } from "viem";

export const thanosSepolia = defineChain({
  id: 111551119090,
  name: "Thanos Sepolia",
  nativeCurrency: { name: "TON", symbol: "TON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.thanos-sepolia.tokamak.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Thanos Sepolia Explorer",
      url: "https://explorer.thanos-sepolia.tokamak.network",
    },
  },
});
