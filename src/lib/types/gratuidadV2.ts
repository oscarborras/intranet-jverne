// ─── Gratuidad de Libros v2 (physical copies identified by barcode) ───────────
// Mirrors the gplv2_* tables and the JSON returned by the gplv2_* RPCs.

export type ConservacionV2 = "nuevo" | "bueno" | "regular" | "deteriorado";
export type SituacionV2 = "en_centro" | "prestado" | "perdido" | "baja";
export type ResultadoPrestamoV2 = "devuelto" | "perdido" | "anulado";
export type TipoMovimientoV2 =
  | "alta"
  | "entrega"
  | "devolucion"
  | "anulacion"
  | "perdido"
  | "baja"
  | "recuperado"
  | "cambio_conservacion";
export type TipoIncidenciaV2 = "deterioro" | "perdida" | "otro";
export type EstadoIncidenciaV2 = "abierta" | "en_gestion" | "resuelta" | "archivada";
export type TipoPlantillaEtiqueta = "a4" | "zebra";

export interface TituloV2 {
  id: string;
  titulo: string;
  isbn: string | null;
  editorial: string | null;
  asignatura: string | null;
  precio: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TituloCursoV2 {
  titulo_id: string;
  /** Matches cursos.nombre / alumnos.unidad */
  curso: string;
  /** Only for some students of the group (e.g. Diversificación): not required for a complete lot */
  optativo: boolean;
  created_at: string;
}

export interface EjemplarV2 {
  id: string;
  codigo: string;
  titulo_id: string;
  conservacion: ConservacionV2;
  situacion: SituacionV2;
  /** Current holder; only set when situacion = "prestado" */
  alumno_id: string | null;
  observaciones: string | null;
  fecha_alta: string;
  created_at: string;
  updated_at: string;
}

export interface PrestamoV2 {
  id: string;
  ejemplar_id: string;
  alumno_id: string | null;
  curso_escolar: string;
  alumno_nombre: string;
  alumno_grupo: string;
  fecha_entrega: string;
  entregado_por: string | null;
  conservacion_entrega: ConservacionV2;
  /** null while the loan is active */
  fecha_devolucion: string | null;
  recogido_por: string | null;
  conservacion_devolucion: ConservacionV2 | null;
  resultado: ResultadoPrestamoV2 | null;
  observaciones: string | null;
  created_at: string;
}

export interface MovimientoV2 {
  id: number;
  ejemplar_id: string;
  tipo: TipoMovimientoV2;
  prestamo_id: string | null;
  alumno_id: string | null;
  profesor_id: string | null;
  usuario_id: string | null;
  detalle: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface IncidenciaV2 {
  id: string;
  codigo: string;
  ejemplar_id: string;
  prestamo_id: string | null;
  alumno_id: string | null;
  alumno_nombre: string | null;
  alumno_grupo: string | null;
  curso_escolar: string;
  tipo: TipoIncidenciaV2;
  descripcion: string | null;
  coste: number | null;
  estado: EstadoIncidenciaV2;
  notas_gestion: string | null;
  creada_por: string | null;
  fecha_resolucion: string | null;
  created_at: string;
  updated_at: string;
}

export interface CamposEtiqueta {
  centro: boolean;
  titulo: boolean;
  curso: boolean;
  curso_escolar: boolean;
}

export interface PlantillaEtiqueta {
  id: string;
  nombre: string;
  tipo: TipoPlantillaEtiqueta;
  ancho_mm: number;
  alto_mm: number;
  columnas: number;
  filas: number;
  margen_sup_mm: number;
  margen_izq_mm: number;
  sep_horizontal_mm: number;
  sep_vertical_mm: number;
  campos: CamposEtiqueta;
  predeterminada: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Row of gplv2_resumen_titulos() */
export interface ResumenTituloV2 {
  titulo_id: string;
  total: number;
  en_centro: number;
  prestado: number;
  perdido: number;
  baja: number;
}

/** Row of gplv2_progreso_grupos() */
export interface ProgresoGrupoV2 {
  grupo: string;
  alumnos: number;
  lote: number;
  completos: number;
  entregados: number;
  esperados: number;
  prestados: number;
  devueltos: number;
}

/** Row of gplv2_stock_titulos() */
export interface StockTituloV2 {
  titulo_id: string;
  titulo: string;
  asignatura: string | null;
  activo: boolean;
  /** Optional in every lot it belongs to: no "faltan" figure */
  optativo: boolean;
  total: number;
  en_centro: number;
  prestado: number;
  perdido: number;
  baja: number;
  deteriorados: number;
  /** Active students in the groups whose lot includes the title */
  alumnos_lote: number;
}

/** Row of gplv2_alumnos_pendientes() */
export interface AlumnoPendienteV2 {
  alumno_id: string | null;
  alumno: string;
  grupo: string;
  /** Left the school (or has no group) but still holds books */
  baja: boolean;
  pendientes: number;
  /** "Title (CODE); Title (CODE)" */
  libros: string;
}

export const ETIQUETAS_ESTADO_INCIDENCIA: Record<EstadoIncidenciaV2, string> = {
  abierta: "Abierta",
  en_gestion: "En gestión",
  resuelta: "Resuelta",
  archivada: "Archivada",
};

export const ETIQUETAS_TIPO_INCIDENCIA: Record<TipoIncidenciaV2, string> = {
  deterioro: "Deterioro",
  perdida: "Pérdida",
  otro: "Otro",
};

/** Copy with its title and current holder, as listed in the UI */
export interface EjemplarListadoV2 extends EjemplarV2 {
  titulo: { titulo: string; asignatura: string | null } | null;
  alumno: { alumno: string; unidad: string } | null;
}

export const ETIQUETAS_CONSERVACION: Record<ConservacionV2, string> = {
  nuevo: "Nuevo",
  bueno: "Bueno",
  regular: "Regular",
  deteriorado: "Deteriorado",
};

export const ETIQUETAS_SITUACION: Record<SituacionV2, string> = {
  en_centro: "En el centro",
  prestado: "Prestado",
  perdido: "Perdido",
  baja: "Baja",
};

// ─── RPC results ──────────────────────────────────────────────────────────────

export type ErrorRpcV2 =
  | "sin_permiso"
  | "no_existe"
  | "en_centro"
  | "prestado"
  | "perdido"
  | "baja"
  | "alumno_no_valido"
  | "titulo_repetido"
  | "titulo_no_existe"
  | "cantidad_invalida"
  | "conservacion_invalida"
  | "situacion_invalida"
  | "no_activo";

export type AvisoEntregaV2 = "fuera_de_lote" | "conservacion_deteriorado";

export interface RpcErrorV2 {
  ok: false;
  error: ErrorRpcV2;
  codigo?: string;
  titulo?: string;
  /** "Surname, Name (group)" when the copy is already lent */
  alumno_actual?: string | null;
}

export interface EjemplarResumenV2 {
  id: string;
  codigo: string;
  conservacion: ConservacionV2;
  titulo_id: string;
  titulo: string;
  asignatura: string | null;
}

export type CrearEjemplaresResult =
  | { ok: true; ejemplares: { id: string; codigo: string }[] }
  | RpcErrorV2;

export type EntregarResult =
  | { ok: true; prestamo_id: string; ejemplar: EjemplarResumenV2; avisos: AvisoEntregaV2[] }
  | RpcErrorV2;

export type AnularEntregaResult = { ok: true; prestamo_id: string } | RpcErrorV2;

export type DevolverResult =
  | {
      ok: true;
      prestamo_id: string;
      ejemplar: EjemplarResumenV2;
      alumno: { id: string | null; nombre: string; grupo: string };
      /** Loans still active for that student */
      pendientes: number;
      incidencia: string | null;
    }
  | RpcErrorV2;

export type CorregirDevolucionResult =
  | { ok: true; prestamo_id: string; conservacion: ConservacionV2; incidencia: string | null }
  | RpcErrorV2;

export type AnularDevolucionResult = { ok: true; prestamo_id: string } | RpcErrorV2;

export type CambiarSituacionResult =
  | { ok: true; codigo: string; incidencia?: string | null }
  | RpcErrorV2;

/** User-facing (Spanish) messages for RPC errors */
export const MENSAJES_ERROR_V2: Record<ErrorRpcV2, string> = {
  sin_permiso: "No tienes permiso para realizar esta acción",
  no_existe: "Código no encontrado",
  en_centro: "El ejemplar ya está en el centro",
  prestado: "El ejemplar está prestado",
  perdido: "El ejemplar está marcado como perdido",
  baja: "El ejemplar está dado de baja",
  alumno_no_valido: "Alumno no válido o dado de baja",
  titulo_repetido: "El alumno ya tiene un ejemplar de este título",
  titulo_no_existe: "El título no existe o está inactivo",
  cantidad_invalida: "Cantidad no válida (1-500)",
  conservacion_invalida: "Estado de conservación no válido",
  situacion_invalida: "Situación no válida",
  no_activo: "El préstamo ya no está activo",
};
