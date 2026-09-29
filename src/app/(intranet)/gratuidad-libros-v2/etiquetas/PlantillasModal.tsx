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
  nums: Record<NumKey, string>;
}

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

function toForm(p: PlantillaEtiqueta | null, copia = false): Form {
  const n = (v: number | undefined, def: string) => (v != null ? String(v).replace(".", ",") : def);
  return {
    nombre: p ? (copia ? `${p.nombre} (copia)` : p.nombre) : "",
    tipo: p?.tipo ?? "a4",
    predeterminada: copia ? false : (p?.predeterminada ?? false),
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
      const num = Number(raw.replace(",", "."));
      if (Number.isNaN(num) || num < 0) return `${label}: valor no válido.`;
      v[key] = key === "columnas" || key === "filas" ? Math.round(num) : num;
    }
    if (v.ancho_mm <= 0 || v.alto_mm <= 0) return "El ancho y el alto deben ser mayores que 0.";
    if (v.columnas < 1 || v.filas < 1) return "Debe haber al menos una fila y una columna.";
    if (f.tipo === "a4") {
      const w = v.margen_izq_mm + v.columnas * v.ancho_mm + (v.columnas - 1) * v.sep_horizontal_mm;
      const h = v.margen_sup_mm + v.filas * v.alto_mm + (v.filas - 1) * v.sep_vertical_mm;
      if (w > 210.5 || h > 297.5) return `Las etiquetas no caben en un A4 (ocupan ${w.toFixed(1)} × ${h.toFixed(1)} mm).`;
    }
    return { nombre: f.nombre.trim(), tipo: f.tipo, predeterminada: f.predeterminada, ...v };
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
                  inputMode="decimal"
                  className={inputCls}
                />
              </label>
            ))}
          </div>
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
