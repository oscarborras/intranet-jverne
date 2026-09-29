"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, MapPin, CalendarDays, Camera, LogOut, Play, CheckCircle2, MessageSquare, Loader2, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTADO_PORTAL_LABELS, MAX_NOTA_LENGTH } from "@/lib/externoMantenimiento";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { BLOCK_THEMES, CitaBlock, CitaField } from "@/components/citas/CitaBlocks";
import type { PeticionMantenimientoEstado, PeticionPrioridad } from "@/lib/types";

export interface NotaPortal {
  id: number;
  autor: string;
  contenido: string;
  created_at: string;
}

export interface PeticionPortal {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  prioridad: PeticionPrioridad;
  estado: PeticionMantenimientoEstado;
  created_at: string;
  finalizada_at: string | null;
  /** Short-lived signed URL generated on the server */
  fotoUrl: string | null;
  fotoNombre: string | null;
  notas: NotaPortal[];
}

interface Props {
  peticiones: PeticionPortal[];
  nombre: string;
  email: string;
}

type Tab = "abierta" | "en_progreso" | "finalizada";

const TABS: { id: Tab; label: string }[] = [
  { id: "abierta", label: "Pendientes" },
  { id: "en_progreso", label: "En progreso" },
  { id: "finalizada", label: "Finalizadas" },
];

const PRIORITY_CLASSES: Record<PeticionPrioridad, string> = {
  baja: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  alta: "bg-yellow-100 text-yellow-700",
  urgente: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<PeticionPrioridad, string> = { baja: "Baja", normal: "Normal", alta: "Alta", urgente: "Urgente" };
const PRIORITY_RANK: Record<PeticionPrioridad, number> = { urgente: 0, alta: 1, normal: 2, baja: 3 };

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
});

async function postJson(url: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "No se pudo completar la acción";
  } catch {
    return "Sin conexión. Inténtelo de nuevo.";
  }
}

