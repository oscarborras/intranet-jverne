// ─── Auth & Users ────────────────────────────────────────────────────────────

export interface Perfil {
  id: number;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  perfil_id: number;
  created_at: string;
  perfiles?: Perfil;
}

export interface UserView {
  id: string;
  email: string;
  full_name: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string;
}

export interface UserWithRoles extends UserView {
  roles: Perfil[];
  is_admin: boolean;
  departamento?: string;
}

// ─── Departments ─────────────────────────────────────────────────────────────

export interface Departamento {
  id: number;
  nombre: string;
  codigo: string;
  created_at: string;
}

export interface DepartamentoMiembro {
  user_id: string;
  departamento_id: number;
  created_at: string;
  departamentos?: Departamento;
  users?: UserView;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export type AnuncioPrioridad = "normal" | "importante" | "urgente";

export interface Anuncio {
  id: number;
  titulo: string;
  contenido: string;
  prioridad: AnuncioPrioridad;
  autor_id: string;
  visible_hasta: string | null;
  created_at: string;
  updated_at: string;
  autor?: { full_name: string };
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export interface TipoEventoIntranet {
  id: number;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
}

export interface CalendarEvento {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  todo_el_dia: boolean;
  tipo: string;
  autor_id: string;
  created_at: string;
  autor?: { full_name: string };
}


export interface TramoHorario {
  id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  es_recreo: boolean;
  orden: number;
}

// ─── Spaces & Resources ──────────────────────────────────────────────────────

export type EspacioTipo = "sum" | "sala_visitas" | "otro";

export interface Carro {
  id: number;
  nombre: string;
  ubicacion: string | null;
  descripcion: string | null;
  activo: boolean;
}

export interface ReservaCarro {
  id: number;
  carro_id: number;
  user_id: string;
  fecha: string;
  tramo_id: number;
  aula: string | null;
  created_at: string;
  carros?: Carro;
  tramos_horarios?: TramoHorario;
  usuario?: { full_name: string };
}

export interface Espacio {
  id: number;
  nombre: string;
  tipo: EspacioTipo;
  capacidad: number | null;
  activo: boolean;
}

export interface Recurso {
  id: number;
  nombre: string;
  ubicacion: string | null;
  descripcion: string | null;
  activo: boolean;
}

export interface ReservaEspacio {
  id: number;
  espacio_id: number;
  user_id: string;
  fecha: string;
  tramo_id: number;
  motivo: string;
  created_at: string;
  espacios?: Espacio;
  tramos_horarios?: TramoHorario;
  usuario?: { full_name: string };
}

export interface ReservaRecurso {
  id: number;
  recurso_id: number;
  user_id: string;
  fecha: string;
  tramo_id: number;
  aula: string | null;
  created_at: string;
  recursos?: Recurso;
  tramos_horarios?: TramoHorario;
  usuario?: { full_name: string };
}

// ─── TIC Incidents ───────────────────────────────────────────────────────────

export type PeticionPrioridad = "baja" | "normal" | "alta" | "urgente";
export type PeticionTICEstado = "pendiente" | "en_progreso" | "finalizada";
export type PeticionTICActividadTipo =
  | "creacion"
  | "observacion"
  | "cambio_estado"
  | "cambio_asignado"
  | "cambio_descripcion";

export interface PeticionTICActividad {
  id: number;
  peticion_id: number;
  user_id: string;
  tipo: PeticionTICActividadTipo;
  contenido: string;
  created_at: string;
  user_full_name?: string;
}

export interface PeticionTIC {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  prioridad: PeticionPrioridad;
  estado: PeticionTICEstado;
  autor_id: string;
  asignado_id: string | null;
  solo_usuario: boolean;
  created_at: string;
  updated_at: string;
  autor?: { full_name: string };
  asignado?: { full_name: string };
}

// ─── Maintenance Incidents ───────────────────────────────────────────────────

export type PeticionMantenimientoEstado =
  | "por_validar"
  | "abierta"
  | "en_progreso"
  | "finalizada"
  | "rechazada";

export interface PeticionMantenimiento {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  prioridad: PeticionPrioridad;
  ubicacion: string;
  estado: PeticionMantenimientoEstado;
  autor_id: string;
  validado_por: string | null;
  created_at: string;
  updated_at: string;
  autor?: { full_name: string };
  validador?: { full_name: string };
}

// ─── Asuntos Propios ─────────────────────────────────────────────────────────

export interface AsuntoPropios {
  id: string;
  user_id: string;
  user_full_name: string;
  fecha: string;
  created_by: string;
  created_at: string;
}

// ─── App Config ──────────────────────────────────────────────────────────────

export interface ConfigIntranet {
  id: string;
  clave: string;
  valor: string;
  descripcion: string;
  created_at: string;
  updated_at: string;
}

// ─── Modules Config ──────────────────────────────────────────────────────────

export interface ModuloConfig {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
  orden: number;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_id: string;
  accion: string;
  tabla_afectada: string | null;
  registro_id: string | null;
  created_at: string;
  usuario?: { full_name: string; email: string };
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export interface Curso {
  id: number;
  nombre: string;
  email_tutor: string | null;
}

// ─── Absences ────────────────────────────────────────────────────────────────

export type AusenciaEstado = "activa" | "cancelada";

export interface AusenciaProfesorado {
  id: number;
  codigo: string | null;
  profesor_id: string;
  fecha: string;
  tramo_id: number;
  curso_id: number | null;
  aula: string | null;
  tareas: string | null;
  observaciones: string | null;
  adjunto_path: string | null;
  adjunto_nombre: string | null;
  estado: AusenciaEstado;
  created_at: string;
  updated_at: string;
  tramos_horarios?: TramoHorario;
  cursos?: Curso | null;
  profesor?: { full_name: string };
}

// ─── Family Appointments ─────────────────────────────────────────────────────

export type CitaFamiliaEstado = "pendiente" | "confirmada" | "completada" | "cancelada";
export type CitaFamiliaParentesco = "padre" | "madre" | "tutor/a legal" | "otro";
export type CitaFamiliaCanceladaPor = "profesor" | "familia";

export const LUGARES_CITA = [
  "Sala de visitas",
  "Departamento del profesor",
  "Dirección",
  "Jefatura",
  "Por determinar",
] as const;

export type LugarCita = (typeof LUGARES_CITA)[number];

export interface CitaFamilia {
  id: number;
  codigo: string;
  profesor_id: string;
  alumno_nombre: string;
  alumno_curso: string;
  familiar_nombre: string;
  familiar_parentesco: CitaFamiliaParentesco | string;
  familiar_email: string | null;
  familiar_telefono: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  lugar: string | null;
  motivo: string | null;
  estado: CitaFamiliaEstado;
  notas: string | null;
  cancelada_por: CitaFamiliaCanceladaPor | null;
  motivo_cancelacion: string | null;
  token_familia: string;
  created_at: string;
  updated_at: string;
  profesor?: { full_name: string; email: string };
}

// ─── Gratuidad de Libros ──────────────────────────────────────────────────────

export type TipoIncidencia = "deterioro" | "perdida" | "reclamacion" | "robo" | "otro";
export type EstadoIncidencia = "abierta" | "en_gestion" | "resuelta" | "archivada";

export interface IncidenciaHistorial {
  id: string;
  incidencia_id: string;
  estado: EstadoIncidencia;
  nota: string | null;
  profesor_id: string | null;
  created_at: string;
  profesor?: { profesor: string };
}

export interface Incidencia {
  id: string;
  codigo: string;
  prestamo_id: string | null;
  alumno_id: string | null;
  alumno_nombre: string;
  alumno_grupo: string;
  libro_id: string | null;
  tipo: TipoIncidencia;
  descripcion: string | null;
  estado: EstadoIncidencia;
  origen: "devolucion" | "revision";
  curso_escolar: string;
  coste_estimado: number | null;
  gestionado_por: string | null;
  notas_gestion: string | null;
  fecha_resolucion: string | null;
  created_at: string;
  updated_at: string;
  libro?: { titulo: string; isbn: string | null; editorial: string | null };
  prestamo?: { fecha_devolucion: string | null; estado_devolucion: string | null; estado_revision: string | null; en_revision: boolean } | null;
  historial?: IncidenciaHistorial[];
}

export interface Alumno {
  id: string;
  alumno: string;             // "Apellido1 Apellido2, Nombre"
  nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  unidad: string;
}

export interface LibroCatalogo {
  id: string;
  titulo: string;
  editorial: string | null;
  isbn: string | null;
  asignatura: string;
  nivel: string;
  stock_total: number;
  precio: number | null;
  diversificacion: boolean;
  activo: boolean;
  created_at: string;
}

export type EstadoDevolucion = "bueno" | "deteriorado" | "perdido";

export interface PrestamoLibro {
  id: string;
  libro_id: string;
  alumno_id: string | null;
  curso_escolar: string;
  alumno_nombre: string;
  alumno_grupo: string;
  num_ejemplar: string | null;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  devolucion_registrada_at: string | null;
  estado_devolucion: EstadoDevolucion | null;
  observaciones: string | null;
  entregado_por: string;
  devuelto_por: string | null;
  en_revision: boolean;
  estado_revision: EstadoDevolucion | null;
  fecha_revision: string | null;
  revisado_por: string | null;
  created_at: string;
  // Relaciones resueltas en el servidor
  libro?: { titulo: string; asignatura: string; nivel: string; diversificacion?: boolean };
  entregado_por_nombre?: { profesor: string };
  devuelto_por_nombre?: { profesor: string };
  revisado_por_nombre?: { profesor: string };
}
