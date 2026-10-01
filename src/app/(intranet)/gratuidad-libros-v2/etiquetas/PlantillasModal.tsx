"use client";

import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Star, Trash2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/gratuidad-v2/Modal";
import type { PlantillaEtiqueta, TipoPlantillaEtiqueta } from "@/lib/types/gratuidadV2";

interface Props {
  plantillas: PlantillaEtiqueta[];
  onChange: (plantillas: PlantillaEtiqueta[]) => void;
  onClose: () => void;
}

type NumKey = "ancho_mm" | "alto_mm" | "columnas" | "filas" | "margen_sup_mm" | "margen_izq_mm" | "sep_horizontal_mm" | "sep_vertical_mm";

interface Form {
  nombre: string;
  tipo: TipoPlantillaEtiqueta;
  predeterminada: boolean;
  notas: string;
  nums: Record<NumKey, string>;
}

const MAX_NOTAS = 2000;

/** Margins also calibrate the printer: they may be negative to shift the sheet up / left */
const MARGEN_MIN = -20;
const MARGEN_MAX = 100;
const A4_ANCHO = 210;
const A4_ALTO = 297;

const NUM_FIELDS: { key: NumKey; label: string; a4Only?: boolean }[] = [
  { key: "ancho_mm", label: "Ancho etiqueta (mm)" },
  { key: "alto_mm", label: "Alto etiqueta (mm)" },
  { key: "columnas", label: "Columnas", a4Only: true },
  { key: "filas", label: "Filas", a4Only: true },
  { key: "margen_sup_mm", label: "Margen superior (mm)", a4Only: true },
  { key: "margen_izq_mm", label: "Margen izquierdo (mm)", a4Only: true },
  { key: "sep_horizontal_mm", label: "Separación entre columnas (mm)", a4Only: true },
  { key: "sep_vertical_mm", label: "Separación entre filas (mm)", a4Only: true },
];

function esMargen(key: NumKey): boolean {
  return key === "margen_sup_mm" || key === "margen_izq_mm";
}

function numero(raw: string): number {
  return Number(raw.trim().replace(",", "."));
}

/**
 * Part of the label grid that falls outside the A4 sheet (it would be cut when printing).
 * Returns null when the values are not numbers yet.
 */
function recorteA4(f: Form): { izquierda: number; derecha: number; arriba: number; abajo: number } | null {
  if (f.tipo !== "a4") return null;
  const n = Object.fromEntries((Object.keys(f.nums) as NumKey[]).map((k) => [k, numero(f.nums[k])])) as Record<NumKey, number>;
  if (Object.values(n).some((v) => Number.isNaN(v))) return null;
  const derechaGrid = n.margen_izq_mm + n.columnas * n.ancho_mm + (n.columnas - 1) * n.sep_horizontal_mm;
  const abajoGrid = n.margen_sup_mm + n.filas * n.alto_mm + (n.filas - 1) * n.sep_vertical_mm;
  return {
    izquierda: Math.max(0, -n.margen_izq_mm),
    derecha: Math.max(0, derechaGrid - A4_ANCHO),
    arriba: Math.max(0, -n.margen_sup_mm),
    abajo: Math.max(0, abajoGrid - A4_ALTO),
  };
}

function toForm(p: PlantillaEtiqueta | null, copia = false): Form {
  const n = (v: number | undefined, def: string) => (v != null ? String(v).replace(".", ",") : def);
  return {
    nombre: p ? (copia ? `${p.nombre} (copia)` : p.nombre) : "",
    tipo: p?.tipo ?? "a4",
    predeterminada: copia ? false : (p?.predeterminada ?? false),
    notas: p?.notas ?? "",
    nums: {
      ancho_mm: n(p?.ancho_mm, "70"),
      alto_mm: n(p?.alto_mm, "37"),
      columnas: n(p?.columnas, "3"),
      filas: n(p?.filas, "8"),
      margen_sup_mm: n(p?.margen_sup_mm, "0"),
      margen_izq_mm: n(p?.margen_izq_mm, "0"),
      sep_horizontal_mm: n(p?.sep_horizontal_mm, "0"),
      sep_vertical_mm: n(p?.sep_vertical_mm, "0"),
    },
  };
}

