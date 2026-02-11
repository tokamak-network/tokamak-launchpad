"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Abi, Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import {
  useLaunchpadFactoryAllTokens,
  useLaunchpadFactoryTokensByCreator,
} from "../hooks/useLaunchpadFactory";
import { TokenCard } from "../components/TokenCard";
import launchpadTokenAbi from "../abis/LaunchpadToken.json";

const abi = launchpadTokenAbi as Abi;

export function TokenList() {
  const { address } = useAccount();
  const { data: allTokens, isLoading, error } = useLaunchpadFactoryAllTokens();
  const { data: myTokens } = useLaunchpadFactoryTokensByCreator(address);
  const [search, setSearch] = useState("");

  const tokens = (allTokens as Address[] | undefined) ?? [];
  const myTokensList = (myTokens as Address[] | undefined) ?? [];

  /* Batch-fetch name + symbol for all tokens so we can filter client-side */
  const nameSymbolCalls = useMemo(
    () =>
      tokens.flatMap((addr) => [
        { address: addr, abi, functionName: "name" },
        { address: addr, abi, functionName: "symbol" },
      ] as const),
    [tokens],
  );

  const { data: metaResults } = useReadContracts({ contracts: nameSymbolCalls });

  /* Build lookup: address -> { name, symbol } */
  const tokenMeta = useMemo(() => {
    const map = new Map<string, { name: string; symbol: string }>();
    if (!metaResults) return map;
    for (let i = 0; i < tokens.length; i++) {
      const nameResult = metaResults[i * 2];
      const symbolResult = metaResults[i * 2 + 1];
      map.set(tokens[i].toLowerCase(), {
        name: (nameResult?.result as string) ?? "",
        symbol: (symbolResult?.result as string) ?? "",
      });
    }
    return map;
  }, [tokens, metaResults]);

  /* Filter tokens by search query */
  const query = search.trim().toLowerCase();
  const filteredTokens = useMemo(() => {
    if (!query) return tokens;
    return tokens.filter((addr) => {
      const meta = tokenMeta.get(addr.toLowerCase());
      if (!meta) return false;
      return (
        meta.name.toLowerCase().includes(query) ||
        meta.symbol.toLowerCase().includes(query) ||
        addr.toLowerCase().includes(query)
      );
    });
  }, [tokens, tokenMeta, query]);

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

      {!isLoading && tokens.length > 0 && filteredTokens.length === 0 && (
        <p className="rounded-2xl border border-gray-200 p-12 text-center text-gray-500 dark:border-slate-700 dark:text-gray-400">
          No tokens match &ldquo;{search.trim()}&rdquo;
        </p>
      )}

      {!isLoading && filteredTokens.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTokens.map((addr) => (
            <TokenCard
              key={addr}
              tokenAddress={addr}
              isCreator={address ? myTokensList.includes(addr) : false}
            />
          ))}
        </div>
      )}

      {/* Floating bottom island bar with search */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="hidden min-w-0 shrink-0 sm:block">
            <h1 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
              Explore Tokens
            </h1>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {!isLoading && tokens.length > 0
                ? `${tokens.length} token${tokens.length !== 1 ? "s" : ""}`
                : "Browse and trade"}
            </p>
          </div>
          {!isLoading && tokens.length > 0 && (
            <div className="relative min-w-0 flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or symbol…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-tokamak-blue focus:bg-white focus:outline-none focus:ring-1 focus:ring-tokamak-blue dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-slate-800"
              />
            </div>
          )}
          <Link
            href="/create"
            className="shrink-0 rounded-lg bg-tokamak-blue px-5 py-2 text-sm font-medium text-white transition hover:bg-tokamak-blue-dark"
          >
            Launch a Token
          </Link>
        </div>
      </div>
    </div>
  );
}
