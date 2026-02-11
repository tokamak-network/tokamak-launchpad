import { useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useWaitForTransactionReceipt } from "wagmi";

/**
 * Show a persistent loading toast while a transaction is pending,
 * then swap to success/error once the receipt lands or the write fails.
 */
export function useTxToast({
  txHash,
  isError,
  error,
  pendingMessage,
  successMessage,
}: {
  txHash: `0x${string}` | undefined;
  isError: boolean;
  error: Error | null;
  pendingMessage: string;
  successMessage: string;
}) {
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });
  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (txHash && !receipt && toastId.current === null) {
      toastId.current = toast.loading(pendingMessage, { duration: Infinity });
    }
  }, [txHash, receipt, pendingMessage]);

  useEffect(() => {
    if (receipt && toastId.current !== null) {
      toast.success(successMessage, { id: toastId.current, duration: 4000 });
      toastId.current = null;
    }
  }, [receipt, successMessage]);

  useEffect(() => {
    if (isError && error) {
      if (toastId.current !== null) {
        toast.error(error.message, { id: toastId.current, duration: 6000 });
        toastId.current = null;
      } else {
        toast.error(error.message, { duration: 6000 });
      }
    }
  }, [isError, error]);

  return { receipt, isConfirmed: !!receipt };
}

/**
 * Lightweight variant without receipt tracking — just success/error toasts.
 * Useful for admin actions where waiting for receipt isn't critical.
 */
export function useSimpleToast({
  isSuccess,
  isError,
  error,
  successMessage,
}: {
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  successMessage: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (isSuccess && !fired.current) {
      fired.current = true;
      toast.success(successMessage);
    }
  }, [isSuccess, successMessage]);

  useEffect(() => {
    if (isError && error) {
      toast.error(error.message, { duration: 6000 });
    }
  }, [isError, error]);

  // Reset when a new write starts
  const reset = useCallback(() => {
    fired.current = false;
  }, []);

  return { reset };
}