export function PlantillasModal({ plantillas, onChange, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [editando, setEditando] = useState<PlantillaEtiqueta | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function abrir(p: PlantillaEtiqueta | null, copia = false) {
    setEditando(copia ? null : p);
    setForm(toForm(p, copia));
    setError(null);
  }

  function validar(f: Form): Omit<PlantillaEtiqueta, "id" | "created_at" | "updated_at" | "campos" | "activo"> | string {
    if (!f.nombre.trim()) return "El nombre es obligatorio.";
    const v = {} as Record<NumKey, number>;
    for (const { key, label, a4Only } of NUM_FIELDS) {
      const raw = f.tipo === "zebra" && a4Only ? (key === "columnas" || key === "filas" ? "1" : "0") : f.nums[key];
      const num = numero(raw);
      if (Number.isNaN(num)) return `${label}: valor no válido.`;
      if (esMargen(key) ? num < MARGEN_MIN || num > MARGEN_MAX : num < 0) {
        return esMargen(key) ? `${label}: debe estar entre ${MARGEN_MIN} y ${MARGEN_MAX} mm.` : `${label}: valor no válido.`;
      }
      v[key] = key === "columnas" || key === "filas" ? Math.round(num) : num;
    }
    if (v.ancho_mm <= 0 || v.alto_mm <= 0) return "El ancho y el alto deben ser mayores que 0.";
    if (v.columnas < 1 || v.filas < 1) return "Debe haber al menos una fila y una columna.";
    // A grid slightly larger than A4 is allowed (calibration): the form shows how much is cut
    if (f.notas.length > MAX_NOTAS) return `Las notas no pueden superar ${MAX_NOTAS} caracteres.`;
    return { nombre: f.nombre.trim(), tipo: f.tipo, predeterminada: f.predeterminada, notas: f.notas.trim() || null, ...v };
  }

  async function guardar() {
    if (!form) return;
    const payload = validar(form);
    if (typeof payload === "string") { setError(payload); return; }
    setSaving(true);
    setError(null);

    const query = editando
      ? supabase.from("gplv2_plantillas_etiquetas").update(payload).eq("id", editando.id)
      : supabase.from("gplv2_plantillas_etiquetas").insert(payload);
    const { data, error: err } = await query.select().single();
    if (err || !data) { setError(err?.message ?? "Error al guardar"); setSaving(false); return; }
    const saved = data as PlantillaEtiqueta;

    let next = editando ? plantillas.map((p) => (p.id === saved.id ? saved : p)) : [...plantillas, saved];
    // Only one default per printer type
    if (saved.predeterminada) {
      const otras = next.filter((p) => p.tipo === saved.tipo && p.id !== saved.id && p.predeterminada).map((p) => p.id);
      if (otras.length > 0) {
        await supabase.from("gplv2_plantillas_etiquetas").update({ predeterminada: false }).in("id", otras);
        next = next.map((p) => (otras.includes(p.id) ? { ...p, predeterminada: false } : p));
      }
    }
    onChange(next.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, "es")));
    setSaving(false);
    setForm(null);
  }

  async function eliminar(p: PlantillaEtiqueta) {
    if (plantillas.length <= 1) { window.alert("Debe quedar al menos una plantilla."); return; }
    if (!window.confirm(`¿Eliminar la plantilla «${p.nombre}»?`)) return;
    const { error: err } = await supabase.from("gplv2_plantillas_etiquetas").delete().eq("id", p.id);
    if (err) { window.alert(err.message); return; }
    onChange(plantillas.filter((x) => x.id !== p.id));
  }

  if (form) {
    return (
      <Modal
        titulo={editando ? "Editar plantilla" : "Nueva plantilla"}
        onClose={() => setForm(null)}
        ancho="lg"
        footer={
          <>
            <button onClick={() => setForm(null)} className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={15} /> Volver
            </button>
            <button onClick={guardar} disabled={saving} className="px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Nombre</span>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="p. ej. Apli 01273" />
            </label>
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Tipo</span>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPlantillaEtiqueta })} className={inputCls}>
                <option value="a4">Hoja A4 (Apli, Avery…)</option>
                <option value="zebra">Rollo (impresora Zebra)</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {NUM_FIELDS.filter((f) => form.tipo === "a4" || !f.a4Only).map(({ key, label }) => (
              <label key={key} className="block">
                <span className="block font-medium text-gray-700 mb-1">{label}</span>
                <input
                  value={form.nums[key]}
                  onChange={(e) => setForm({ ...form, nums: { ...form.nums, [key]: e.target.value } })}
                  // Mobile decimal keypads often lack the minus sign needed for negative margins
                  inputMode={esMargen(key) ? "text" : "decimal"}
                  className={inputCls}
                />
                {esMargen(key) && (
                  <span className="block text-xs text-gray-400 mt-1">
                    Admite negativos para desplazar la hoja {key === "margen_sup_mm" ? "hacia arriba" : "hacia la izquierda"}.
                  </span>
                )}
              </label>
            ))}
          </div>
          {(() => {
            const r = recorteA4(form);
            if (!r) return null;
            const partes = [
              r.izquierda > 0.05 && `${r.izquierda.toFixed(1)} mm por la izquierda`,
              r.derecha > 0.05 && `${r.derecha.toFixed(1)} mm por la derecha`,
              r.arriba > 0.05 && `${r.arriba.toFixed(1)} mm por arriba`,
              r.abajo > 0.05 && `${r.abajo.toFixed(1)} mm por abajo`,
            ].filter(Boolean);
            if (partes.length === 0) return null;
            return (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Las etiquetas se salen del A4: se recortarán {partes.join(", ")}. Es normal al calibrar hojas que ocupan
                todo el ancho (como Apli 3×8); si el recorte es grande, revisa las medidas.
              </p>
            );
          })()}
          <label className="block">
            <span className="block font-medium text-gray-700 mb-1">Notas de impresión</span>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={3}
              maxLength={MAX_NOTAS}
              placeholder={"Ej.: Escala 100 % (tamaño real), márgenes «Ninguno», bandeja manual, papel «Etiquetas»…"}
              className={`${inputCls} resize-y`}
            />
            <span className="block text-xs text-gray-400 mt-1">Se mostrarán al imprimir con esta plantilla.</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.predeterminada} onChange={(e) => setForm({ ...form, predeterminada: e.target.checked })} className="w-4 h-4 rounded" />
            Plantilla predeterminada para este tipo
          </label>
          <p className="text-xs text-gray-400">
            Consejo: imprime una hoja con «Dibujar bordes» en papel normal y ponla a contraluz sobre la hoja de etiquetas para ajustar márgenes.
          </p>
          {error && <p className="text-red-600">{error}</p>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Plantillas de etiquetas"
      onClose={onClose}
      ancho="lg"
      footer={
        <button onClick={() => abrir(null)} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          <Plus size={15} /> Nueva plantilla
        </button>
      }
    >
      <ul className="divide-y divide-gray-100 -my-2">
        {plantillas.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                {p.nombre}
                {p.predeterminada && <Star size={13} className="text-amber-500 fill-amber-400" aria-label="Predeterminada" />}
              </p>
              <p className="text-xs text-gray-500">
                {p.tipo === "a4" ? `A4 · ${p.columnas}×${p.filas} · ` : "Zebra · "}
                {p.ancho_mm}×{p.alto_mm} mm
              </p>
              {p.notas && <p className="text-xs text-gray-400 truncate" title={p.notas}>{p.notas}</p>}
            </div>
            <button onClick={() => abrir(p)} title="Editar" aria-label={`Editar ${p.nombre}`} className={iconBtn}><Pencil size={15} /></button>
            <button onClick={() => abrir(p, true)} title="Duplicar" aria-label={`Duplicar ${p.nombre}`} className={iconBtn}><Copy size={15} /></button>
            <button onClick={() => eliminar(p)} title="Eliminar" aria-label={`Eliminar ${p.nombre}`} className={`${iconBtn} hover:text-red-600 hover:bg-red-50`}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const iconBtn = "p-2.5 text-gray-400 rounded-lg hover:text-blue-600 hover:bg-blue-50";
