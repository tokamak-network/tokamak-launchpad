"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useLaunchpadFactoryAllTokens,
  useLaunchpadFactoryTokenCount,
  useLaunchpadFactoryCreationFee,
} from "../hooks/useLaunchpadFactory";
import { formatTon } from "../lib/format";
import { TokenPill } from "../components/TokenPill";

export function Home() {
  const { data: allTokens } = useLaunchpadFactoryAllTokens();
  const { data: tokenCount } = useLaunchpadFactoryTokenCount();
  const { data: feeWei } = useLaunchpadFactoryCreationFee();

  const tokens = (allTokens as `0x${string}`[] | undefined) ?? [];
  const count = typeof tokenCount === "bigint" ? Number(tokenCount) : tokens.length;
  const latestTokens = [...tokens].reverse().slice(0, 7);

  return (
    <div className="-mt-20">
      {/* ── Full-viewport hero — true 100vw × 100vh ── */}
      <section className="relative min-h-screen w-screen overflow-hidden bg-linear-to-br from-tokamak-blue via-tokamak-blue-dark to-slate-900 text-white animate-fade-in-up">
        {/* Background blobs */}
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-tokamak-blue-light blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto grid h-full min-h-screen max-w-6xl px-4 pt-14 md:grid-cols-[2fr_3fr]">
          {/* Left — Logo, copy, stats, CTAs */}
          <div className="flex flex-col justify-center py-16 sm:py-20">
            {/* Spinning logo orb */}
            <div className="mb-8 self-start">
              <div className="animate-glow-pulse relative rounded-full p-[2px]">
                <div
                  className="animate-spin-slow absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #3b82f6, #60a5fa, #93c5fd, #dbeafe, #3b82f6)",
                  }}
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-900">
                  <Image
                    src="/tokamak-symbol.svg"
                    alt=""
                    width={44}
                    height={30}
                    className="brightness-0 invert"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              TONLaunch
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/60">
              Create bonding-curve tokens backed by TON on Tokamak Network.
              Launch in seconds, trade instantly.
            </p>

            {/* Inline stat pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {count > 0 && (
                <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                  {count} Token{count !== 1 ? "s" : ""} Launched
                </span>
              )}
              {typeof feeWei === "bigint" && (
                <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                  {formatTon(feeWei)} TON Fee
                </span>
              )}
              <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                Thanos Sepolia
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/create"
                className="rounded-lg bg-white px-7 py-3 font-semibold text-tokamak-blue shadow-sm transition hover:bg-gray-100"
              >
                Launch a Token
              </Link>
              <Link
                href="/tokens"
                className="rounded-lg border border-white/30 px-7 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Browse Tokens
              </Link>
            </div>
          </div>

          {/* Right — Scattered tilted floating token pills */}
          <div className="relative hidden px-8 md:block lg:px-12">
            {latestTokens.length > 0 ? (
              <>
                {latestTokens[0] && (
                  <div className="animate-float absolute right-10 top-[14%] rotate-3 transition-transform duration-300 hover:rotate-0 lg:right-16">
                    <TokenPill tokenAddress={latestTokens[0]} />
                  </div>
                )}
                {latestTokens[1] && (
                  <div className="animate-float-delayed absolute left-10 top-[26%] -rotate-2 transition-transform duration-300 hover:rotate-0 lg:left-14">
                    <TokenPill tokenAddress={latestTokens[1]} />
                  </div>
                )}
                {latestTokens[2] && (
                  <div className="animate-float-slow absolute right-12 top-[38%] rotate-[5deg] transition-transform duration-300 hover:rotate-0 lg:right-20">
                    <TokenPill tokenAddress={latestTokens[2]} />
                  </div>
                )}
                {latestTokens[3] && (
                  <div className="animate-float absolute left-14 top-[50%] -rotate-3 transition-transform duration-300 hover:rotate-0 lg:left-18">
                    <TokenPill tokenAddress={latestTokens[3]} />
                  </div>
                )}
                {latestTokens[4] && (
                  <div className="animate-float-delayed absolute right-8 top-[62%] rotate-2 transition-transform duration-300 hover:rotate-0 lg:right-14">
                    <TokenPill tokenAddress={latestTokens[4]} />
                  </div>
                )}
                {latestTokens[5] && (
                  <div className="animate-float-slow absolute left-12 top-[74%] -rotate-[4deg] transition-transform duration-300 hover:rotate-0 lg:left-20">
                    <TokenPill tokenAddress={latestTokens[5]} />
                  </div>
                )}
                {latestTokens[6] && (
                  <div className="animate-float absolute bottom-[10%] right-16 rotate-1 transition-transform duration-300 hover:rotate-0 lg:right-24">
                    <TokenPill tokenAddress={latestTokens[6]} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-8">
                <p className="text-center text-sm text-white/30">
                  Tokens will appear here once created.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-4 animate-fade-in-up pt-28 pb-16" style={{ animationDelay: "0.15s" }}>
        <h2 className="mb-2 text-center font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          How it works
        </h2>
        <p className="mx-auto mb-8 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
          No smart contract experience needed. Three steps, all from your browser.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <StepCard
            step="1"
            title="Configure & Deploy"
            description="Pick a name, symbol, upload an image, and set your bonding curve. One click deploys it on-chain."
          />
          <StepCard
            step="2"
            title="Buy & Sell Instantly"
            description="Anyone can buy tokens with TON. The price rises along the curve. Sell anytime to redeem TON."
          />
          <StepCard
            step="3"
            title="Watch It Grow"
            description="Built-in reserve ratio ensures liquidity. As demand grows, so does the value of every token."
          />
        </div>
      </section>

      {/* ── Documentation CTA ── */}
      <section id="docs" className="mx-auto max-w-6xl px-4 animate-fade-in-up scroll-mt-24 pb-0" style={{ animationDelay: "0.3s" }}>
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800/50 sm:p-14">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tokamak-blue/10 dark:bg-tokamak-blue/20">
            <svg className="h-7 w-7 text-tokamak-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Documentation
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Guides, API references, and everything you need to build on the launchpad.
          </p>
          <Link
            href="/docs"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-tokamak-blue px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-tokamak-blue-dark"
          >
            Read the Docs
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-tokamak-blue text-sm font-bold text-white">
        {step}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