function PeticionCard({ p, onChanged }: { p: PeticionPortal; onChanged: () => void }) {
  const [busy, setBusy] = useState<"estado" | "nota" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);

  async function cambiarEstado(estado: PeticionMantenimientoEstado) {
    setBusy("estado");
    setError(null);
    const err = await postJson("/api/externo/estado", { peticionId: p.id, estado });
    setBusy(null);
    setConfirmFinalizar(false);
    if (err) setError(err);
    else onChanged();
  }

  async function enviarNota() {
    if (!nota.trim()) return;
    setBusy("nota");
    setError(null);
    const err = await postJson("/api/externo/nota", { peticionId: p.id, contenido: nota });
    setBusy(null);
    if (err) setError(err);
    else {
      setNota("");
      onChanged();
    }
  }

  const activa = p.estado === "abierta" || p.estado === "en_progreso";

  return (
    <article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-3 sm:p-4 space-y-3">
        {/* Header: code, priority and title */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-mono text-gray-500">{p.codigo}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", PRIORITY_CLASSES[p.prioridad])}>
              Prioridad {PRIORITY_LABELS[p.prioridad].toLowerCase()}
            </span>
          </div>
          <h2 className="font-semibold text-gray-900 leading-snug">{p.titulo}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <CitaBlock title="Ubicación" icon={MapPin} theme={BLOCK_THEMES.blue}>
            <CitaField label="Lugar">{p.ubicacion || <span className="text-gray-500 italic">Sin indicar</span>}</CitaField>
          </CitaBlock>

          <CitaBlock title="Fechas" icon={CalendarDays} theme={BLOCK_THEMES.red}>
            <CitaField label="Creada">{dateTimeFormatter.format(new Date(p.created_at))}</CitaField>
            {p.estado === "finalizada" && p.finalizada_at && (
              <CitaField label="Finalizada">{dateTimeFormatter.format(new Date(p.finalizada_at))}</CitaField>
            )}
          </CitaBlock>

          {(p.descripcion || p.fotoUrl) && (
            <CitaBlock title="Descripción" icon={FileText} theme={BLOCK_THEMES.amber} className="sm:col-span-2" plain>
              {p.descripcion && <p>{p.descripcion}</p>}
              {p.fotoUrl && (
                <a
                  href={p.fotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-amber-200 bg-white text-sm text-amber-900 font-medium hover:bg-amber-50", p.descripcion && "mt-2")}
                >
                  <Camera size={14} aria-hidden="true" /> {p.fotoNombre ?? "Ver foto"}
                </a>
              )}
            </CitaBlock>
          )}

          {/* Notes: existing ones plus the box to add a new one */}
          <CitaBlock title={`Notas${p.notas.length > 0 ? ` (${p.notas.length})` : ""}`} icon={MessageSquare} theme={BLOCK_THEMES.violet} className="sm:col-span-2" plain>
            {p.notas.length > 0 && (
              <ul className="space-y-2 mb-2 whitespace-normal">
                {p.notas.map((n) => (
                  <li key={n.id} className="bg-white border border-violet-100 rounded-lg px-3 py-2">
                    <p className="text-sm text-gray-800 whitespace-pre-line">{n.contenido}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{n.autor} · {dateTimeFormatter.format(new Date(n.created_at))}</p>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor={`nota-${p.id}`} className="sr-only">Añadir una nota</label>
            <div className="flex gap-2 whitespace-normal">
              <textarea
                id={`nota-${p.id}`}
                rows={2}
                maxLength={MAX_NOTA_LENGTH}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Añadir una nota (material necesario, próxima visita…)"
                className="flex-1 min-w-0 border border-violet-200 bg-white rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="button"
                onClick={enviarNota}
                disabled={!nota.trim() || busy !== null}
                aria-label="Guardar nota"
                className="self-end flex items-center justify-center w-11 h-11 rounded-lg bg-violet-700 text-white disabled:opacity-40"
              >
                {busy === "nota" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </CitaBlock>
        </div>

        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </div>

      {/* Actions */}
      {activa && (
        <div className="bg-gray-50 border-t border-gray-100 p-3 flex flex-col sm:flex-row gap-2">
          {confirmFinalizar ? (
            <>
              <p className="text-sm text-gray-700 flex-1 self-center">¿Marcar esta petición como finalizada?</p>
              <button
                type="button"
                onClick={() => cambiarEstado("finalizada")}
                disabled={busy !== null}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy === "estado" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Sí, finalizar
              </button>
              <button
                type="button"
                onClick={() => setConfirmFinalizar(false)}
                className="px-4 py-3 min-h-[44px] rounded-lg border border-gray-200 bg-white text-sm text-gray-700"
              >
                Volver
              </button>
            </>
          ) : (
            <>
              {p.estado === "abierta" && (
                <button
                  type="button"
                  onClick={() => cambiarEstado("en_progreso")}
                  disabled={busy !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {busy === "estado" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Empezar
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmFinalizar(true)}
                disabled={busy !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border border-green-600 text-green-700 bg-white text-sm font-semibold disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> Marcar como finalizada
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export function PortalMantenimientoClient({ peticiones, nombre, email }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("abierta");
  // New validated requests show up without reloading; half-typed notes are kept
  useAutoRefresh();

  const lista = peticiones
    .filter((p) => p.estado === tab)
    .sort((a, b) =>
      tab === "finalizada"
        ? (b.finalizada_at ?? "").localeCompare(a.finalizada_at ?? "")
        : PRIORITY_RANK[a.prioridad] - PRIORITY_RANK[b.prioridad] || a.created_at.localeCompare(b.created_at)
    );
  const count = (t: Tab) => peticiones.filter((p) => p.estado === t).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <header className="bg-orange-500 rounded-xl px-4 py-4 flex items-center gap-3 text-white">
        <span className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Wrench size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold leading-tight">Portal de mantenimiento</h1>
          <p className="text-xs text-white truncate">IES Julio Verne · {nombre} ({email})</p>
        </div>
        <form action="/api/externo/logout" method="post">
          <button type="submit" className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium">
            <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Estado de las peticiones" className="grid grid-cols-3 bg-gray-100 rounded-lg p-1 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-2 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-colors",
              tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
            )}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {t.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold tabular-nums",
                  tab === t.id ? "bg-orange-500 text-white" : "bg-gray-300 text-gray-700"
                )}
              >
                {count(t.id)}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 px-1">
        {tab === "finalizada" ? "Últimos 30 días · " : ""}Se actualiza automáticamente cada minuto
      </p>

      {/* Cards */}
      {lista.length === 0 ? (
        <p className="text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-100 py-12">
          No hay peticiones {tab === "finalizada" ? "finalizadas recientemente" : `en «${ESTADO_PORTAL_LABELS[tab]}»`}
        </p>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => (
            <PeticionCard key={p.id} p={p} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}
