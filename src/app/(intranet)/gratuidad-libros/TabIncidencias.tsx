"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle, BookOpen, CheckCircle, ChevronDown, Clock, Plus, Printer, Search, Users, X,
} from "lucide-react";
import type {
  LibroCatalogo, Alumno,
  TipoIncidencia, EstadoIncidencia, EstadoDevolucion, Incidencia, IncidenciaHistorial,
} from "@/lib/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoIncidencia, { label: string; className: string }> = {
  deterioro: { label: "Deterioro", className: "text-amber-700 bg-amber-50 border-amber-200" },
  perdida: { label: "Pérdida", className: "text-red-700 bg-red-50 border-red-200" },
  reclamacion: { label: "Reclamación", className: "text-blue-700 bg-blue-50 border-blue-200" },
  robo: { label: "Robo", className: "text-purple-700 bg-purple-50 border-purple-200" },
  otro: { label: "Otro", className: "text-gray-600 bg-gray-50 border-gray-200" },
};

const ESTADO_CONFIG: Record<EstadoIncidencia, { label: string; rowClass: string; badgeClass: string; dot: string }> = {
  abierta: { label: "Abierta", rowClass: "", badgeClass: "text-red-700 bg-red-50", dot: "bg-red-500" },
  en_gestion: { label: "En gestión", rowClass: "", badgeClass: "text-amber-700 bg-amber-50", dot: "bg-amber-500" },
  resuelta: { label: "Resuelta", rowClass: "", badgeClass: "text-green-700 bg-green-50", dot: "bg-green-500" },
  archivada: { label: "Archivada", rowClass: "opacity-50", badgeClass: "text-gray-500 bg-gray-100", dot: "bg-gray-400" },
};

type FiltroEstado = EstadoIncidencia | "todas";

const ESTADO_LIBRO_CONFIG: Record<EstadoDevolucion, { label: string; active: string; hover: string }> = {
  bueno: { label: "Reutilizable", active: "bg-green-100 text-green-700 border-green-300", hover: "hover:bg-green-50 hover:border-green-200" },
  deteriorado: { label: "No reutilizable", active: "bg-amber-100 text-amber-700 border-amber-300", hover: "hover:bg-amber-50 hover:border-amber-200" },
  perdido: { label: "Perdido", active: "bg-red-100 text-red-700 border-red-300", hover: "hover:bg-red-50 hover:border-red-200" },
};

