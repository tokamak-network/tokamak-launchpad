"use client";

import Link from "next/link";
import type { Address } from "viem";
import { useLaunchpadToken } from "../hooks/useLaunchpadToken";
import { TokenImage } from "./TokenImage";

/** Compact floating pill — icon + symbol. */
export function TokenPill({ tokenAddress }: { tokenAddress: Address }) {
  const { name, symbol, imageUrl } = useLaunchpadToken(tokenAddress);

  const nameStr = name.data as string | undefined;
  const symbolStr = symbol.data as string | undefined;
  const imageUrlStr = imageUrl.data as string | undefined;
  const loading = name.isLoading || symbol.isLoading;

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-12 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  return (
    <Link
      href={`/token/${tokenAddress}`}
      className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/15"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
        <TokenImage
          src={imageUrlStr}
          alt={nameStr ?? "Token"}
          sizes="40px"
          className="object-cover"
        />
      </div>
      <span className="text-base font-medium text-white">{symbolStr ?? "—"}</span>
    </Link>
  );
}
