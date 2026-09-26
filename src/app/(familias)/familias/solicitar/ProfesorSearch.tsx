"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

export interface ProfesorOption {
  id: string;
  profesor: string;
}

interface Props {
  value: ProfesorOption | null;
  onChange: (profesor: ProfesorOption | null) => void;
}

interface SearchResponse {
  profesores?: ProfesorOption[];
  hayMas?: boolean;
  error?: string;
}

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

/** Letters typed, ignoring spaces and commas (same rule as the API). */
function typedLength(q: string): number {
  return q.replace(/[\s,]+/g, "").length;
}

// Teacher picker that queries the server as the family types, so the full staff
// list is never sent to the browser.
export default function ProfesorSearch({ value, onChange }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfesorOption[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (value || typedLength(query) < MIN_QUERY_LENGTH) {
      setResults([]);
      setHayMas(false);
      setSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/citas/profesores?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = (await res.json().catch(() => ({}))) as SearchResponse;
        if (!res.ok) throw new Error(data.error ?? "Error al buscar profesorado");
        setResults(data.profesores ?? []);
        setHayMas(data.hayMas ?? false);
        setError(null);
        setActiveIndex(-1);
        setOpen(true);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Error al buscar profesorado");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  function select(p: ProfesorOption) {
    onChange(p);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange(null);
    // Focus the search box again once it is rendered
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Selected state: show the chosen teacher with a button to change it
  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 8px 8px 12px", border: "1px solid #c4b5fd", borderRadius: "6px", background: "#fff" }}>
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "#111827" }}>{value.profesor}</span>
        <button
          type="button"
          onClick={clear}
          aria-label={`Cambiar profesor/a (${value.profesor})`}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", minHeight: "40px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#f9fafb", color: "#374151", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
        >
          <X size={14} /> Cambiar
        </button>
      </div>
    );
  }

  const showHint = typedLength(query) > 0 && typedLength(query) < MIN_QUERY_LENGTH;
  const showNoResults = searched && !loading && !error && results.length === 0;
  const showList = open && results.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={16} color="#9ca3af" aria-hidden="true" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Buscar profesor/a por nombre o apellidos"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Escriba el nombre o apellidos del profesor/a"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 36px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none", background: "#fff" }}
        />
        {loading && (
          <Loader2 size={16} color="#6d28d9" aria-hidden="true" className="animate-spin" style={{ position: "absolute", right: "12px", top: "50%", marginTop: "-8px" }} />
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Profesorado encontrado"
          style={{ position: "absolute", zIndex: 10, left: 0, right: 0, top: "calc(100% + 4px)", margin: 0, padding: "4px", listStyle: "none", background: "#fff", border: "1px solid #ddd6fe", borderRadius: "8px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown fires before the input blur, so the click is not lost
              onMouseDown={(e) => { e.preventDefault(); select(p); }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{ padding: "12px", borderRadius: "6px", fontSize: "14px", color: "#111827", cursor: "pointer", background: i === activeIndex ? "#ede9fe" : "transparent" }}
            >
              {p.profesor}
            </li>
          ))}
          {hayMas && (
            <li role="presentation" style={{ padding: "8px 12px", fontSize: "12px", color: "#6b7280" }}>
              Hay más coincidencias: escriba también el nombre o el segundo apellido.
            </li>
          )}
        </ul>
      )}

      <p aria-live="polite" style={{ margin: "6px 0 0", fontSize: "12px", color: error ? "#dc2626" : "#6b7280", minHeight: "16px" }}>
        {error
          ? error
          : showHint
            ? `Escriba al menos ${MIN_QUERY_LENGTH} letras para buscar.`
            : showNoResults
              ? "No se ha encontrado ningún profesor/a con ese nombre."
              : "Puede escribir solo parte del nombre o apellidos, con o sin tildes."}
      </p>
    </div>
  );
}
