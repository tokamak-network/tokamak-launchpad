"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseEther, decodeEventLog } from "viem";
import { toast } from "sonner";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useLaunchpadFactoryCreationFee,
  useLaunchpadFactoryCalculateCreationCost,
  useLaunchpadFactoryCreateToken,
} from "../hooks/useLaunchpadFactory";
import { LAUNCHPAD_FACTORY_ADDRESS, explorerTxUrl } from "../config/contracts";
import { formatTon, ipfsToGateway } from "../lib/format";
import launchpadFactoryAbi from "../abis/LaunchpadFactory.json";

/* ── Constants ── */
const MIN_INITIAL_MINT = 10n ** 15n;
const MIN_BASE = 10n ** 12n;
const MAX_BASE = 10n ** 24n;
const ABI = launchpadFactoryAbi as readonly unknown[];

function parseBigInt(s: string): bigint | undefined {
  try {
    const trimmed = s.trim();
    if (!trimmed || trimmed === "." || trimmed === "-") return undefined;
    if (!/^[0-9]*\.?[0-9]*$/.test(trimmed)) return undefined;
    const val = parseEther(trimmed);
    if (val < 0n) return undefined;
    return val;
  } catch {
    return undefined;
  }
}

/** Filter input to only allow valid decimal characters */
function sanitizeDecimal(value: string): string {
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

type FieldError = string | null;

/* ── Shared input class ── */
const inputBase =
  "w-full rounded-lg border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-gray-100";
const inputNormal = `${inputBase} border-gray-200 focus:border-tokamak-blue focus:ring-tokamak-blue dark:border-gray-600`;
const inputError = `${inputBase} border-red-300 focus:border-red-500 focus:ring-red-500`;

/* ── Deployment overlay ── */
function DeploymentModal({
  step,
  txHash,
  tokenAddress,
  errorMessage,
  onRetry,
}: {
  step: "confirm" | "mining" | "done" | "error";
  txHash: string | null;
  tokenAddress: string | null;
  errorMessage?: string;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 flex w-full max-w-sm flex-col items-center rounded-2xl border border-gray-200 bg-white p-10 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        {step === "error" ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Transaction failed</p>
            {errorMessage && (
              <p className="mt-2 max-w-xs text-center text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 w-full rounded-lg bg-tokamak-blue py-2.5 font-medium text-white hover:bg-tokamak-blue-dark"
            >
              Try Again
            </button>
          </>
        ) : step === "done" && tokenAddress ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Token created!</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Taking you to your token…
            </p>
          </>
        ) : step === "done" ? (
          <>
            <p className="mb-2 text-center font-medium text-gray-900 dark:text-gray-100">
              Token created!
            </p>
            {txHash && (
              <a
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noreferrer"
                aria-label="View transaction on explorer"
                className="mb-4 block truncate text-center text-sm text-tokamak-blue hover:underline"
              >
                Tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </a>
            )}
            <Link
              href="/tokens"
              className="block w-full rounded-lg border border-gray-200 py-2.5 text-center font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/50"
            >
              Go to token list
            </Link>
          </>
        ) : (
          <>
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-tokamak-blue border-t-transparent" />
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {step === "confirm" ? "Confirm in wallet" : "Deploying your token"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {step === "confirm"
                ? "Approve the transaction in MetaMask"
                : "Waiting for on-chain confirmation…"}
            </p>
            {step === "mining" && txHash && (
              <a
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noreferrer"
                aria-label="View pending transaction on explorer"
                className="mt-3 text-sm text-tokamak-blue hover:underline"
              >
                View on explorer
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main form ── */
export function CreateToken() {
  const router = useRouter();
  const { isConnected } = useAccount();

  /* Form state */
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [basePrice, setBasePrice] = useState("0.001");
  const [curveBase, setCurveBase] = useState("1");
  const [curveExponent, setCurveExponent] = useState(12);
  const [minReserveRatio, setMinReserveRatio] = useState("80");
  const [initialTon, setInitialTon] = useState("0.1");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) =>
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  const touchAll = () =>
    setTouched(
      new Set(["name", "symbol", "basePrice", "curve", "reserve", "initialTon", "description", "image"]),
    );

  /* Image upload */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
      touch("image");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /* Contract reads */
  const { data: feeWei } = useLaunchpadFactoryCreationFee();
  const initialWei = parseBigInt(initialTon);
  const validInitialWei =
    initialWei !== undefined && initialWei >= MIN_INITIAL_MINT ? initialWei : undefined;
  const { data: totalCost } = useLaunchpadFactoryCalculateCreationCost(validInitialWei);

  /* Contract write */
  const {
    writeContract,
    isPending,
    data: txHash,
    error: writeError,
    reset: resetWrite,
  } = useLaunchpadFactoryCreateToken();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });
  const receiptFailed = receipt?.status === "reverted";

  /* Derived values */
  const basePriceWei = parseBigInt(basePrice);
  const MAX_CURVE = 10n ** 18n;
  const curveWei = (() => {
    try {
      const trimmed = curveBase.trim();
      if (!trimmed || !/^[0-9]+$/.test(trimmed)) return undefined;
      const base = BigInt(trimmed);
      if (base < 0n) return undefined;
      const multiplier = 10n ** BigInt(curveExponent);
      const raw = base * multiplier;
      return raw >= 0n && raw <= MAX_CURVE ? raw : undefined;
    } catch {
      return undefined;
    }
  })();
  const ratioNum = Number(minReserveRatio);
  const ratioBps =
    !Number.isNaN(ratioNum) && ratioNum >= 50 && ratioNum <= 100
      ? BigInt(Math.round(ratioNum * 100))
      : undefined;
  const descriptionTrimmed = description.trim();
  const nameTrim = name.trim();
  const symbolTrim = symbol.trim().toUpperCase();

  /* Validation */
  const fieldErrors: Record<string, FieldError> = {
    name:
      nameTrim.length === 0
        ? "Required"
        : nameTrim.length > 64
          ? "Max 64 characters"
          : null,
    symbol:
      symbolTrim.length === 0
        ? "Required"
        : symbolTrim.length > 16
          ? "Max 16 characters"
          : null,
    basePrice:
      basePriceWei === undefined
        ? "Invalid number"
        : basePriceWei < MIN_BASE
          ? "Min 0.000001 TON"
          : basePriceWei > MAX_BASE
            ? "Max 1e24 wei"
            : null,
    curve: curveWei === undefined ? "Must be 0 – 1e18" : null,
    reserve:
      ratioBps === undefined || ratioNum < 50 || ratioNum > 100
        ? "Must be between 50 and 100"
        : null,
    initialTon:
      validInitialWei === undefined ? "Invalid or below minimum (0.001 TON)" : null,
    description:
      descriptionTrimmed.length === 0
        ? "Required"
        : descriptionTrimmed.length > 512
          ? "Max 512 characters"
          : null,
    image: imageUrl === null ? "Upload a token image" : null,
  };

  const valid =
    !Object.values(fieldErrors).some(Boolean) &&
    typeof totalCost === "bigint" &&
    !!basePriceWei &&
    !!curveWei &&
    !!ratioBps &&
    !!imageUrl &&
    descriptionTrimmed.length > 0;

  /* Submit */
  const submit = () => {
    touchAll();
    if (
      !valid ||
      typeof totalCost !== "bigint" ||
      !basePriceWei ||
      !curveWei ||
      !ratioBps ||
      !imageUrl
    )
      return;
    writeContract({
      address: LAUNCHPAD_FACTORY_ADDRESS,
      abi: ABI,
      functionName: "createToken",
      args: [nameTrim, symbolTrim, basePriceWei, curveWei, ratioBps, descriptionTrimmed, imageUrl],
      value: totalCost,
    } as unknown as Parameters<typeof writeContract>[0]);
  };

  /* Extract token address from receipt logs */
  const tokenAddressFromReceipt = (() => {
    if (!receipt) return null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== LAUNCHPAD_FACTORY_ADDRESS.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: ABI, data: log.data, topics: log.topics });
        if (
          decoded.eventName === "TokenCreated" &&
          decoded.args &&
          "token" in decoded.args
        )
          return decoded.args.token as string;
      } catch {
        /* skip non-matching logs */
      }
    }
    return null;
  })();

  /* Parse a human-readable error from the write error */
  const errorMessage = (() => {
    if (!writeError && !receiptFailed) return undefined;
    if (receiptFailed) return "Transaction reverted on-chain. Check your parameters and try again.";
    const msg = writeError?.message ?? "";
    // Extract revert reason if present
    const revertMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/i) ?? msg.match(/reverted with reason string '(.+?)'/i);
    if (revertMatch) return revertMatch[1].trim();
    if (msg.includes("User rejected")) return "Transaction was rejected in your wallet.";
    if (msg.length > 120) return msg.slice(0, 120) + "…";
    return msg || "Something went wrong.";
  })();

  const deploymentStep: "confirm" | "mining" | "done" | "error" | null =
    writeError || receiptFailed
      ? "error"
      : isPending
        ? "confirm"
        : txHash && !receipt
          ? "mining"
          : receipt
            ? "done"
            : null;

  const handleRetry = () => {
    resetWrite();
    // imageUrl is preserved — no re-upload needed
  };

  useEffect(() => {
    if (receipt && !receiptFailed && tokenAddressFromReceipt) {
      toast.success("Token created");
      router.replace(`/token/${tokenAddressFromReceipt}`);
    }
  }, [receipt, receiptFailed, tokenAddressFromReceipt, router]);

  /* ── Render ── */
  const hiddenFileInput = (
    <input
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      onChange={handleImageUpload}
      disabled={uploading}
      className="hidden"
      id="token-image-input"
    />
  );

  return (
    <>
      {deploymentStep && (
        <DeploymentModal
          step={deploymentStep}
          txHash={txHash ?? null}
          tokenAddress={tokenAddressFromReceipt}
          errorMessage={errorMessage}
          onRetry={handleRetry}
        />
      )}

      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">Create token</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Set up your token image, details, and economics.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
          {/* ── Left: Image upload + Description ── */}
          <div className="flex flex-col gap-4">
            {/* Clickable image zone */}
            {hiddenFileInput}
            <label
              htmlFor="token-image-input"
              className={`group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
                imageUrl
                  ? "border-transparent"
                  : "border-gray-300 bg-gray-50 hover:border-tokamak-blue hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-tokamak-blue dark:hover:bg-gray-800"
              } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              {imageUrl ? (
                <>
                  <Image
                    src={ipfsToGateway(imageUrl)}
                    alt="Token preview"
                    fill
                    sizes="280px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700">
                      Change image
                    </span>
                  </div>
                </>
              ) : uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-tokamak-blue border-t-transparent" />
                  <span className="text-xs text-gray-500">Uploading…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-400 transition group-hover:text-tokamak-blue dark:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
                  </svg>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Click to upload image
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    JPG, PNG, GIF or WebP
                  </span>
                </div>
              )}
            </label>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="self-start text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                Remove image
              </button>
            )}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => touch("description")}
                maxLength={512}
                rows={4}
                placeholder="What is this token about?"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-tokamak-blue focus:outline-none focus:ring-1 focus:ring-tokamak-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-gray-400">{description.length}/512</span>
                {touched.has("description") && fieldErrors.description && (
                  <span className="text-xs text-red-600">{fieldErrors.description}</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Form fields ── */}
          <div className="flex flex-col gap-5">
            {/* Name & Symbol — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => touch("name")}
                  placeholder="My Token"
                  maxLength={64}
                  className={touched.has("name") && fieldErrors.name ? inputError : inputNormal}
                />
                {touched.has("name") && fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onBlur={() => touch("symbol")}
                  placeholder="MTK"
                  maxLength={16}
                  className={touched.has("symbol") && fieldErrors.symbol ? inputError : inputNormal}
                />
                {touched.has("symbol") && fieldErrors.symbol && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.symbol}</p>
                )}
              </div>
            </div>

            {/* Token economics header */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Token economics
            </p>

            {/* Base price */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Base price (TON) *
              </label>
              <input
                type="text"
                value={basePrice}
                onChange={(e) => setBasePrice(sanitizeDecimal(e.target.value))}
                onBlur={() => touch("basePrice")}
                placeholder="0.001"
                className={touched.has("basePrice") && fieldErrors.basePrice ? inputError : inputNormal}
              />
              {touched.has("basePrice") && fieldErrors.basePrice && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.basePrice}</p>
              )}
            </div>

            {/* Curve coefficient — full width */}
            <div className="relative">
              <div className="mb-1 flex items-center gap-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Curve coefficient (0 – 10¹⁸) *
                </label>
                <span className="group/tip relative inline-flex">
                  <span
                    className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    aria-label="Curve coefficient effect on token price"
                  >
                    ?
                  </span>
                  <span className="pointer-events-none absolute left-0 top-6 z-10 w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    curveCoefficient effect on token price:
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                      <li>Flat curve: 0</li>
                      <li>Gentle: 1e8</li>
                      <li>Steep: 1e10</li>
                    </ul>
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={curveBase}
                  onChange={(e) => setCurveBase(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="1"
                  onBlur={() => touch("curve")}
                  className={`${touched.has("curve") && fieldErrors.curve ? inputError : inputNormal} w-24`}
                />
                <span className="text-sm text-gray-400 dark:text-gray-500">×</span>
                <select
                  value={curveExponent}
                  onChange={(e) => setCurveExponent(Number(e.target.value))}
                  className={`${inputNormal} w-40`}
                >
                  <option value={0}>1 (10⁰)</option>
                  <option value={3}>1,000 (10³)</option>
                  <option value={6}>1,000,000 (10⁶)</option>
                  <option value={9}>1B (10⁹)</option>
                  <option value={12}>1T (10¹²)</option>
                  <option value={15}>1Q (10¹⁵)</option>
                  <option value={18}>1e18</option>
                </select>
                {curveWei !== undefined && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    = {curveWei.toLocaleString()}
                  </span>
                )}
              </div>
              {touched.has("curve") && fieldErrors.curve && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.curve}</p>
              )}
            </div>

            {/* Reserve & Initial TON — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reserve % (50–100) *
                </label>
                <input
                  type="number"
                  value={minReserveRatio}
                  onChange={(e) => setMinReserveRatio(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => touch("reserve")}
                  placeholder="80"
                  className={touched.has("reserve") && fieldErrors.reserve ? inputError : inputNormal}
                />
                {touched.has("reserve") && fieldErrors.reserve && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.reserve}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Initial TON deposit *
                </label>
                <input
                  type="text"
                  value={initialTon}
                  onChange={(e) => setInitialTon(sanitizeDecimal(e.target.value))}
                  onBlur={() => touch("initialTon")}
                  placeholder="0.1"
                  className={touched.has("initialTon") && fieldErrors.initialTon ? inputError : inputNormal}
                />
                {touched.has("initialTon") && fieldErrors.initialTon && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.initialTon}</p>
                )}
              </div>
            </div>

            {/* Fee summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">Protocol fee</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeof feeWei === "bigint" ? `${formatTon(feeWei)} TON` : "—"}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">Total required</span>
                <span className="font-semibold text-tokamak-blue">
                  {typeof totalCost === "bigint" ? `${formatTon(totalCost)} TON` : "—"}
                </span>
              </div>
            </div>

            {writeError && (
              <p className="text-sm text-red-600">{writeError.message}</p>
            )}

            {isConnected ? (
              <button
                type="button"
                onClick={submit}
                disabled={!valid || !!deploymentStep}
                className="w-full rounded-lg bg-tokamak-blue py-3 font-medium text-white hover:bg-tokamak-blue-dark focus:outline-none focus:ring-2 focus:ring-tokamak-blue focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                Create token
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="w-full rounded-lg bg-tokamak-blue py-3 font-medium text-white hover:bg-tokamak-blue-dark focus:outline-none focus:ring-2 focus:ring-tokamak-blue focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  >
                    Connect Wallet to Create
                  </button>
                )}
              </ConnectButton.Custom>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
