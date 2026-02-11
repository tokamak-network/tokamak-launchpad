"use client";

import Link from "next/link";
import type { Address } from "viem";
import { useLaunchpadToken } from "../hooks/useLaunchpadToken";
import { formatTon } from "../lib/format";
import { TokenImage } from "./TokenImage";

export function TokenCard({
  tokenAddress,
  isCreator,
}: {
  tokenAddress: Address;
  isCreator: boolean;
}) {
  const { name, symbol, imageUrl, getCurrentPrice, getReserveRatio } =
    useLaunchpadToken(tokenAddress);

  const nameStr = name.data as string | undefined;
  const symbolStr = symbol.data as string | undefined;
  const imageUrlStr = imageUrl.data as string | undefined;
  const price = getCurrentPrice.data as bigint | undefined;
  const ratio = getReserveRatio.data as bigint | undefined;
  const loading = name.isLoading || symbol.isLoading;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="aspect-4/3 animate-pulse bg-gray-100 dark:bg-slate-800" />
        <div className="p-4">
          <div className="h-5 w-28 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-16 animate-pulse rounded bg-gray-50 dark:bg-slate-800" />
          <div className="mt-3 flex gap-2">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-50 dark:bg-slate-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-50 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/token/${tokenAddress}`}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-tokamak-blue hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-50 dark:bg-slate-800">
        <TokenImage
          src={imageUrlStr}
          alt={nameStr ?? "Token"}
          className="object-cover transition group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {isCreator && (
          <span className="absolute right-2 top-2 rounded-md bg-tokamak-blue/90 px-2 py-0.5 text-xs font-medium text-white">
            Yours
          </span>
        )}
      </div>
      <div className="p-4">
        <h2 className="truncate font-semibold text-gray-900 dark:text-gray-100">
          {nameStr ?? "—"}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {symbolStr ?? "—"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {price !== undefined && (
            <span className="font-medium text-tokamak-blue">
              {formatTon(price)} TON
            </span>
          )}
          {ratio !== undefined && (
            <span className="text-gray-500 dark:text-gray-400">
              {(Number(ratio) / 100).toFixed(0)}% reserve
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
