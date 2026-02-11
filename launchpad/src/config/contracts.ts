import { getAddress } from "viem";
import { thanosSepolia } from "./chains";

const EXPLORER = thanosSepolia.blockExplorers.default.url;

const envFactory =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LAUNCHPAD_FACTORY : undefined;
const envVault =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TON_VAULT : undefined;

export const LAUNCHPAD_FACTORY_ADDRESS = getAddress(
  envFactory ?? "0xc2e17015d43E9D97C324ea297DF9e34b726146a8"
);
export const TON_VAULT_ADDRESS = getAddress(
  envVault ?? "0x7d39bF3A88daE06A91720436d4311B84a705552C"
);
export const explorerAddressUrl = (address: string) => `${EXPLORER}/address/${address}`;
export const explorerTxUrl = (txHash: string) => `${EXPLORER}/tx/${txHash}`;
