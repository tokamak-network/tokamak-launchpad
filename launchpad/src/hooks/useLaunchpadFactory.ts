import { useReadContract, useWriteContract } from "wagmi";
import { LAUNCHPAD_FACTORY_ADDRESS } from "../config/contracts";
import launchpadFactoryAbi from "../abis/LaunchpadFactory.json";

const abi = launchpadFactoryAbi as readonly unknown[];

export function useLaunchpadFactoryAllTokens() {
  return useReadContract({
    address: LAUNCHPAD_FACTORY_ADDRESS,
    abi,
    functionName: "getAllTokens",
  });
}

export function useLaunchpadFactoryTokensByCreator(creator: `0x${string}` | undefined) {
  return useReadContract({
    address: LAUNCHPAD_FACTORY_ADDRESS,
    abi,
    functionName: "getTokensByCreator",
    args: creator ? [creator] : undefined,
  });
}

export function useLaunchpadFactoryTokenCount() {
  return useReadContract({
    address: LAUNCHPAD_FACTORY_ADDRESS,
    abi,
    functionName: "tokenCount",
  });
}

export function useLaunchpadFactoryCreationFee() {
  return useReadContract({
    address: LAUNCHPAD_FACTORY_ADDRESS,
    abi,
    functionName: "creationFee",
  });
}

export function useLaunchpadFactoryCalculateCreationCost(initialMintAmount: bigint | undefined) {
  return useReadContract({
    address: LAUNCHPAD_FACTORY_ADDRESS,
    abi,
    functionName: "calculateCreationCost",
    args: initialMintAmount !== undefined ? [initialMintAmount] : undefined,
  });
}

export function useLaunchpadFactoryCreateToken() {
  return useWriteContract();
}
