"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseKanbanFilters, writeKanbanFilters, type KanbanFilterState } from "@/lib/kanbanFilters";

/**
 * Board filters stored in the URL. Uses history.replaceState (which Next.js syncs with
 * useSearchParams) instead of router.replace, so typing in the search box never
 * re-requests the page from the server. The day filters are the exception: the page
 * loads the old finished requests of that day, so changing them goes through the router.
 */
export function useKanbanFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [filters, setFiltersState] = useState<KanbanFilterState>(() =>
    parseKanbanFilters(new URLSearchParams(searchParams.toString()))
  );

  const setFilters = useCallback(
    (next: KanbanFilterState) => {
      const prev = parseKanbanFilters(new URLSearchParams(window.location.search));
      setFiltersState(next);
      const qs = writeKanbanFilters(new URLSearchParams(window.location.search), next).toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (prev.registrada !== next.registrada || prev.resuelta !== next.resuelta) {
        router.replace(url, { scroll: false });
      } else {
        window.history.replaceState(null, "", url);
      }
    },
    [pathname, router]
  );

  return [filters, setFilters] as const;
}
