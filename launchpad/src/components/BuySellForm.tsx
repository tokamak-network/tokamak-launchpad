import { useState } from "react";
import type { Address } from "viem";
import { parseEther } from "viem";
import {
  useLaunchpadTokenCalculateMint,
  useLaunchpadTokenCalculateBurn,
  useLaunchpadTokenWrite,
  launchpadTokenAbi,
} from "../hooks/useLaunchpadToken";
import { useTxToast } from "../hooks/useTxToast";
import { formatTon, formatTokens } from "../lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-tokamak-blue focus:outline-none focus:ring-1 focus:ring-tokamak-blue dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100";
const btnPrimary =
  "mt-1.5 w-full rounded-lg bg-tokamak-blue py-1.5 text-sm font-medium text-white hover:bg-tokamak-blue-dark disabled:opacity-50";
const btnSecondary =
  "mt-1.5 w-full rounded-lg border border-tokamak-blue py-1.5 text-sm font-medium text-tokamak-blue hover:bg-tokamak-blue-light disabled:opacity-50 dark:border-tokamak-blue dark:hover:bg-tokamak-blue-light/20";

/** Safely parse a decimal string to wei. Returns undefined for any invalid input. */
function safeParse(s: string): bigint | undefined {
  try {
    const trimmed = s.trim();
    if (!trimmed || trimmed === "." || trimmed === "-") return undefined;
    // reject anything that isn't a valid decimal number
    if (!/^[0-9]*\.?[0-9]*$/.test(trimmed)) return undefined;
    const val = parseEther(trimmed);
    if (val < 0n) return undefined;
    return val;
  } catch {
    return undefined;
  }
}

/** Filter input to only allow valid decimal characters */
function sanitizeDecimalInput(value: string): string {
  // Allow only digits and at most one decimal point
  let result = "";
  let hasDot = false;
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") {
      result += ch;
    } else if (ch === "." && !hasDot) {
      hasDot = true;
      result += ch;
    }
  }
  return result;
}

export function BuySellForm({
  tokenAddress,
  symbol,
  userBalance,
  redemptionsPaused,
  paused,
}: {
  tokenAddress: Address;
  symbol: string;
  userBalance: bigint;
  redemptionsPaused: boolean;
  paused: boolean;
}) {
  const [buyTon, setBuyTon] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  const tonForBuy = buyTon ? safeParse(buyTon) : undefined;
  const tokensForSell = sellAmount ? safeParse(sellAmount) : undefined;

  /* Previews */
  const { data: mintPreview } = useLaunchpadTokenCalculateMint(tokenAddress, tonForBuy);
  const { data: burnPreview } = useLaunchpadTokenCalculateBurn(tokenAddress, tokensForSell);
  const tokensOut = Array.isArray(mintPreview) ? (mintPreview as [bigint, bigint])[0] : undefined;
  const tonOut = Array.isArray(burnPreview) ? (burnPreview as [bigint, bigint])[0] : undefined;

  /* Writes */
  const {
    writeContract: writeMint,
    isPending: isMintPending,
    isError: isMintError,
    error: mintError,
    data: mintTxHash,
  } = useLaunchpadTokenWrite();
  const {
    writeContract: writeBurn,
    isPending: isBurnPending,
    isError: isBurnError,
    error: burnError,
    data: burnTxHash,
  } = useLaunchpadTokenWrite();

  /* Persistent toasts that track tx receipt */
  const { isConfirmed: mintConfirmed } = useTxToast({
    txHash: mintTxHash,
    isError: isMintError,
    error: mintError,
    pendingMessage: "Buy transaction submitted — waiting for confirmation…",
    successMessage: "Buy confirmed!",
  });
  const { isConfirmed: burnConfirmed } = useTxToast({
    txHash: burnTxHash,
    isError: isBurnError,
    error: burnError,
    pendingMessage: "Sell transaction submitted — waiting for confirmation…",
    successMessage: "Sell confirmed!",
  });

  /* Clear inputs on confirmation */
  if (mintConfirmed && buyTon) setBuyTon("");
  if (burnConfirmed && sellAmount) setSellAmount("");

  /* Actions */
  const doMint = () => {
    if (!tonForBuy || tonForBuy <= 0n) return;
    writeMint({
      address: tokenAddress,
      abi: launchpadTokenAbi,
      functionName: "mint",
      value: tonForBuy,
    } as unknown as Parameters<typeof writeMint>[0]);
  };

  const doBurn = () => {
    if (!tokensForSell || tokensForSell <= 0n) return;
    writeBurn({
      address: tokenAddress,
      abi: launchpadTokenAbi,
      functionName: "burn",
      args: [tokensForSell],
    } as unknown as Parameters<typeof writeBurn>[0]);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Buy */}
      <div className="flex flex-col">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Buy with TON
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={buyTon}
          onChange={(e) => setBuyTon(sanitizeDecimalInput(e.target.value))}
          className={inputClass}
        />
        <p className="mt-1 h-4 text-[11px] text-gray-400">
          {tokensOut !== undefined && tokensOut > 0n
            ? `≈ ${formatTokens(tokensOut)} ${symbol}`
            : "\u00A0"}
        </p>
        <button
          type="button"
          onClick={doMint}
          disabled={paused || !tonForBuy || tonForBuy <= 0n || isMintPending}
          className={btnPrimary}
        >
          {isMintPending ? "…" : "Buy"}
        </button>
      </div>

      {/* Sell */}
      <div className="flex flex-col">
        <label className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
          <span>Sell {symbol}</span>
          <span className="font-normal text-gray-400">Bal: {formatTokens(userBalance)}</span>
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={sellAmount}
          onChange={(e) => setSellAmount(sanitizeDecimalInput(e.target.value))}
          className={inputClass}
        />
        <p className="mt-1 h-4 text-[11px] text-gray-400">
          {tonOut !== undefined && tonOut > 0n
            ? `≈ ${formatTon(tonOut)} TON`
            : (redemptionsPaused || paused)
              ? (paused ? "Paused" : "Redemptions paused")
              : "\u00A0"}
        </p>
        <button
          type="button"
          onClick={doBurn}
          disabled={
            paused || redemptionsPaused || !tokensForSell || tokensForSell > userBalance || isBurnPending
          }
          className={btnSecondary}
        >
          {isBurnPending ? "…" : "Sell"}
        </button>
      </div>
    </div>
  );
}
