"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Phone, Plus, Trash2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutorizadoRecogida } from "@/lib/autorizados";

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500";

function formatFecha(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  alumnoId: string;
  /** Authorised people other than the student's guardians */
  autorizados: AutorizadoRecogida[];
  /** Guardians that are also authorised (hidden from the list) */
  tutoresAutorizados: number;
  /** Start expanded, e.g. while searching in authorised people */
  abiertoPorDefecto: boolean;
  puedeGestionar: boolean;
  onAnadido: (alumnoId: string, autorizado: AutorizadoRecogida) => void;
  onEliminado: (alumnoId: string, autorizadoId: string) => void;
}

/** Collapsible "Personas autorizadas" section of a student's card */
export function AutorizadosFicha({
  alumnoId, autorizados, tutoresAutorizados, abiertoPorDefecto, puedeGestionar, onAnadido, onEliminado,
}: Props) {
  const [abiertoManual, setAbiertoManual] = useState<boolean | null>(null);
  const [anadiendo, setAnadiendo] = useState(false);
  const abierto = abiertoManual ?? abiertoPorDefecto;

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <button
        onClick={() => setAbiertoManual(!abierto)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 py-1.5 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <UserCheck size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Autorizados a recoger
          <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {autorizados.length}
          </span>
        </span>
        <ChevronDown size={16} className={cn("text-gray-400 transition-transform", abierto && "rotate-180")} aria-hidden="true" />
      </button>

      {abierto && (
        <div className="mt-1 space-y-2">
          {autorizados.length === 0 ? (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              {tutoresAutorizados > 0 ? "Solo sus tutores/as legales" : "Sin personas autorizadas"}
            </p>
          ) : (
            <ul className="space-y-2">
              {autorizados.map((p) => (
                <Autorizado
                  key={p.id}
                  autorizado={p}
                  puedeGestionar={puedeGestionar}
                  onEliminado={() => onEliminado(alumnoId, p.id)}
                />
              ))}
            </ul>
          )}
          {autorizados.length > 0 && tutoresAutorizados > 0 && (
            <p className="text-xs text-gray-400">Además de sus tutores/as legales.</p>
          )}

          {puedeGestionar && (
            anadiendo ? (
              <FormularioAlta
                alumnoId={alumnoId}
                onCancelar={() => setAnadiendo(false)}
                onGuardado={(autorizado) => { onAnadido(alumnoId, autorizado); setAnadiendo(false); }}
              />
            ) : (
              <button
                onClick={() => setAnadiendo(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
              >
                <Plus size={16} /> Añadir autorizado
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Autorizado({ autorizado: p, puedeGestionar, onEliminado }: {
  autorizado: AutorizadoRecogida;
  puedeGestionar: boolean;
  onEliminado: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fecha = formatFecha(p.fecha_alta);

  async function eliminar() {
    setEliminando(true);
    setError(null);
    const res = await fetch(`/api/autorizados/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "No se ha podido eliminar.");
      setEliminando(false);
      return;
    }
    onEliminado();
  }

  return (
    <li className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">
            {p.nombre}
            {p.origen === "manual" && (
              <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 align-middle">Manual</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-gray-600">
            {p.dni && <span><span className="text-gray-400">DNI: </span><span className="font-mono">{p.dni}</span></span>}
            {p.telefono && (
              <a href={`tel:${p.telefono.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 text-blue-700 hover:underline py-0.5">
                <Phone size={14} className="flex-shrink-0" /> {p.telefono}
              </a>
            )}
          </div>
          {(p.usuario_alta || fecha) && (
            <p className="text-xs text-gray-400 mt-0.5">
              Alta{fecha && ` el ${fecha}`}{p.usuario_alta && ` por ${p.usuario_alta}`}
            </p>
          )}
        </div>
        {puedeGestionar && !confirmando && (
          <button
            onClick={() => setConfirmando(true)}
            aria-label={`Eliminar a ${p.nombre}`}
            className="p-2 -m-1 text-gray-400 hover:text-red-600 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {confirmando && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-red-700">¿Eliminar esta persona autorizada?</span>
          <button
            onClick={eliminar}
            disabled={eliminando}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium px-3 py-1.5 rounded-lg"
          >
            {eliminando && <Loader2 size={14} className="animate-spin" />} Eliminar
          </button>
          <button
            onClick={() => { setConfirmando(false); setError(null); }}
            disabled={eliminando}
            className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-white"
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function FormularioAlta({ alumnoId, onCancelar, onGuardado }: {
  alumnoId: string;
  onCancelar: () => void;
  onGuardado: (autorizado: AutorizadoRecogida) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await fetch("/api/autorizados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alumno_id: alumnoId, nombre, dni, telefono }),
    });
    const json = await res.json().catch(() => ({})) as { success?: boolean; error?: string; autorizado?: AutorizadoRecogida };
    if (!res.ok || !json.autorizado) {
      setError(json.error ?? "No se ha podido guardar.");
      setGuardando(false);
      return;
    }
    onGuardado(json.autorizado);
  }

  return (
    <form onSubmit={guardar} className="space-y-2 border border-emerald-200 bg-emerald-50/40 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-700">Nueva persona autorizada</p>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Apellidos, Nombre *"
        aria-label="Apellidos y nombre"
        autoFocus
        className={inputCls}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI/NIE" aria-label="DNI o NIE" className={inputCls} />
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" aria-label="Teléfono" type="tel" inputMode="tel" className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          {guardando && <Loader2 size={14} className="animate-spin" />} Guardar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="border border-gray-300 text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
