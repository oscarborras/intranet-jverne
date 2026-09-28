"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Re-fetches the page's server data (router.refresh) every `intervalMs` while the tab is
 * visible, and right away when the user comes back to it. Client state such as a half-typed
 * note is kept: only the server component props change.
 */
export function useAutoRefresh(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [router, intervalMs]);
}
