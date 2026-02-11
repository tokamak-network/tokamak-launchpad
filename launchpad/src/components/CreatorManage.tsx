import { useState } from "react";
import type { Address } from "viem";
import { parseEther } from "viem";
import { useLaunchpadTokenWrite, launchpadTokenAbi } from "../hooks/useLaunchpadToken";
import { useSimpleToast } from "../hooks/useTxToast";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-tokamak-blue focus:outline-none focus:ring-1 focus:ring-tokamak-blue dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100";

type WriteParams = Parameters<ReturnType<typeof useLaunchpadTokenWrite>["writeContract"]>[0];

export function CreatorManage({
  tokenAddress,
  minReserveRatio,
  paused,
}: {
  tokenAddress: Address;
  minReserveRatio: bigint | undefined;
  paused: boolean;
}) {
  const [newRatio, setNewRatio] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  const ratioBps = (() => {
    const n = Number(newRatio);
    return !Number.isNaN(n) && n >= 50 && n <= 100 ? BigInt(Math.round(n * 100)) : undefined;
  })();
  const depositWei = depositAmount
    ? (() => {
        try {
          const trimmed = depositAmount.trim();
          if (!trimmed || trimmed === "." || !/^[0-9]*\.?[0-9]*$/.test(trimmed)) return undefined;
          const val = parseEther(trimmed);
          return val > 0n ? val : undefined;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  /* Contract writes */
  const ratioWrite = useLaunchpadTokenWrite();
  const depositWrite = useLaunchpadTokenWrite();
  const pauseWrite = useLaunchpadTokenWrite();
  const unpauseWrite = useLaunchpadTokenWrite();

  /* Toast notifications */
  useSimpleToast({
    isSuccess: ratioWrite.isSuccess,
    isError: ratioWrite.isError,
    error: ratioWrite.error,
    successMessage: "Reserve % updated",
  });
  useSimpleToast({
    isSuccess: depositWrite.isSuccess,
    isError: depositWrite.isError,
    error: depositWrite.error,
    successMessage: "TON deposited",
  });
  useSimpleToast({
    isSuccess: pauseWrite.isSuccess,
    isError: pauseWrite.isError,
    error: pauseWrite.error,
    successMessage: "Token paused",
  });
  useSimpleToast({
    isSuccess: unpauseWrite.isSuccess,
    isError: unpauseWrite.isError,
    error: unpauseWrite.error,
    successMessage: "Token unpaused",
  });

  /* Clear inputs on success */
  if (ratioWrite.isSuccess && newRatio) setNewRatio("");
  if (depositWrite.isSuccess && depositAmount) setDepositAmount("");
  if (pauseWrite.isSuccess && pauseReason) setPauseReason("");

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 dark:border-slate-600 dark:bg-slate-800/50">
      <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
        Creator
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Reserve ratio */}
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
            Reserve % (now: {minReserveRatio !== undefined ? Number(minReserveRatio) / 100 : "—"})
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={50}
              max={100}
              placeholder="80"
              value={newRatio}
              onChange={(e) => setNewRatio(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() =>
                ratioBps !== undefined &&
                ratioWrite.writeContract({
                  address: tokenAddress,
                  abi: launchpadTokenAbi,
                  functionName: "updateMinReserveRatio",
                  args: [ratioBps],
                } as unknown as WriteParams)
              }
              disabled={ratioBps === undefined || ratioWrite.isPending}
              className="shrink-0 rounded-lg bg-tokamak-blue px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>

        {/* Deposit TON */}
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
            Deposit TON
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() =>
                depositWei &&
                depositWei > 0n &&
                depositWrite.writeContract({
                  address: tokenAddress,
                  abi: launchpadTokenAbi,
                  functionName: "depositReserve",
                  value: depositWei,
                } as unknown as WriteParams)
              }
              disabled={!depositWei || depositWei <= 0n || depositWrite.isPending}
              className="shrink-0 rounded-lg bg-tokamak-blue px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {depositWrite.isPending ? "…" : "Deposit"}
            </button>
          </div>
        </div>
      </div>

      {/* Pause / Unpause */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {paused ? (
          <button
            type="button"
            onClick={() =>
              unpauseWrite.writeContract({
                address: tokenAddress,
                abi: launchpadTokenAbi,
                functionName: "emergencyUnpause",
              } as unknown as WriteParams)
            }
            disabled={unpauseWrite.isPending}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Unpause
          </button>
        ) : (
          <>
            <input
              type="text"
              placeholder="Reason"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="max-w-[120px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() =>
                pauseWrite.writeContract({
                  address: tokenAddress,
                  abi: launchpadTokenAbi,
                  functionName: "emergencyPause",
                  args: [pauseReason || "Pause"],
                } as unknown as WriteParams)
              }
              disabled={pauseWrite.isPending}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Pause
            </button>
          </>
        )}
      </div>
    </div>
  );
}