const FILTROS: { key: FiltroEstado; label: string }[] = [
  { key: "abierta", label: "Abiertas" },
  { key: "en_gestion", label: "En gestión" },
  { key: "resuelta", label: "Resueltas" },
  { key: "archivada", label: "Archivadas" },
  { key: "todas", label: "Todas" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function initialsFromNombre(nombre: string): string {
  const [ap = "", nom = ""] = nombre.split(",").map((s) => s.trim());
  return ((ap[0] ?? "") + (nom[0] ?? "")).toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Profesor { id: string; nombre: string; }

interface Props {
  libros: LibroCatalogo[];
  alumnos: Alumno[];
  cursoEscolar: string;
  myProfesorId: string | null;
  canManage: boolean;
  profesores: Profesor[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TabIncidencias({ libros, alumnos, cursoEscolar, myProfesorId, canManage, profesores }: Props) {
  const supabase = createClient();

  // ── State principal ────────────────────────────────────────────────────────
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>("abierta");
  const [selected, setSelected] = useState<Incidencia | null>(null);
  const [showNueva, setShowNueva] = useState(false);
  const [overrideProfesorId, setOverrideProfesorId] = useState<string>(myProfesorId ?? "");

  const efectivoProfesorId = myProfesorId ?? (overrideProfesorId || null);

  // ── State: cambio de estado en detalle ────────────────────────────────────
  const [cambioEstado, setCambioEstado] = useState<EstadoIncidencia>("en_gestion");
  const [cambioNota, setCambioNota] = useState("");
  const [savingCambio, setSavingCambio] = useState(false);
  const [cambioError, setCambioError] = useState<string | null>(null);

  // ── State: cambio de estado del libro ────────────────────────────────────
  const [cambioEstadoLibro, setCambioEstadoLibro] = useState<EstadoDevolucion | null>(null);
  const [savingEstadoLibro, setSavingEstadoLibro] = useState(false);

  // ── State: búsqueda ──────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState("");

  // ── State: acordeón y gestión masiva ─────────────────────────────────────
  const [collapsedAlumnos, setCollapsedAlumnos] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<{ alumnoKey: string; alumno_nombre: string; alumno_grupo: string; incidencias: Incidencia[] } | null>(null);
  const [bulkEstado, setBulkEstado] = useState<EstadoIncidencia>("resuelta");
  const [bulkNota, setBulkNota] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  // ── State: nueva incidencia ────────────────────────────────────────────────
  const [alumnoSearch, setAlumnoSearch] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const [nuevaForm, setNuevaForm] = useState({
    alumno_id: null as string | null,
    alumno_nombre: "",
    alumno_grupo: "",
    libro_id: "",
    tipo: "deterioro" as TipoIncidencia,
    descripcion: "",
  });
  const [savingNueva, setSavingNueva] = useState(false);
  const [nuevaError, setNuevaError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchIncidencias = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gratuidad_incidencias")
      .select(`
        *,
        libro:libros_catalogo(titulo, isbn, editorial),
        prestamo:prestamos_libros(fecha_devolucion, estado_devolucion, estado_revision, en_revision),
        historial:gratuidad_incidencias_historial(
          id, estado, nota, created_at,
          profesor:profesores(profesor)
        )
      `)
      .eq("curso_escolar", cursoEscolar)
      .order("created_at", { ascending: false });
    setIncidencias((data ?? []) as unknown as Incidencia[]);
    setLoading(false);
  }, [supabase, cursoEscolar]);

  useEffect(() => { fetchIncidencias(); }, [fetchIncidencias]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filtro === "todas" ? incidencias : incidencias.filter((i) => i.estado === filtro),
    [incidencias, filtro]
  );

  const counts = useMemo(
    () => incidencias.reduce<Partial<Record<EstadoIncidencia, number>>>((acc, i) => {
      acc[i.estado] = (acc[i.estado] ?? 0) + 1;
      return acc;
    }, {}),
    [incidencias]
  );

  const librosActivos = useMemo(
    () => libros.filter((l) => l.activo).sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [libros]
  );

  const grouped = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const source = q
      ? filtered.filter((i) => i.alumno_nombre.toLowerCase().includes(q) || i.alumno_grupo.toLowerCase().includes(q))
      : filtered;
    const map = new Map<string, { alumnoKey: string; alumno_nombre: string; alumno_grupo: string; incidencias: Incidencia[] }>();
    for (const inc of source) {
      const key = `${inc.alumno_id ?? inc.alumno_nombre}|||${inc.alumno_grupo}`;
      if (!map.has(key)) map.set(key, { alumnoKey: key, alumno_nombre: inc.alumno_nombre, alumno_grupo: inc.alumno_grupo, incidencias: [] });
      map.get(key)!.incidencias.push(inc);
    }
    return Array.from(map.values());
  }, [filtered, busqueda]);

  const alumnosSugeridos = useMemo(() => {
    if (!alumnoSearch.trim()) return [];
    const q = alumnoSearch.toLowerCase();
    return alumnos.filter((a) => a.alumno.toLowerCase().includes(q)).slice(0, 8);
  }, [alumnos, alumnoSearch]);

  // ── Handlers: detalle ────────────────────────────────────────────────────
  function openDetail(inc: Incidencia) {
    setSelected(inc);
    // Pre-select next logical state
    const next: Record<EstadoIncidencia, EstadoIncidencia> = {
      abierta: "en_gestion",
      en_gestion: "resuelta",
      resuelta: "archivada",
      archivada: "archivada",
    };
    setCambioEstado(next[inc.estado]);
    setCambioNota("");
    setCambioError(null);
    const estadoLibroActual = (inc.origen === "devolucion"
      ? inc.prestamo?.estado_devolucion
      : inc.prestamo?.estado_revision) ?? null;
    setCambioEstadoLibro(estadoLibroActual as EstadoDevolucion | null);
  }

  async function handleCambioEstado() {
    if (!selected) return;
    setSavingCambio(true);
    setCambioError(null);

    const patch: Record<string, unknown> = { estado: cambioEstado };
    if (cambioEstado === "resuelta" || cambioEstado === "archivada") {
      patch.fecha_resolucion = localDateStr();
    }

    const { error } = await supabase
      .from("gratuidad_incidencias")
      .update(patch)
      .eq("id", selected.id);

    if (error) { setCambioError(error.message); setSavingCambio(false); return; }

    const myProfesorNombre = profesores.find((p) => p.id === efectivoProfesorId)?.nombre ?? null;

    const { data: histEntry } = await supabase
      .from("gratuidad_incidencias_historial")
      .insert({
        incidencia_id: selected.id,
        estado: cambioEstado,
        nota: cambioNota.trim() || null,
        profesor_id: efectivoProfesorId,
      })
      .select("id, estado, nota, created_at, profesor:profesores(profesor)")
      .single();

    const newEntry: IncidenciaHistorial = histEntry
      ? { ...(histEntry as unknown as IncidenciaHistorial), incidencia_id: selected.id, profesor_id: myProfesorId }
      : {
        id: crypto.randomUUID(), incidencia_id: selected.id,
        estado: cambioEstado, nota: cambioNota.trim() || null,
        profesor_id: efectivoProfesorId, created_at: new Date().toISOString(),
        profesor: myProfesorNombre ? { profesor: myProfesorNombre } : undefined,
      };

    const updater = (i: Incidencia): Incidencia =>
      i.id === selected.id
        ? { ...i, estado: cambioEstado, historial: [...(i.historial ?? []), newEntry] }
        : i;

    setIncidencias((prev) => prev.map(updater));
    setSelected((prev) => (prev ? updater(prev) : null));
    setCambioNota("");
    setSavingCambio(false);
  }

  // ── Handlers: nueva incidencia ───────────────────────────────────────────
  function selectAlumnoSugerido(a: Alumno) {
    setNuevaForm((f) => ({ ...f, alumno_id: a.id, alumno_nombre: a.alumno, alumno_grupo: a.unidad }));
    setAlumnoSearch(a.alumno);
    setShowSugg(false);
  }

  function resetNuevaForm() {
    setAlumnoSearch("");
    setShowSugg(false);
    setNuevaForm({ alumno_id: null, alumno_nombre: "", alumno_grupo: "", libro_id: "", tipo: "deterioro", descripcion: "" });
    setNuevaError(null);
  }

  async function handleCrearIncidencia() {
    if (!nuevaForm.alumno_nombre.trim() || !nuevaForm.alumno_grupo.trim() || !nuevaForm.libro_id) {
      setNuevaError("Alumno, grupo y libro son obligatorios.");
      return;
    }
    setSavingNueva(true);
    setNuevaError(null);

    const { data: lastInc } = await supabase
      .from("gratuidad_incidencias")
      .select("codigo")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastNum = lastInc?.[0] ? parseInt(lastInc[0].codigo.replace("INC-", ""), 10) : 0;
    const codigo = `INC-${String(lastNum + 1).padStart(3, "0")}`;

    const { data: newInc, error } = await supabase
      .from("gratuidad_incidencias")
      .insert({
        codigo,
        alumno_id: nuevaForm.alumno_id,
        alumno_nombre: nuevaForm.alumno_nombre.trim(),
        alumno_grupo: nuevaForm.alumno_grupo.trim(),
        libro_id: nuevaForm.libro_id,
        tipo: nuevaForm.tipo,
        descripcion: nuevaForm.descripcion.trim() || null,
        estado: "abierta",
        curso_escolar: cursoEscolar,
      })
      .select("*, libro:libros_catalogo(titulo, isbn, editorial)")
      .single();

    if (error || !newInc) {
      setNuevaError(error?.message ?? "Error al crear la incidencia.");
      setSavingNueva(false);
      return;
    }

    await supabase.from("gratuidad_incidencias_historial").insert({
      incidencia_id: newInc.id,
      estado: "abierta",
      nota: null,
      profesor_id: efectivoProfesorId,
    });

    setIncidencias((prev) => [{ ...(newInc as unknown as Incidencia), historial: [] }, ...prev]);
    setShowNueva(false);
    resetNuevaForm();
    setSavingNueva(false);
  }

  // ── Handlers: acordeón y gestión masiva ─────────────────────────────────
  function toggleExpand(alumnoKey: string) {
    setCollapsedAlumnos((prev) => {
      const next = new Set(prev);
      if (next.has(alumnoKey)) next.delete(alumnoKey);
      else next.add(alumnoKey);
      return next;
    });
  }

  function openBulk(group: { alumnoKey: string; alumno_nombre: string; alumno_grupo: string; incidencias: Incidencia[] }) {
    setBulkTarget(group);
    setBulkEstado("resuelta");
    setBulkNota("");
  }

  async function handleBulkAction() {
    if (!bulkTarget) return;
    setSavingBulk(true);
    const gestionables = bulkTarget.incidencias.filter((i) => i.estado !== "archivada");
    const ids = gestionables.map((i) => i.id);

    const patch: Record<string, unknown> = { estado: bulkEstado };
    if (bulkEstado === "resuelta" || bulkEstado === "archivada") patch.fecha_resolucion = localDateStr();

    await supabase.from("gratuidad_incidencias").update(patch).in("id", ids);
    const histEntries = ids.map((id) => ({ incidencia_id: id, estado: bulkEstado, nota: bulkNota.trim() || null, profesor_id: efectivoProfesorId }));
    await supabase.from("gratuidad_incidencias_historial").insert(histEntries);

    const myProfesorNombre = profesores.find((p) => p.id === efectivoProfesorId)?.nombre ?? null;
    const now = new Date().toISOString();
    setIncidencias((prev) =>
      prev.map((inc) => {
        if (!ids.includes(inc.id)) return inc;
        const entry: IncidenciaHistorial = { id: crypto.randomUUID(), incidencia_id: inc.id, estado: bulkEstado, nota: bulkNota.trim() || null, profesor_id: efectivoProfesorId, created_at: now, profesor: myProfesorNombre ? { profesor: myProfesorNombre } : undefined };
        return { ...inc, estado: bulkEstado, historial: [...(inc.historial ?? []), entry] };
      })
    );
    setBulkTarget(null);
    setBulkNota("");
    setSavingBulk(false);
  }

  // ── Handler: cambio de estado del libro ─────────────────────────────────────
  async function handleGuardarEstadoLibro() {
    if (!selected?.prestamo_id || !cambioEstadoLibro) return;
    setSavingEstadoLibro(true);
    const field = selected.origen === "devolucion" ? "estado_devolucion" : "estado_revision";
    const { error } = await supabase
      .from("prestamos_libros")
      .update({ [field]: cambioEstadoLibro })
      .eq("id", selected.prestamo_id);
    setSavingEstadoLibro(false);
    if (!error) {
      setIncidencias((prev) =>
        prev.map((i) =>
          i.id === selected.id && i.prestamo
            ? { ...i, prestamo: { ...i.prestamo, [field]: cambioEstadoLibro } }
            : i
        )
      );
      setSelected((prev) =>
        prev && prev.prestamo
          ? { ...prev, prestamo: { ...prev.prestamo, [field]: cambioEstadoLibro } }
          : prev
      );
    }
  }

  // ── Print: carta de pago ────────────────────────────────────────────────────
  function handleCartaPago() {
    if (!selected) return;

    const alumnoKey = selected.alumno_id ?? selected.alumno_nombre;
    const librosAPagar = incidencias.filter((i) => {
      const key = i.alumno_id ?? i.alumno_nombre;
      return key === alumnoKey && (i.tipo === "deterioro" || i.tipo === "perdida") && i.estado !== "archivada";
    });

    if (librosAPagar.length === 0) return;

    const now = new Date();
    const fechaStr = `${String(now.getDate()).padStart(2, "0")} / ${String(now.getMonth() + 1).padStart(2, "0")} / ${now.getFullYear()}`;

    const tipoLabel: Record<string, string> = { deterioro: "Deterioro / No reutilizable", perdida: "Pérdida / Extravío" };

    const rowsHtml = librosAPagar.map((inc, i) => `
        <tr>
          <td class="check-col"><span class="checkbox"></span></td>
          <td class="num">${i + 1}</td>
          <td class="titulo">${inc.libro?.titulo ?? "—"}</td>
          <td class="motivo">${tipoLabel[inc.tipo] ?? inc.tipo}</td>
        </tr>`).join("");

    const copyHtml = (etiqueta: string) => `
      <div class="copy">
        <div class="copy-label">${etiqueta}</div>

        <div class="doc-header">
          <div>
            <div class="center-name">IES JULIO VERNE</div>
            <div class="center-sub">Programa de Gratuidad de Libros &middot; ${cursoEscolar}</div>
          </div>
          <div class="title-block">
            <div class="doc-title">CARTA DE PAGO</div>
            <div class="doc-subtitle">Justificante de reposici&oacute;n de libros</div>
          </div>
        </div>

        <table class="info-table">
          <tr>
            <td class="lbl">Alumno/a</td>
            <td class="val strong" colspan="3">${selected.alumno_nombre}</td>
          </tr>
          <tr>
            <td class="lbl">Curso / Grupo</td>
            <td class="val">${selected.alumno_grupo}</td>
            <td class="lbl">Fecha</td>
            <td class="val">${fechaStr}</td>
          </tr>
          <tr>
            <td class="lbl">Persona que realiza el pago</td>
            <td class="val write" colspan="3"></td>
          </tr>
          <tr>
            <td class="lbl">DNI / NIE</td>
            <td class="val write" colspan="3"></td>
          </tr>
        </table>

        <div class="section-title">Relaci&oacute;n de libros a reponer</div>
        <table class="books-table">
          <thead>
            <tr>
              <th class="check-col">&nbsp;</th>
              <th class="num">N&ordm;</th>
              <th class="titulo">T&iacute;tulo del libro</th>
              <th class="motivo">Motivo</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="declaration">
          El/La abajo firmante declara haber realizado el pago correspondiente a los libros marcados de
          la relaci&oacute;n anterior y autoriza al IES Julio Verne a retener este documento como justificante.
        </div>

        <div class="firma-area">
          <div class="firma-col">
            <div class="firma-label">Firma de quien realiza el pago:</div>
            <div class="firma-linea"></div>
          </div>
          <div class="firma-col">
            <div class="firma-label">Sello y firma del centro:</div>
            <div class="firma-linea"></div>
          </div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carta de Pago &mdash; ${selected.alumno_nombre}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    @page{size:A4 portrait;margin:8mm 14mm}
    body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#000;background:#fff}
    .copy{min-height:126mm;padding-bottom:5mm;display:flex;flex-direction:column;gap:5px}
    .copy-label{align-self:flex-end;font-size:7.5pt;font-weight:bold;color:#555;letter-spacing:.8px;text-transform:uppercase;border:1px dashed #aaa;padding:1px 7px;margin-bottom:2px}
    .separator{border:none;border-top:2px dashed #bbb;margin:4mm 0}
    .doc-header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1f4e79;padding-bottom:4px;margin-bottom:6px}
    .center-name{font-size:13pt;font-weight:bold;color:#1f4e79}
    .center-sub{font-size:8pt;color:#666;margin-top:1px}
    .title-block{text-align:right}
    .doc-title{font-size:14pt;font-weight:bold;color:#1f4e79}
    .doc-subtitle{font-size:8pt;color:#888}
    .info-table{width:100%;border-collapse:collapse;margin-bottom:5px}
    .info-table td{border:1px solid #bfbfbf;padding:3px 7px;font-size:9.5pt}
    .info-table td.lbl{background:#f2f2f2;font-weight:bold;width:25%;white-space:nowrap}
    .info-table td.val{width:25%}
    .info-table td.strong{font-weight:bold}
    .info-table td.write{background:#fffde7}
    .section-title{font-size:9pt;font-weight:bold;color:#1f4e79;border-bottom:1px solid #bfbfbf;padding-bottom:2px;margin-bottom:4px}
    .books-table{width:100%;border-collapse:collapse;margin-bottom:6px}
    .books-table th{background:#1f4e79;color:#fff;border:1px solid #888;padding:3px 5px;font-size:8.5pt;text-align:left}
    .books-table td{border:1px solid #bfbfbf;padding:2px 5px;font-size:9pt;height:18px}
    .books-table .check-col{width:22px;text-align:center}
    .books-table .num{width:24px;text-align:center}
    .books-table .motivo{width:36%;font-size:8.5pt}
    .books-table tbody tr:nth-child(even){background:#f8f8f8}
    .checkbox{display:inline-block;width:13px;height:13px;border:1.5px solid #555;vertical-align:middle}
    .declaration{font-size:8pt;color:#555;border:1px solid #ddd;background:#fafafa;padding:5px 8px;margin-bottom:6px;line-height:1.5}
    .firma-area{display:flex;gap:10mm;margin-top:2mm}
    .firma-col{flex:1}
    .firma-label{font-size:8.5pt;color:#555;margin-bottom:12mm}
    .firma-linea{border-top:1px solid #000}
  </style>
</head>
<body>
  ${copyHtml("COPIA PARA EL CENTRO")}
  <hr class="separator">
  ${copyHtml("COPIA PARA EL INTERESADO")}
  <script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Selector de profesor para canManage sin perfil de profesor */}
      {canManage && !myProfesorId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-800 font-medium whitespace-nowrap">Registrar como:</span>
          <div className="relative">
            <select
              value={overrideProfesorId}
              onChange={(e) => setOverrideProfesorId(e.target.value)}
              className="appearance-none border border-amber-300 rounded-lg pl-3 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-48"
            >
              <option value="">— Selecciona un profesor —</option>
              {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Incidencias y reposiciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Deterioros, pérdidas y reclamaciones. Gestión y seguimiento hasta el cierre.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowNueva(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Nueva incidencia
          </button>
        )}
      </div>

      {/* Filtro pills */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {FILTROS.map(({ key, label }) => {
            const count = key === "todas" ? incidencias.length : (counts[key as EstadoIncidencia] ?? 0);
            return (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${filtro === key
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                {label}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por alumno o curso..."
          className="w-full border border-gray-200 rounded-lg pl-9 pr-9 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={32} className="mx-auto mb-2 opacity-40 animate-pulse" />
          <p className="text-sm">Cargando incidencias...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">
            {busqueda.trim()
              ? `Sin resultados para "${busqueda.trim()}"`
              : filtro === "todas"
                ? "No hay incidencias registradas en este curso"
                : `No hay incidencias ${FILTROS.find((f) => f.key === filtro)?.label.toLowerCase() ?? ""}`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {grouped.map((group) => {
            const isExpanded = !collapsedAlumnos.has(group.alumnoKey);
            const gestionables = group.incidencias.filter((i) => i.estado !== "archivada");
            return (
              <div key={group.alumnoKey}>
                {/* Cabecera del grupo */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => toggleExpand(group.alumnoKey)}
                >
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                    {initialsFromNombre(group.alumno_nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{group.alumno_nombre}</p>
                    <p className="text-xs text-gray-500">{group.alumno_grupo}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {group.incidencias.length} {group.incidencias.length === 1 ? "incidencia" : "incidencias"}
                  </span>
                  {canManage && gestionables.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openBulk(group); }}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Users size={12} />
                      Gestionar todas
                    </button>
                  )}
                  <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Filas de incidencias */}
                {isExpanded && (
                  <div className="divide-y divide-gray-50">
                    {group.incidencias.map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => openDetail(inc)}
                        className={`flex items-start gap-3 px-4 py-3 pl-16 cursor-pointer hover:bg-gray-50 transition-colors ${ESTADO_CONFIG[inc.estado].rowClass}`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs text-gray-400">{inc.codigo}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TIPO_CONFIG[inc.tipo].className}`}>
                              {TIPO_CONFIG[inc.tipo].label}
                            </span>
                            {(() => {
                              const esDevolucion = inc.origen === "devolucion" || Boolean(inc.prestamo?.fecha_devolucion);
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${esDevolucion ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                                  {esDevolucion ? "Devolución" : "Revisión"}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-gray-800 truncate">{inc.libro?.titulo ?? "—"}</p>
                          <p className="text-xs text-gray-400">{formatDate(inc.created_at)}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${ESTADO_CONFIG[inc.estado].badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ESTADO_CONFIG[inc.estado].dot}`} />
                          {ESTADO_CONFIG[inc.estado].label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Gestión masiva ─────────────────────────────────────────── */}
      {bulkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Gestionar incidencias</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {bulkTarget.alumno_nombre} · {bulkTarget.incidencias.filter((i) => i.estado !== "archivada").length} incidencias activas
                </p>
              </div>
              <button onClick={() => setBulkTarget(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="relative">
                <select
                  value={bulkEstado}
                  onChange={(e) => setBulkEstado(e.target.value as EstadoIncidencia)}
                  className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(["en_gestion", "resuelta", "archivada"] as EstadoIncidencia[]).map((e) => (
                    <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <textarea
                value={bulkNota}
                onChange={(e) => setBulkNota(e.target.value)}
                placeholder="Nota opcional..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={() => setBulkTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkAction}
                disabled={savingBulk}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {savingBulk ? "Guardando..." : "Aplicar a todas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle ─────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Incidencia {selected.codigo}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Alumno */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                  {initialsFromNombre(selected.alumno_nombre)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selected.alumno_nombre}</p>
                  <p className="text-xs text-gray-500">{selected.alumno_grupo}</p>
                </div>
              </div>

              {/* Libro */}
              {selected.libro && (
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <BookOpen size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{selected.libro.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[selected.libro.isbn, selected.libro.editorial].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Tipo */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Tipo</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${TIPO_CONFIG[selected.tipo].className}`}>
                  {TIPO_CONFIG[selected.tipo].label}
                </span>
              </div>

              {/* Descripción */}
              {selected.descripcion && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Descripción</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
                    {selected.descripcion}
                  </p>
                </div>
              )}

              {/* Línea de tiempo */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Línea de tiempo</p>
                {(selected.historial ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">Sin historial</p>
                ) : (
                  <div className="relative pl-5">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-5">
                      {[...(selected.historial ?? [])]
                        .sort((a, b) => a.created_at.localeCompare(b.created_at))
                        .map((entry) => (
                          <div key={entry.id} className="relative">
                            <div className={`absolute left-[-22px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${ESTADO_CONFIG[entry.estado].dot}`} />
                            <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {ESTADO_CONFIG[entry.estado].label}
                            </p>
                            {entry.nota && (
                              <p className="text-xs text-gray-500 mt-0.5">{entry.nota}</p>
                            )}
                            {entry.profesor?.profesor && (
                              <p className="text-xs text-gray-400 mt-0.5">{entry.profesor.profesor}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Estado del libro (solo si hay préstamo vinculado) */}
              {canManage && selected.prestamo_id && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Estado del libro</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(ESTADO_LIBRO_CONFIG) as EstadoDevolucion[]).map((e) => (
                      <button
                        key={e}
                        onClick={() => setCambioEstadoLibro(e)}
                        className={`flex-1 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${cambioEstadoLibro === e
                            ? ESTADO_LIBRO_CONFIG[e].active
                            : `border-gray-200 text-gray-500 bg-white ${ESTADO_LIBRO_CONFIG[e].hover}`
                          }`}
                      >
                        {ESTADO_LIBRO_CONFIG[e].label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGuardarEstadoLibro}
                    disabled={savingEstadoLibro || !cambioEstadoLibro}
                    className="w-full bg-gray-700 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {savingEstadoLibro ? "Guardando..." : "Guardar estado del libro"}
                  </button>
                </div>
              )}

              {/* Cambiar estado (canManage + no archivada) */}
              {canManage && selected.estado !== "archivada" && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Cambiar estado de la incidencia</p>
                  <div className="relative">
                    <select
                      value={cambioEstado}
                      onChange={(e) => setCambioEstado(e.target.value as EstadoIncidencia)}
                      className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(["abierta", "en_gestion", "resuelta", "archivada"] as EstadoIncidencia[])
                        .map((e) => (
                          <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <textarea
                    value={cambioNota}
                    onChange={(e) => setCambioNota(e.target.value)}
                    placeholder="Nota opcional (acción tomada, observaciones...)"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  {cambioError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle size={12} /> {cambioError}
                    </p>
                  )}
                  <button
                    onClick={handleCambioEstado}
                    disabled={savingCambio}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {savingCambio ? "Guardando..." : "Guardar cambio"}
                  </button>
                  {(cambioEstado === "resuelta" || selected.estado === "resuelta") &&
                    (selected.tipo === "deterioro" || selected.tipo === "perdida") && (
                      <button
                        onClick={handleCartaPago}
                        className="w-full flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
                      >
                        <Printer size={14} />
                        Carta de pago
                      </button>
                    )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva incidencia ────────────────────────────────────────── */}
      {showNueva && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Nueva incidencia</h3>
              <button
                onClick={() => { setShowNueva(false); resetNuevaForm(); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {nuevaError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {nuevaError}
                </p>
              )}

              {/* Alumno autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alumno/a *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={alumnoSearch}
                    onChange={(e) => {
                      setAlumnoSearch(e.target.value);
                      setShowSugg(true);
                      if (!e.target.value) {
                        setNuevaForm((f) => ({ ...f, alumno_id: null, alumno_nombre: "", alumno_grupo: "" }));
                      }
                    }}
                    onFocus={() => setShowSugg(true)}
                    onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                    placeholder="Buscar alumno por nombre..."
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {showSugg && alumnosSugeridos.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {alumnosSugeridos.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onMouseDown={() => selectAlumnoSugerido(a)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm"
                      >
                        <span className="font-medium text-gray-800">{a.alumno}</span>
                        <span className="text-gray-400 ml-2 text-xs">{a.unidad}</span>
                      </button>
                    ))}
                  </div>
                )}
                {nuevaForm.alumno_nombre && (
                  <p className="text-xs text-gray-500 mt-1">
                    Seleccionado: <span className="font-medium">{nuevaForm.alumno_nombre}</span>
                    {nuevaForm.alumno_grupo && <> · {nuevaForm.alumno_grupo}</>}
                  </p>
                )}
              </div>

              {/* Libro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libro *</label>
                <div className="relative">
                  <select
                    value={nuevaForm.libro_id}
                    onChange={(e) => setNuevaForm((f) => ({ ...f, libro_id: e.target.value }))}
                    className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Selecciona un libro —</option>
                    {librosActivos.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.titulo} · {l.nivel}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="relative">
                  <select
                    value={nuevaForm.tipo}
                    onChange={(e) => setNuevaForm((f) => ({ ...f, tipo: e.target.value as TipoIncidencia }))}
                    className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(Object.keys(TIPO_CONFIG) as TipoIncidencia[]).map((t) => (
                      <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={nuevaForm.descripcion}
                  onChange={(e) => setNuevaForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe la incidencia..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={() => { setShowNueva(false); resetNuevaForm(); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearIncidencia}
                disabled={savingNueva}
                className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {savingNueva ? "Creando..." : "Crear incidencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
