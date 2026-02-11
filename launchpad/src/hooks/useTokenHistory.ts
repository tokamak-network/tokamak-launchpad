import { useQuery } from "@tanstack/react-query";
import { thanosSepolia } from "../config/chains";

const EXPLORER_API = `${thanosSepolia.blockExplorers.default.url}/api`;

/** event TokensMinted(address indexed user, uint256 tonDeposited, uint256 tokensMinted, uint256 newPrice) */
const TOKENS_MINTED_TOPIC =
  "0x6155cfd0fd028b0ca77e8495a60cbe563e8bce8611f0aad6fedbdaafc05d44a2";

/** event TokensBurned(address indexed user, uint256 tokensBurned, uint256 tonReturned, uint256 newPrice) */
const TOKENS_BURNED_TOPIC =
  "0x19783b34589160c168487dc7f9c51ae0bcefe67a47d6708fba90f6ce0366d3d1";

/** Block where the launchpad factory was deployed. */
const DEPLOY_BLOCK = "6324750";

export type TokenTx = {
  type: "mint" | "burn";
  txHash: string;
  blockNumber: number;
  /** The trader address. */
  trader: string;
  /** Token amount (bigint serialised as string). */
  tokenAmount: string;
  /** TON amount deposited (mint) or returned (burn), serialised as string. */
  tonAmount: string;
  /** New token price after the trade, serialised as string. */
  newPrice: string;
  timestamp?: number;
};

interface BlockscoutLog {
  transactionHash: string;
  blockNumber: string;
  topics: string[];
  data: string;
  timeStamp?: string;
}

/** Parse a 32-byte hex topic into a checksumless address. */
function topicToAddress(topic: string): string {
  return "0x" + topic.slice(26);
}

/** Decode three ABI-encoded uint256 values from a hex data string. */
function decodeThreeUint256(data: string): [bigint, bigint, bigint] {
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  return [
    BigInt("0x" + hex.slice(0, 64)),
    BigInt("0x" + hex.slice(64, 128)),
    BigInt("0x" + hex.slice(128, 192)),
  ];
}

async function fetchLogs(
  tokenAddress: string,
  topic0: string,
): Promise<BlockscoutLog[]> {
  const url = new URL(EXPLORER_API);
  url.searchParams.set("module", "logs");
  url.searchParams.set("action", "getLogs");
  url.searchParams.set("address", tokenAddress);
  url.searchParams.set("topic0", topic0);
  url.searchParams.set("fromBlock", DEPLOY_BLOCK);
  url.searchParams.set("toBlock", "latest");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Explorer API error: ${res.status}`);
  const json = await res.json();
  // status "0" with no results is normal (empty), not an error
  if (json.status === "0") return [];
  return (json.result ?? []) as BlockscoutLog[];
}

async function fetchTokenHistory(tokenAddress: string): Promise<TokenTx[]> {
  const [mintLogs, burnLogs] = await Promise.all([
    fetchLogs(tokenAddress, TOKENS_MINTED_TOPIC),
    fetchLogs(tokenAddress, TOKENS_BURNED_TOPIC),
  ]);

  const txs: TokenTx[] = [];

  for (const log of mintLogs) {
    const trader = log.topics[1] ? topicToAddress(log.topics[1]) : "";
    const [tonDeposited, tokensMinted, newPrice] = decodeThreeUint256(log.data);
    txs.push({
      type: "mint",
      txHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      trader,
      tokenAmount: tokensMinted.toString(),
      tonAmount: tonDeposited.toString(),
      newPrice: newPrice.toString(),
      timestamp: log.timeStamp ? parseInt(log.timeStamp, 16) : undefined,
    });
  }

  for (const log of burnLogs) {
    const trader = log.topics[1] ? topicToAddress(log.topics[1]) : "";
    const [tokensBurned, tonReturned, newPrice] = decodeThreeUint256(log.data);
    txs.push({
      type: "burn",
      txHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      trader,
      tokenAmount: tokensBurned.toString(),
      tonAmount: tonReturned.toString(),
      newPrice: newPrice.toString(),
      timestamp: log.timeStamp ? parseInt(log.timeStamp, 16) : undefined,
    });
  }

  // Sort descending by block number, take latest 50
  txs.sort((a, b) => b.blockNumber - a.blockNumber);
  return txs.slice(0, 50);
}

export function useTokenHistory(tokenAddress: `0x${string}` | undefined) {
  return useQuery<TokenTx[]>({
    queryKey: ["tokenHistory", tokenAddress],
    queryFn: () => fetchTokenHistory(tokenAddress!),
    enabled: !!tokenAddress,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
