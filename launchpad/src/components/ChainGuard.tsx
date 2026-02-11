import { useAccount, useSwitchChain } from "wagmi";
import { thanosSepolia } from "../config/chains";

export function ChainGuard() {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected || chain?.id === thanosSepolia.id) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      <p className="text-sm">Switch to Thanos Sepolia</p>
      <button
        type="button"
        onClick={() => switchChain({ chainId: thanosSepolia.id })}
        disabled={isPending}
        className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-amber-600"
      >
        {isPending ? "…" : "Switch"}
      </button>
    </div>
  );
}
