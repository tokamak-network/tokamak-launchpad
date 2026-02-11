"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLaunchpadToken, useLaunchpadTokenBalance } from "../hooks/useLaunchpadToken";
import { explorerAddressUrl } from "../config/contracts";
import { formatTon, formatTokens } from "../lib/format";
import { CreatorManage } from "../components/CreatorManage";
import { BuySellForm } from "../components/BuySellForm";
import { TokenImage } from "../components/TokenImage";
import { TokenHistory } from "../components/TokenHistory";

export function TokenDetail() {
  const params = useParams();
  const address = params?.address as string | undefined;
  const tokenAddress = address as `0x${string}` | undefined;
  const { address: userAddress } = useAccount();
  const token = useLaunchpadToken(tokenAddress);
  const balance = useLaunchpadTokenBalance(tokenAddress, userAddress);

  /* Prevent hydration mismatch — wallet state only available on client */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nameStr = token.name.data as string | undefined;
  const symbolStr = token.symbol.data as string | undefined;
  const creator = token.creator.data as `0x${string}` | undefined;
  const totalSupply = token.totalSupply.data as bigint | undefined;
  const currentPrice = token.getCurrentPrice.data as bigint | undefined;
  const reserveRatio = token.getReserveRatio.data as bigint | undefined;
  const tonReserve = token.tonReserve.data as bigint | undefined;
  const redemptionsPaused = token.redemptionsPaused.data as boolean | undefined;
  const paused = token.paused.data as boolean | undefined;
  const userBalance = balance.data as bigint | undefined;
  const descriptionStr = token.description.data as string | undefined;
  const imageUrlStr = token.imageUrl.data as string | undefined;
  const isCreator =
    mounted && userAddress && creator && userAddress.toLowerCase() === creator.toLowerCase();
  const isConnected = mounted && !!userAddress;

  if (!tokenAddress) {
    return (
      <div className="mx-auto max-w-6xl rounded-xl bg-red-50 p-4 px-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
        Invalid token.{" "}
        <Link href="/tokens" className="underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left — Token profile */}
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="p-5">
            <Link
              href="/tokens"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-tokamak-blue dark:text-gray-400 dark:hover:text-tokamak-blue"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Tokens
            </Link>

            <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-800">
              <TokenImage src={imageUrlStr} alt={nameStr ?? "Token"} />
            </div>

            <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              {nameStr ?? "…"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{symbolStr ?? "—"}</p>
            {descriptionStr && descriptionStr.length > 0 && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {descriptionStr}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Price</p>
                <p className="text-sm font-semibold text-tokamak-blue">
                  {currentPrice !== undefined ? formatTon(currentPrice) : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Reserve</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {reserveRatio !== undefined
                    ? `${(Number(reserveRatio) / 100).toFixed(0)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Supply</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {totalSupply !== undefined ? formatTokens(totalSupply) : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">TON Locked</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {tonReserve !== undefined ? formatTon(tonReserve) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-auto flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-slate-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Creator:{" "}
              <a
                href={creator ? explorerAddressUrl(creator) : "#"}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-tokamak-blue hover:underline"
              >
                {creator ? `${creator.slice(0, 6)}…${creator.slice(-4)}` : "—"}
              </a>
            </span>
            <a
              href={explorerAddressUrl(tokenAddress)}
              target="_blank"
              rel="noreferrer"
              aria-label="View token contract on explorer"
              className="text-xs font-medium text-tokamak-blue hover:underline"
            >
              View on Explorer ↗
            </a>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {isConnected ? (
            /* ── Connected: Trade panel ── */
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="p-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Trade
                  </h2>
                  <p className="text-sm font-semibold text-tokamak-blue">
                    {userBalance !== undefined ? formatTokens(userBalance) : "—"}{" "}
                    <span className="text-xs font-normal text-gray-400">{symbolStr ?? ""}</span>
                  </p>
                </div>
                <BuySellForm
                  tokenAddress={tokenAddress}
                  symbol={symbolStr ?? ""}
                  userBalance={userBalance ?? 0n}
                  redemptionsPaused={redemptionsPaused ?? true}
                  paused={paused ?? false}
                />

                {isCreator && (
                  <>
                    <hr className="my-4 border-gray-200 dark:border-slate-600" />
                    <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Creator Controls
                    </h3>
                    <CreatorManage
                      tokenAddress={tokenAddress}
                      minReserveRatio={token.minReserveRatio.data as bigint | undefined}
                      paused={paused ?? false}
                    />
                  </>
                )}
              </div>
            </div>
          ) : (
            /* ── Disconnected: Connect CTA ── */
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-tokamak-blue/10 dark:bg-tokamak-blue/20">
                  <svg className="h-6 w-6 text-tokamak-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Connect to trade this token
                </p>
                <p className="mt-1 mb-4 max-w-[260px] text-sm text-gray-500 dark:text-gray-400">
                  Connect your wallet to buy, sell, and manage {symbolStr ?? "this token"}.
                </p>
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="rounded-lg bg-tokamak-blue px-6 py-2.5 font-medium text-white hover:bg-tokamak-blue-dark focus:outline-none focus:ring-2 focus:ring-tokamak-blue focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    >
                      Connect Wallet
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            </div>
          )}

          {/* Recent trades — always in right column */}
          <TokenHistory tokenAddress={tokenAddress} symbol={symbolStr} />
        </div>
      </div>
    </div>
  );
}
