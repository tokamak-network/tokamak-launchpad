"use client";

import { useState } from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { thanosSepolia } from "./config/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID";

function createConfig() {
  return getDefaultConfig({
    appName: "TONLaunch",
    projectId,
    chains: [thanosSepolia],
    ssr: false,
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  /* Lazy-init so wagmi config (which contains Set/Map internally)
     is only created on the client, never serialised across RSC boundary. */
  const [config] = useState(createConfig);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={thanosSepolia}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
