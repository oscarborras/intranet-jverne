"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseKanbanFilters, writeKanbanFilters, type KanbanFilterState } from "@/lib/kanbanFilters";

/**
 * Board filters stored in the URL. Uses history.replaceState (which Next.js syncs with
 * useSearchParams) instead of router.replace, so typing in the search box never
 * re-requests the page from the server.
 */
export function useKanbanFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [filters, setFiltersState] = useState<KanbanFilterState>(() =>
    parseKanbanFilters(new URLSearchParams(searchParams.toString()))
  );

  const setFilters = useCallback(
    (next: KanbanFilterState) => {
      setFiltersState(next);
      const qs = writeKanbanFilters(new URLSearchParams(window.location.search), next).toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname]
  );

  return [filters, setFilters] as const;
}
