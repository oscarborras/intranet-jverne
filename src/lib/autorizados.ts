// People authorised to pick up students: data shape and word-by-word search.

export interface AutorizadoRecogida {
  id: string;
  nombre: string; // "Apellidos, Nombre"
  dni: string | null;
  telefono: string | null;
  origen: "seneca" | "manual";
  usuario_alta: string | null;
  fecha_alta: string | null;
}

export interface AlumnoConAutorizados {
  id: string;
  alumno: string;
  unidad: string;
  autorizados_recogida: AutorizadoRecogida[];
}

export const AUTORIZADO_SELECT = "id, nombre, dni, telefono, origen, usuario_alta, fecha_alta";

export const ALUMNO_AUTORIZADOS_SELECT = `id, alumno, unidad, autorizados_recogida(${AUTORIZADO_SELECT})`;

/** Searchable text: student, group and every authorised person's name, ID and phone. */
export function textoBusquedaAutorizados(a: AlumnoConAutorizados): string {
  return [
    a.alumno,
    a.unidad,
    ...a.autorizados_recogida.flatMap((p) => [p.nombre, p.dni, p.telefono, p.telefono?.replace(/\s+/g, "")]),
  ].filter(Boolean).join(" ");
}
