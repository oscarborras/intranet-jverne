"use client";

import { CalendarClock, Forward, GraduationCap, MessageSquareText, UserRound, Users, X } from "lucide-react";
import { CARGOS_DIRECTIVOS, type CitaFamilia, type CitaFamiliaEstado } from "@/lib/types";
import { CITA_THEMES, CitaBlock, CitaField } from "@/components/citas/CitaBlocks";

// Appointment card: data grouped in labelled blocks (see CitaBlocks)

const ESTADO_LABELS: Record<CitaFamiliaEstado, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

const ESTADO_BADGE: Record<CitaFamiliaEstado, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  completada: "bg-indigo-100 text-indigo-800",
  cancelada: "bg-red-100 text-red-800",
};

function formatFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  cita: CitaFamilia;
  /** Show who the appointment is with (Admin/Directiva see every teacher's appointments) */
  showProfesor: boolean;
  /** Action buttons, rendered in the card footer */
  actions?: React.ReactNode;
}

export default function CitaCard({ cita, showProfesor, actions }: Props) {
  const showProfesorBlock = showProfesor || Boolean(cita.cargo) || Boolean(cita.derivada_por_nombre);

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-gray-300 transition-colors">
      {/* Header: code, status and quick tags */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs font-mono text-gray-500">{cita.codigo}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[cita.estado]}`}>
          {ESTADO_LABELS[cita.estado]}
        </span>
        {cita.derivada_por_nombre && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
            <Forward className="w-3 h-3" aria-hidden="true" /> Derivada
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {showProfesorBlock && (
          <CitaBlock title="Profesorado" icon={UserRound} theme={CITA_THEMES.profesor} className="sm:col-span-2">
            {showProfesor && cita.profesor && <CitaField label="Cita con">{cita.profesor.full_name}</CitaField>}
            {cita.cargo && <CitaField label="Cargo">{CARGOS_DIRECTIVOS[cita.cargo]}</CitaField>}
            {cita.derivada_por_nombre && (
              <CitaField label="Derivada por"><strong className="font-semibold">{cita.derivada_por_nombre}</strong></CitaField>
            )}
          </CitaBlock>
        )}

        <CitaBlock title="Alumno/a" icon={GraduationCap} theme={CITA_THEMES.alumno}>
          <CitaField label="Nombre"><strong className="font-semibold">{cita.alumno_nombre}</strong></CitaField>
          <CitaField label="Curso">{cita.alumno_curso}</CitaField>
        </CitaBlock>

        <CitaBlock title="Familiar" icon={Users} theme={CITA_THEMES.familiar}>
          <CitaField label="Nombre">
            {cita.familiar_nombre} <span className="text-gray-500 capitalize">({cita.familiar_parentesco})</span>
          </CitaField>
          {cita.familiar_email && (
            <CitaField label="Email">
              <a href={`mailto:${cita.familiar_email}`} className="text-green-800 underline underline-offset-2 break-all">{cita.familiar_email}</a>
            </CitaField>
          )}
          {cita.familiar_telefono && (
            <CitaField label="Teléfono">
              <a href={`tel:${cita.familiar_telefono.replace(/\s+/g, "")}`} className="text-green-800 underline underline-offset-2">{cita.familiar_telefono}</a>
            </CitaField>
          )}
        </CitaBlock>

        <CitaBlock title="Fecha, hora y lugar" icon={CalendarClock} theme={CITA_THEMES.cuando}>
          {cita.fecha ? (
            <>
              <CitaField label="Fecha"><span className="capitalize">{formatFecha(cita.fecha)}</span></CitaField>
              {cita.hora_inicio && <CitaField label="Hora">{cita.hora_inicio.slice(0, 5)}</CitaField>}
              {cita.lugar && <CitaField label="Lugar">{cita.lugar}</CitaField>}
            </>
          ) : (
            <CitaField label="Fecha"><span className="text-gray-500 italic">Pendiente de acordar</span></CitaField>
          )}
        </CitaBlock>

        {cita.motivo && (
          <CitaBlock title="Motivo de la visita" icon={MessageSquareText} theme={CITA_THEMES.motivo} plain>
            {cita.motivo}
          </CitaBlock>
        )}

        {cita.estado === "cancelada" && (
          <section className="sm:col-span-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-semibold">
                Cancelada{cita.cancelada_por === "familia" ? " por la familia" : cita.cancelada_por === "profesor" ? " por el profesor/a" : ""}
              </span>
              {cita.motivo_cancelacion && <>: {cita.motivo_cancelacion}</>}
            </p>
          </section>
        )}
      </div>

      {actions && <div className="flex flex-wrap justify-end gap-2 mt-3">{actions}</div>}
    </article>
  );
}
