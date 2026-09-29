"use client";

import { useCallback, useEffect, useRef } from "react";

/** Max average ms between keystrokes to consider a burst a scanner read (humans are slower). */
const MAX_AVG_INTERVAL_MS = 40;
const MIN_LENGTH = 3;

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

/** Scanned codes are compared trimmed and upper-cased. */
export function normalizarCodigo(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * USB / Bluetooth barcode scanners behave as keyboards: they type the code very fast
 * and press Enter. This hook catches those bursts anywhere on the page when no text
 * field has the focus, so a scan is never lost. Reads typed into a focused
 * ScannerInput are handled by that input itself.
 */
export function useBarcodeScanner(onScan: (codigo: string) => void, enabled = true) {
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let first = 0;
    let last = 0;

    function onKeyDown(e: KeyboardEvent) {
      if (isEditable(document.activeElement)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const now = performance.now();
      if (now - last > 300) { buffer = ""; first = now; }
      last = now;

      if (e.key === "Enter") {
        const avg = buffer.length > 1 ? (now - first) / buffer.length : Infinity;
        if (buffer.length >= MIN_LENGTH && avg <= MAX_AVG_INTERVAL_MS) {
          e.preventDefault();
          onScanRef.current(normalizarCodigo(buffer));
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}

/**
 * Returns `accept(codigo)`: false when the same code was already read within
 * `debounceMs` (scanners and cameras often fire twice for one read).
 */
export function useScanDebounce(debounceMs = 2000): (codigo: string) => boolean {
  const lastRef = useRef<{ codigo: string; at: number } | null>(null);
  return useCallback((codigo: string) => {
    const now = Date.now();
    const prev = lastRef.current;
    lastRef.current = { codigo, at: now };
    return !(prev && prev.codigo === codigo && now - prev.at < debounceMs);
  }, [debounceMs]);
}
