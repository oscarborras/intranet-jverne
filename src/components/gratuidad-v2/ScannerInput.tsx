"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { normalizarCodigo } from "./useBarcodeScanner";

interface Props {
  onScan: (codigo: string) => void;
  /** Enter on an empty field (scanners never send it): e.g. go to the next student */
  onEmptyEnter?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ScannerInputHandle {
  focus: () => void;
}

/** Focus the field only on devices with a precise pointer (PC): on phones it would open the keyboard. */
function puedeAutoFocus(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
}

/**
 * Text field that receives scanner reads (or typed codes) and submits on Enter.
 * On PCs it keeps the focus so the scanner always writes here.
 */
export const ScannerInput = forwardRef<ScannerInputHandle, Props>(function ScannerInput(
  { onScan, onEmptyEnter, disabled, placeholder = "Escanea o escribe el código y pulsa Enter" },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  useEffect(() => {
    if (!disabled && puedeAutoFocus()) inputRef.current?.focus();
  }, [disabled]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = normalizarCodigo(value);
    setValue("");
    if (codigo) onScan(codigo);
    else onEmptyEnter?.();
  }

  // Refocus after clicking elsewhere (not when the user moves to another field)
  function handleBlur() {
    if (!puedeAutoFocus() || disabled) return;
    setTimeout(() => {
      const active = document.activeElement;
      const tag = active?.tagName;
      const enOtroCampo = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const enModal = active?.closest("[role=dialog]");
      if (!enOtroCampo && !enModal) inputRef.current?.focus();
    }, 150);
  }

  return (
    <div className="relative">
      <ScanBarcode size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Código de barras del libro"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="send"
        className="w-full border-2 border-gray-300 rounded-xl pl-11 pr-3 py-3 text-base font-mono tracking-wide focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50"
      />
    </div>
  );
});
