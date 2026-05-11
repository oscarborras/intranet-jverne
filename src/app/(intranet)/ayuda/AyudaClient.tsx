"use client";

import { useState } from "react";
import {
  HelpCircle, Laptop, Users, CalendarDays, Plus, BookOpen,
  CheckCircle2, MapPin, ChevronRight, ArrowLeft, Clock,
  Mail, X, CalendarCheck, Smartphone, ShieldAlert,
  BookMarked, FileText, GraduationCap, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemId = "carros" | "citas" | "movil";
type Category = "tutorial" | "protocolo";

interface ItemMeta {
  id: ItemId;
  category: Category;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  headerBg: string;
  headerText: string;
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

const ITEMS: ItemMeta[] = [
  {
    id: "carros",
    category: "tutorial",
    icon: <Laptop size={22} className="text-white" />,
    title: "Reservar un carro de portátiles",
    description: "Consulta disponibilidad y reserva un carro para tu aula.",
    badge: "6 pasos · <1 min",
    headerBg: "bg-blue-600",
    headerText: "text-blue-600",
  },
  {
    id: "citas",
    category: "tutorial",
    icon: <Users size={22} className="text-white" />,
    title: "Gestionar citas con familias",
    description: "Confirma solicitudes, crea citas directas y cancela visitas.",
    badge: "7 pasos · 2 min",
    headerBg: "bg-red-600",
    headerText: "text-red-600",
  },
  {
    id: "movil",
    category: "protocolo",
    icon: <Smartphone size={22} className="text-white" />,
    title: "Uso del móvil por el alumnado",
    description: "Normas para el profesorado sobre el uso del móvil en el aula y guardias.",
    badge: "5 reglas",
    headerBg: "bg-amber-500",
    headerText: "text-amber-600",
  },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StepConnector() {
  return <div className="w-px flex-1 bg-gray-100 mt-2" />;
}

function StepNum({ n, accent }: { n: number; accent: "blue" | "red" }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
      accent === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
    }`}>
      {n}
    </div>
  );
}

// ─── Tutorial: Carros ─────────────────────────────────────────────────────────

function TutorialCarros() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Accede a la sección de Reservas</p>
          <p className="text-sm text-gray-500 mb-3">En el menú lateral, pulsa <strong className="text-gray-700">Reservas</strong> → <strong className="text-gray-700">Carros de portátiles</strong>.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs space-y-1 max-w-[200px]">
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><CalendarDays size={12} /> Calendario</div>
            <div className="flex items-center gap-2 text-blue-700 font-semibold bg-blue-50 py-1 px-2 rounded border border-blue-200"><Laptop size={12} /> Carros de portátiles</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><BookOpen size={12} /> Anuncios</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Selecciona el día</p>
          <p className="text-sm text-gray-500 mb-3">En el calendario de la izquierda, pulsa el día que necesitas.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 max-w-[200px]">
            <div className="text-xs text-gray-500 font-semibold mb-2 text-center">Mayo 2026</div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 mb-1">
              {["L","M","X","J","V","S","D"].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {["","","","","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21"].map((d, i) =>
                d === "14" ? <span key={i} className="w-5 h-5 mx-auto rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">{d}</span>
                : d === "" ? <span key={i} />
                : <span key={i} className="w-5 h-5 mx-auto flex items-center justify-center text-gray-600 rounded-full">{d}</span>
              )}
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">
            Pulsa el botón <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 rounded-full text-white text-[9px] font-bold">+</span> en la celda deseada
          </p>
          <p className="text-sm text-gray-500 mb-3">Pulsa el <strong className="text-gray-700">círculo verde +</strong> del tramo y carro que necesitas.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden max-w-xs">
            <table className="text-[10px] w-full">
              <thead>
                <tr className="bg-gray-100 text-gray-500">
                  <th className="px-2 py-1.5 text-left font-medium">Horario</th>
                  <th className="px-2 py-1.5 text-center font-medium">Carro 1</th>
                  <th className="px-2 py-1.5 text-center font-medium">Carro 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-2 py-1.5 text-gray-500">08:00–09:00</td>
                  <td className="px-2 py-1.5 text-center"><span className="inline-block bg-red-100 text-red-700 rounded px-1.5 py-0.5 text-[9px] font-medium">García</span></td>
                  <td className="px-2 py-1.5 text-center"><span className="w-5 h-5 mx-auto rounded-full border-2 border-dashed border-green-400 flex items-center justify-center text-green-500 font-bold">+</span></td>
                </tr>
                <tr className="bg-blue-50/40">
                  <td className="px-2 py-1.5 text-gray-500">09:00–10:00</td>
                  <td className="px-2 py-1.5 text-center"><span className="w-5 h-5 mx-auto rounded-full border-2 border-dashed border-green-400 ring-2 ring-green-300 flex items-center justify-center text-green-500 font-bold">+</span></td>
                  <td className="px-2 py-1.5 text-center"><span className="w-5 h-5 mx-auto rounded-full border-2 border-dashed border-green-400 flex items-center justify-center text-green-500 font-bold">+</span></td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 text-gray-500">10:00–11:00</td>
                  <td className="px-2 py-1.5 text-center"><span className="inline-block bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-[9px] font-medium">Tú</span></td>
                  <td className="px-2 py-1.5 text-center"><span className="w-5 h-5 mx-auto rounded-full border-2 border-dashed border-green-400 flex items-center justify-center text-green-500 font-bold">+</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Introduce el aula</p>
          <p className="text-sm text-gray-500 mb-3">Escribe el nombre del aula donde usarás el carro (p. ej. <em>Aula B2</em>).</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 max-w-[220px]">
            <p className="text-[11px] font-semibold text-gray-700 mb-0.5">Confirmar Reserva</p>
            <p className="text-[10px] text-gray-400 mb-3">Carro 1 · 09:00–10:00</p>
            <label className="text-[10px] text-gray-500 block mb-1">Aula</label>
            <div className="border border-blue-400 rounded-md px-2 py-1 text-[11px] text-gray-700 bg-blue-50/30">Aula B2</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Pulsa «Reservar»</p>
          <p className="text-sm text-gray-500 mb-3">Confirma pulsando el botón azul. La operación tarda menos de un segundo.</p>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500">Cancelar</span>
            <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-[11px] text-white font-semibold">Reservar</span>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm mb-1">¡Listo! Reserva confirmada</p>
          <p className="text-sm text-gray-500 mb-3">La celda queda en <strong className="text-blue-700">azul con «Tú»</strong>. Si no usas el carro, cancela la reserva para liberar el recurso.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
            ✓ Reserva registrada correctamente. Si no la necesitas, cancélala para liberar el recurso.
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Tutorial: Citas ──────────────────────────────────────────────────────────

function TutorialCitas() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Accede a «Citas con Familias»</p>
          <p className="text-sm text-gray-500 mb-3">En el menú lateral pulsa <strong className="text-gray-700">Citas con Familias</strong>. Verás tus solicitudes agrupadas por estado.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs space-y-1 max-w-[200px]">
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><CalendarDays size={12} /> Calendario</div>
            <div className="flex items-center gap-2 text-red-700 font-semibold bg-red-50 py-1 px-2 rounded border border-red-200"><Users size={12} /> Citas con Familias</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><BookOpen size={12} /> Anuncios</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Revisa las solicitudes pendientes</p>
          <p className="text-sm text-gray-500 mb-3">Las nuevas solicitudes llegan a la pestaña <strong className="text-gray-700">Pendientes</strong>, marcada con un contador.</p>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "Pendientes", badge: "3", active: true },
              { label: "Confirmadas", badge: null, active: false },
              { label: "Completadas", badge: null, active: false },
              { label: "Canceladas", badge: null, active: false },
            ].map(tab => (
              <span key={tab.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border ${tab.active ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-500 border-gray-200"}`}>
                {tab.label}
                {tab.badge && <span className="bg-white text-red-600 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{tab.badge}</span>}
              </span>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Confirma la cita con fecha, hora y lugar</p>
          <p className="text-sm text-gray-500 mb-3">Pulsa <strong className="text-gray-700">Registrar cita</strong>, elige fecha, hora y lugar, y pulsa <strong className="text-gray-700">Confirmar cita</strong>.</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 max-w-[240px]">
            <p className="text-[11px] font-semibold text-gray-700 mb-3">Registrar cita</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Fecha *</label>
                <div className="border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-600 flex items-center gap-1"><CalendarDays size={10} className="text-gray-400" /> 22/05/2026</div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Hora *</label>
                <div className="border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-600 flex items-center gap-1"><Clock size={10} className="text-gray-400" /> 16:30</div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Lugar *</label>
                <div className="border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-600 flex items-center gap-1"><MapPin size={10} className="text-gray-400" /> Sala de visitas</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-1 rounded border border-gray-200 text-[10px] text-gray-500">Cancelar</span>
              <span className="px-2 py-1 rounded bg-green-600 text-[10px] text-white font-semibold">Confirmar cita</span>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">La familia recibe un email automático</p>
          <p className="text-sm text-gray-500 mb-3">Al confirmar, la familia recibe fecha, hora y lugar, junto con un <strong className="text-gray-700">enlace para cancelar</strong>.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2"><Mail size={11} className="text-gray-400" /><span className="text-[10px] text-gray-500">Para: familia@email.com</span></div>
            <p className="text-[11px] text-gray-700 font-medium mb-1">Cita confirmada · IES Julio Verne</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">Su cita ha sido confirmada para el <strong className="text-gray-700">22 de mayo a las 16:30</strong> en la <strong className="text-gray-700">Sala de visitas</strong>.</p>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Tras la reunión, marca como «Completada»</p>
          <p className="text-sm text-gray-500 mb-3">Una vez celebrada la visita, pulsa el botón morado para archivarla.</p>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Completada</span>
            <span className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500 flex items-center gap-1"><X size={11} /> Cancelar</span>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={6} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Para cancelar: motivo opcional y confirma</p>
          <p className="text-sm text-gray-500 mb-3">Pulsa <strong className="text-gray-700">Cancelar</strong>, añade un motivo si quieres, y confirma. La familia recibirá un aviso por email.</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 max-w-[240px]">
            <p className="text-[11px] font-semibold text-gray-700 mb-2">¿Cancelar esta cita?</p>
            <label className="text-[10px] text-gray-500 block mb-1">Motivo (opcional)</label>
            <div className="border border-gray-200 rounded px-2 py-1.5 text-[10px] text-gray-400 bg-gray-50 mb-3">Indique el motivo...</div>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded border border-gray-200 text-[10px] text-gray-500">Volver</span>
              <span className="px-2 py-1 rounded bg-red-600 text-[10px] text-white font-semibold">Sí, cancelar</span>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm mb-1">¿Prefieres crear la cita tú directamente?</p>
          <p className="text-sm text-gray-500 mb-3">Usa <strong className="text-gray-700">+ Nueva cita</strong> para crearla ya confirmada sin esperar solicitud de la familia.</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold"><Plus size={11} /> Nueva cita</span>
            <span className="text-xs text-gray-400">→ se crea directamente como «Confirmada»</span>
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Protocolo: Uso del móvil ─────────────────────────────────────────────────

function ProtocoloMovil() {
  const rules = [
    {
      icon: <ShieldAlert size={18} className="text-red-600" />,
      bg: "bg-red-50 border-red-200",
      iconBg: "bg-red-100",
      title: "Durante guardias y sustituciones",
      tag: "PROHIBIDO",
      tagColor: "bg-red-100 text-red-700",
      body: "No está permitido el uso del móvil por el alumnado. Si dejas actividades programadas para tu ausencia, NO las cuelgues en Classroom: déjalas en la sala de profesores o envíalas al equipo directivo al comunicar la falta.",
    },
    {
      icon: <GraduationCap size={18} className="text-green-700" />,
      bg: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      title: "Para actividades educativas en clase",
      tag: "PERMITIDO",
      tagColor: "bg-green-100 text-green-700",
      body: "El uso del móvil con fines educativos está permitido sin restricción de frecuencia. Debes avisar a las familias con antelación a través de iPasen o correo corporativo, independientemente de cuántas actividades sean.",
    },
    {
      icon: <Mail size={18} className="text-blue-600" />,
      bg: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      title: "Comunicación a las familias",
      tag: "OBLIGATORIO",
      tagColor: "bg-blue-100 text-blue-700",
      body: "La primera comunicación sobre el uso previsto del móvil en tu asignatura se hace a través del tutor/a en una sola comunicación colectiva. Si el uso es esporádico posterior, el tutor/a se encarga de informar.",
    },
    {
      icon: <FileText size={18} className="text-purple-600" />,
      bg: "bg-purple-50 border-purple-200",
      iconBg: "bg-purple-100",
      title: "Registro en acta de departamento",
      tag: "OBLIGATORIO",
      tagColor: "bg-purple-100 text-purple-700",
      body: "Debe constar en el acta de reunión de departamento: el uso que harás del móvil en cada asignatura, la obligación de informar a las familias con antelación, y cualquier uso en actividades complementarias o extraescolares.",
    },
    {
      icon: <BookMarked size={18} className="text-gray-600" />,
      bg: "bg-gray-50 border-gray-200",
      iconBg: "bg-gray-100",
      title: "Alumnado de Ciclos Formativos en pasillos",
      tag: "RECUERDA",
      tagColor: "bg-gray-200 text-gray-600",
      body: "Si impartes Ciclos Formativos, recuerda a tu alumnado que el uso del móvil en los pasillos está prohibido para el resto del alumnado del centro, y deben evitar usarlo fuera del aula salvo causa de fuerza mayor.",
    },
  ];

  return (
    <div>
      {/* Scope */}
      <div className="mx-6 mt-5 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-3">Ámbito de aplicación</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-green-800">Aplica a</p>
              <p className="text-[10px] text-green-700">ESO · Bachillerato · FPB</p>
              <p className="text-[10px] text-green-700">(menores y mayores de edad)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
            <X size={14} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-gray-700">No aplica a</p>
              <p className="text-[10px] text-gray-600">Ciclos Formativos</p>
              <p className="text-[10px] text-gray-500">(gestionado por su profesorado)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="px-6 pb-2 space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className={`rounded-xl border p-4 ${rule.bg}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${rule.iconBg}`}>
                {rule.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <p className="font-semibold text-gray-900 text-sm">{rule.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.tagColor}`}>{rule.tag}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{rule.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resources */}
      <div className="mx-6 my-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Recursos sobre seguridad digital</p>
        <div className="space-y-2">
          <a className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium" href="https://www.incibe.es/menores" target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> MENORES INCIBE — seguridad en internet para menores
          </a>
          <a className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium" href="https://unatoriadiferente.com" target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> Una tutoría diferente
          </a>
        </div>
        <p className="text-[11px] text-gray-400 mt-3">Útiles para tratar la seguridad digital con el alumnado en tutoría o en clase.</p>
      </div>
    </div>
  );
}

// ─── Content & tips map ───────────────────────────────────────────────────────

const ITEM_CONTENT: Record<ItemId, React.ReactNode> = {
  carros: <TutorialCarros />,
  citas: <TutorialCitas />,
  movil: <ProtocoloMovil />,
};

const ITEM_TIPS: Record<ItemId, React.ReactNode> = {
  carros: (
    <p className="text-xs text-amber-800">
      <strong>¿Varios días seguidos?</strong> Usa el botón <strong>Reserva múltiple</strong> (TDE y Directiva) para seleccionar un rango de fechas, días y tramos de una sola vez.
    </p>
  ),
  citas: (
    <p className="text-xs text-amber-800">
      <strong>Enlace para familias:</strong> Comparte <strong>/familias/solicitar</strong> con las familias para que pidan cita desde casa sin necesidad de acceso a la intranet.
    </p>
  ),
  movil: (
    <p className="text-xs text-amber-800">
      <strong>Este protocolo es flexible:</strong> cualquier miembro del claustro puede proponer modificaciones, ampliaciones o correcciones al equipo directivo.
    </p>
  ),
};

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onSelect }: { item: ItemMeta; onSelect: (id: ItemId) => void }) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 text-left hover:border-gray-200 hover:shadow-sm transition-all group w-full"
    >
      <div className={`w-11 h-11 rounded-xl ${item.headerBg} flex items-center justify-center flex-shrink-0`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.description}</p>
        <p className="text-[11px] text-gray-400 mt-1">{item.badge}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AyudaClient() {
  const [active, setActive] = useState<ItemId | null>(null);
  const meta = active ? ITEMS.find(t => t.id === active)! : null;

  const tutorials = ITEMS.filter(i => i.category === "tutorial");
  const protocolos = ITEMS.filter(i => i.category === "protocolo");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {active ? (
          <button
            onClick={() => setActive(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> Ayuda y Tutoriales
          </button>
        ) : (
          <>
            <HelpCircle size={24} className="text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ayuda y Tutoriales</h1>
              <p className="text-sm text-gray-500">Guías de uso de la intranet</p>
            </div>
          </>
        )}
      </div>

      {/* Home: sections */}
      {!active && (
        <div className="space-y-5">
          {/* Tutorials */}
          <section>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Tutoriales</p>
            <div className="grid gap-2">
              {tutorials.map(t => <ItemCard key={t.id} item={t} onSelect={setActive} />)}
            </div>
          </section>

          {/* Protocols */}
          <section>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Protocolos</p>
            <div className="grid gap-2">
              {protocolos.map(t => <ItemCard key={t.id} item={t} onSelect={setActive} />)}
            </div>
          </section>
        </div>
      )}

      {/* Detail view */}
      {active && meta && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className={`${meta.headerBg} px-6 py-5 flex items-center gap-4`}>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {meta.icon}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-0.5">
                {meta.category === "protocolo" ? "Protocolo" : "Tutorial"}
              </p>
              <h2 className="text-white font-semibold text-base leading-snug">{meta.title}</h2>
              <p className="text-white/60 text-xs mt-0.5">{meta.badge}</p>
            </div>
          </div>

          {ITEM_CONTENT[active]}

          <div className="bg-amber-50 border-t border-amber-100 px-6 py-4 flex gap-3 items-start">
            <span className="text-amber-500 text-base flex-shrink-0">💡</span>
            {ITEM_TIPS[active]}
          </div>
        </div>
      )}
    </div>
  );
}
