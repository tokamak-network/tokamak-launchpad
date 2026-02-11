"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import {
  useLaunchpadFactoryAllTokens,
  useLaunchpadFactoryTokensByCreator,
} from "../hooks/useLaunchpadFactory";
import { TokenCard } from "../components/TokenCard";

export function TokenList() {
  const { address } = useAccount();
  const { data: allTokens, isLoading, error } = useLaunchpadFactoryAllTokens();
  const { data: myTokens } = useLaunchpadFactoryTokensByCreator(address);

  const tokens = (allTokens as `0x${string}`[] | undefined) ?? [];
  const myTokensList = (myTokens as `0x${string}`[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28">
      {/* Token grid — main scrollable area */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="aspect-4/3 animate-pulse bg-gray-100 dark:bg-slate-800" />
              <div className="h-20 animate-pulse bg-gray-50 dark:bg-slate-800/50" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Failed to load. Switch to Thanos Sepolia.
        </p>
      )}

      {!isLoading && !error && tokens.length === 0 && (
        <p className="rounded-2xl border border-gray-200 p-12 text-center text-gray-500 dark:border-slate-700 dark:text-gray-400">
          No tokens yet.
        </p>
      )}

      {!isLoading && tokens.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((addr) => (
            <TokenCard
              key={addr}
              tokenAddress={addr}
              isCreator={address ? myTokensList.includes(addr) : false}
            />
          ))}
        </div>
      )}

      {/* Floating bottom island bar */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
              Explore Tokens
            </h1>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              Browse and trade launchpad tokens
              {!isLoading && tokens.length > 0 && (
                <span className="ml-1.5 text-gray-400 dark:text-gray-500">
                  · {tokens.length} token{tokens.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <Link
            href="/create"
            className="ml-4 shrink-0 rounded-lg bg-tokamak-blue px-5 py-2 text-sm font-medium text-white transition hover:bg-tokamak-blue-dark"
          >
            Launch a Token
          </Link>
        </div>
      </div>
    </div>
  );
}
