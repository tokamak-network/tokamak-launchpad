"use client";

import type { Address } from "viem";
import { useTokenHistory } from "../hooks/useTokenHistory";
import { explorerTxUrl, explorerAddressUrl } from "../config/contracts";
import { formatTokens, formatTon } from "../lib/format";

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function safeBigInt(s: string): bigint {
  try { return BigInt(s); } catch { return 0n; }
}

export function TokenHistory({
  tokenAddress,
  symbol,
}: {
  tokenAddress: Address;
  symbol?: string;
}) {
  const { data: txs, isLoading, error, refetch, isFetching } = useTokenHistory(tokenAddress);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-slate-700">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Recent Trades
        </h2>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh trades"
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="px-5 py-6 text-center text-sm text-red-600 dark:text-red-400">
          Failed to load trades.
        </div>
      )}

      {!isLoading && !error && (!txs || txs.length === 0) && (
        <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No trades yet.
        </div>
      )}

      {isLoading && !txs && (
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-5 w-12 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      )}

      {txs && txs.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="sticky top-0 border-b border-gray-100 bg-white text-[11px] uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-gray-400">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Trader</th>
                <th className="px-4 py-2 font-medium text-right">
                  {symbol || "Tokens"}
                </th>
                <th className="px-4 py-2 font-medium text-right">TON</th>
                <th className="w-8 py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {txs.map((tx, idx) => (
                <tr
                  key={`${tx.txHash}-${idx}`}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                        tx.type === "mint"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {tx.type === "mint" ? "Buy" : "Sell"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <a
                      href={explorerAddressUrl(tx.trader)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-tokamak-blue hover:underline"
                    >
                      {truncateAddress(tx.trader)}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatTokens(safeBigInt(tx.tokenAmount))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {formatTon(safeBigInt(tx.tonAmount))}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 text-right">
                    <a
                      href={explorerTxUrl(tx.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View transaction on explorer"
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition hover:bg-gray-100 hover:text-tokamak-blue dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-tokamak-blue"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
