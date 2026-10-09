"use client";

import { useDeferredValue, useMemo } from "react";
import { normalizeText, searchWords } from "@/lib/text";

/**
 * Filters `items` as the user types: every word of `query` must appear somewhere
 * in `getText(item)`, in any order, ignoring case and accents.
 *
 * The searchable text is normalized once per item (not on every keystroke) and the
 * query is deferred so the input stays responsive with long lists.
 * `getText` should be stable (module-level function or useCallback).
 */
export function useTextFilter<T>(items: T[], getText: (item: T) => string, query: string): T[] {
  const index = useMemo(
    () => items.map((item) => ({ item, text: normalizeText(getText(item)) })),
    [items, getText],
  );
  const deferredQuery = useDeferredValue(query);

  return useMemo(() => {
    const words = searchWords(deferredQuery);
    if (words.length === 0) return items;
    return index.filter(({ text }) => words.every((w) => text.includes(w))).map(({ item }) => item);
  }, [index, items, deferredQuery]);
}
