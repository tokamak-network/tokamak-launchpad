import { formatUnits } from "viem";

const TON_DECIMALS = 18;

export function formatTon(wei: bigint, maxDecimals = 4): string {
  try {
    const s = formatUnits(wei, TON_DECIMALS);
    const [intPart, decPart] = s.split(".");
    if (!decPart) return intPart ?? "0";
    const trimmed = decPart.replace(/0+$/, "").slice(0, maxDecimals);
    return trimmed ? `${intPart}.${trimmed}` : (intPart ?? "0");
  } catch {
    return "0";
  }
}

export function formatTokens(wei: bigint, decimals = 18, maxDecimals = 4): string {
  try {
    const s = formatUnits(wei, decimals);
    const [intPart, decPart] = s.split(".");
    if (!decPart) return intPart ?? "0";
    const trimmed = decPart.replace(/0+$/, "").slice(0, maxDecimals);
    return trimmed ? `${intPart}.${trimmed}` : (intPart ?? "0");
  } catch {
    return "0";
  }
}

/** Pinata IPFS gateway used for rendering uploaded images. */
const IPFS_GATEWAY = "https://lime-persistent-squid-147.mypinata.cloud/ipfs/";

export function ipfsToGateway(uri: string): string {
  try {
    if (!uri) return "";
    if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.slice(7);
    return uri;
  } catch {
    return "";
  }
}
