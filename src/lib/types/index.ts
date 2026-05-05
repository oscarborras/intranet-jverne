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
