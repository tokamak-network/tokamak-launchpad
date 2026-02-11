"use client";

import dynamic from "next/dynamic";

/* We use dynamic imports with ssr:false inside this Client Component to ensure
   wagmi/RainbowKit (which internally use Set/Map objects) are never serialised
   across the RSC → Client Component boundary. This eliminates the
   "Set objects are not supported" console warning. */

const Providers = dynamic(() => import("./Providers").then((m) => m.Providers), {
  ssr: false,
});

const Shell = dynamic(() => import("./components/Shell").then((m) => m.Shell), {
  ssr: false,
});

export function ClientApp({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}
