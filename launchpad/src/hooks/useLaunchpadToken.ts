import { useReadContract, useWriteContract } from "wagmi";
import type { Address } from "viem";
import launchpadTokenAbiJson from "../abis/LaunchpadToken.json";

const abi = launchpadTokenAbiJson as readonly unknown[];

export function useLaunchpadToken(tokenAddress: Address | undefined) {
  const name = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "name",
  });
  const symbol = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "symbol",
  });
  const totalSupply = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "totalSupply",
  });
  const getCurrentPrice = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "getCurrentPrice",
  });
  const getReserveRatio = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "getReserveRatio",
  });
  const tonReserve = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "tonReserve",
  });
  const creator = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "creator",
  });
  const redemptionsPaused = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "redemptionsPaused",
  });
  const paused = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "paused",
  });
  const minReserveRatio = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "minReserveRatio",
  });
  const description = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "description",
  });
  const imageUrl = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "imageUrl",
  });

  return {
    name,
    symbol,
    totalSupply,
    getCurrentPrice,
    getReserveRatio,
    tonReserve,
    creator,
    redemptionsPaused,
    paused,
    minReserveRatio,
    description,
    imageUrl,
  };
}

export function useLaunchpadTokenCalculateMint(
  tokenAddress: Address | undefined,
  tonAmount: bigint | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi,
    functionName: "calculateMintAmount",
    args: tonAmount !== undefined && tonAmount > 0n ? [tonAmount] : undefined,
  });
}

export function useLaunchpadTokenCalculateBurn(
  tokenAddress: Address | undefined,
  tokenAmount: bigint | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi,
    functionName: "calculateBurnReturn",
    args: tokenAmount !== undefined && tokenAmount > 0n ? [tokenAmount] : undefined,
  });
}

export function useLaunchpadTokenBalance(tokenAddress: Address | undefined, user: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi,
    functionName: "balanceOf",
    args: user ? [user] : undefined,
  });
}

export { useWriteContract as useLaunchpadTokenWrite };

export const launchpadTokenAbi = abi;
