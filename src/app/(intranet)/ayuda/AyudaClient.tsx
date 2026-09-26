"use client";

import { useState, useRef, useEffect } from "react";
import {
  HelpCircle, Laptop, Users, User, CalendarDays, Plus, PlusCircle, BookOpen,
  CheckCircle2, MapPin, ChevronRight, ArrowLeft, Clock, Camera,
  Mail, X, CalendarCheck, Smartphone, ShieldAlert, Monitor, Wrench,
  BookMarked, FileText, GraduationCap, ExternalLink, RotateCcw, Printer, ClipboardCheck,
  CalendarClock, LayoutDashboard, RefreshCw, Search, Copy, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemId = "carros" | "citas" | "familias" | "ordenanza" | "movil" | "prestamos" | "devoluciones" | "revisiones" | "tic" | "mantenimiento";
type Category = "tutorial" | "protocolo";
type ModuleId = "carros-portatiles" | "citas-familias" | "citas-del-dia" | "gratuidad-libros" | "peticiones-incidencias";

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

interface ModuleMeta {
  id: ModuleId;
  // Uno o varios slugs de modulos_config. Con varios, el botón se muestra si
  // al menos uno de ellos está activo para el perfil del usuario.
  slug?: string | string[];
  // Pages outside modulos_config: the button is shown only to these profiles
  roles?: string[];
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  tutorials: ItemId[];
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
    title: "Gestionar citas con familias (profesorado)",
    description: "Confirma solicitudes, crea citas directas y cancela visitas.",
    badge: "7 pasos · 2 min",
    headerBg: "bg-red-600",
    headerText: "text-red-600",
  },
  {
    id: "familias",
    category: "tutorial",
    icon: <Mail size={22} className="text-white" />,
    title: "Cómo piden y cancelan cita las familias",
    description: "Lo que ve la familia al solicitar una cita desde casa y cómo la cancela si no puede asistir.",
    badge: "8 pasos · 2 min",
    headerBg: "bg-rose-600",
    headerText: "text-rose-600",
  },
  {
    id: "ordenanza",
    category: "tutorial",
    icon: <CalendarClock size={22} className="text-white" />,
    title: "Consultar las citas del día (ordenanzas)",
    description: "Localiza a qué profesor/a viene a ver cada familia, a qué hora y dónde.",
    badge: "5 pasos · 1 min",
    headerBg: "bg-blue-700",
    headerText: "text-blue-700",
  },
  {
    id: "prestamos",
    category: "tutorial",
    icon: <BookMarked size={22} className="text-white" />,
    title: "Registrar préstamos de libros",
    description: "Elige un libro y marca qué alumnos lo reciben; cada marca se guarda al instante.",
    badge: "6 pasos · 1 min",
    headerBg: "bg-emerald-600",
    headerText: "text-emerald-600",
  },
  {
    id: "devoluciones",
    category: "tutorial",
    icon: <RotateCcw size={22} className="text-white" />,
    title: "Registrar devoluciones de libros",
    description: "Recoge los libros por asignatura o por alumno e indica el estado de cada ejemplar.",
    badge: "7 pasos · 2 min",
    headerBg: "bg-orange-500",
    headerText: "text-orange-600",
  },
  {
    id: "revisiones",
    category: "tutorial",
    icon: <ClipboardCheck size={22} className="text-white" />,
    title: "Revisar el estado de los libros",
    description: "Examina y registra el estado de los libros antes de la devolución formal al coordinador.",
    badge: "7 pasos · 2 min",
    headerBg: "bg-indigo-600",
    headerText: "text-indigo-600",
  },
  {
    id: "tic",
    category: "tutorial",
    icon: <Monitor size={22} className="text-white" />,
    title: "Crear una petición TIC",
    description: "Registra una incidencia con un ordenador, impresora, red o aplicación.",
    badge: "6 pasos · 1 min",
    headerBg: "bg-blue-600",
    headerText: "text-blue-600",
  },
  {
    id: "mantenimiento",
    category: "tutorial",
    icon: <Wrench size={22} className="text-white" />,
    title: "Crear una petición de Mantenimiento",
    description: "Registra una incidencia de instalaciones, mobiliario o similar.",
    badge: "5 pasos · 1 min",
    headerBg: "bg-red-500",
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

const MODULES: ModuleMeta[] = [
  {
    id: "carros-portatiles",
    slug: "reservas/carros",
    icon: <Laptop size={22} className="text-white" />,
    title: "Carros de Portátiles",
    description: "Reserva y gestión de carros de portátiles para el aula.",
    color: "bg-blue-600",
    tutorials: ["carros"],
  },
  {
    id: "citas-familias",
    slug: "citas-familias",
    icon: <Users size={22} className="text-white" />,
    title: "Citas con Familias",
    description: "Confirmación y gestión de citas con las familias del alumnado.",
    color: "bg-red-600",
    tutorials: ["citas", "familias"],
  },
  {
    id: "citas-del-dia",
    roles: ["Ordenanza"],
    icon: <CalendarClock size={22} className="text-white" />,
    title: "Citas del Día",
    description: "Consulta en conserjería las citas con familias confirmadas para hoy.",
    color: "bg-blue-700",
    tutorials: ["ordenanza"],
  },
  {
    id: "gratuidad-libros",
    slug: "gratuidad-libros",
    icon: <BookMarked size={22} className="text-white" />,
    title: "Gratuidad de Libros",
    description: "Préstamos y devoluciones del programa de gratuidad de libros.",
    color: "bg-emerald-600",
    tutorials: ["prestamos", "devoluciones", "revisiones"],
  },
  {
    id: "peticiones-incidencias",
    slug: ["peticiones-tic", "peticiones-mantenimiento"],
    icon: <ShieldAlert size={22} className="text-white" />,
    title: "Peticiones e incidencias",
    description: "Incidencias TIC (equipos, red, aplicaciones) y de mantenimiento (instalaciones, mobiliario).",
    color: "bg-slate-700",
    tutorials: ["tic", "mantenimiento"],
  },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StepConnector() {
  return <div className="w-px flex-1 bg-gray-100 mt-2" />;
}

function StepNum({ n, accent }: { n: number; accent: "blue" | "red" }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${accent === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
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
              {["L", "M", "X", "J", "V", "S", "D"].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {["", "", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"].map((d, i) =>
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

// ─── Tutorial: Solicitud y cancelación por las familias ───────────────────────

// Prominent banner that splits a tutorial into parts
function PartHeading({ icon: Icon, title, subtitle, bg }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  bg: string;
}) {
  return (
    <li className="px-4 sm:px-6 pt-5 pb-2">
      <div className={`${bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
        <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-white" />
        </span>
        <div className="min-w-0">
          <h3 className="text-white font-bold text-sm uppercase tracking-wide">{title}</h3>
          <p className="text-white/80 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
    </li>
  );
}

const FAMILIAS_SOLICITAR_PATH = "/familias/solicitar";

// Full public URL of the family request page, built from the address currently in use.
// Read after mount so server and client render the same HTML (no hydration mismatch).
function FamiliasSolicitarUrl() {
  const [url, setUrl] = useState(FAMILIAS_SOLICITAR_PATH);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${FAMILIAS_SOLICITAR_PATH}`);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available (e.g. insecure context): the URL is still visible to copy by hand
    }
  }

  return (
    <div className="flex items-center gap-2 max-w-md">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex-1 min-w-0 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2 hover:border-rose-300 transition-colors"
      >
        <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
        <span className="text-[11px] text-gray-700 font-mono break-all">{url}</span>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar dirección"
        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {copied ? <><Check size={12} className="text-green-600" /> Copiada</> : <><Copy size={12} /> Copiar</>}
      </button>
    </div>
  );
}

function TutorialFamilias() {
  return (
    <ol className="divide-y divide-gray-50">
      <PartHeading icon={CalendarCheck} title="Solicitar la cita" subtitle="Pasos 1 a 5 · lo que hace la familia desde casa" bg="bg-rose-600" />

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">La familia entra en la página de solicitud</p>
          <p className="text-sm text-gray-500 mb-3">Comparte con las familias esta dirección (por iPasen, correo o la agenda). No necesitan usuario ni contraseña.</p>
          <FamiliasSolicitarUrl />
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Elige con quién quiere la cita</p>
          <p className="text-sm text-gray-500 mb-3">Puede pedirla con <strong className="text-gray-700">un profesor/a</strong> o con un cargo del equipo directivo. Al elegir un cargo, la solicitud llega a quien lo ocupa; la familia solo ve el nombre del cargo.</p>
          <div className="grid grid-cols-2 gap-1.5 max-w-xs">
            {["Un profesor/a", "Director/a", "Jefatura de estudios", "Secretaría"].map((label, i) => (
              <span key={label} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[10px] ${i === 0 ? "border-violet-400 bg-violet-50 text-violet-800 font-semibold" : "border-gray-200 bg-white text-gray-600"}`}>
                <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${i === 0 ? "border-violet-600 bg-violet-600" : "border-gray-300"}`} />
                {label}
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
          <p className="font-medium text-gray-900 text-sm mb-1">Busca al profesor/a por su nombre</p>
          <p className="text-sm text-gray-500 mb-3">Escribe al menos <strong className="text-gray-700">3 letras</strong> del nombre o los apellidos (sin importar tildes ni mayúsculas) y elige entre las sugerencias. Por privacidad, nunca se muestra la lista completa del profesorado.</p>
          <div className="max-w-xs">
            <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
              <Search size={12} className="text-gray-400" />
              <span className="text-[11px] text-gray-700">garcia ana</span>
            </div>
            <div className="mt-1 bg-white rounded-lg border border-violet-200 shadow-sm p-1">
              <p className="text-[11px] text-gray-900 px-2 py-1.5 rounded bg-violet-50">García López, Ana</p>
              <p className="text-[11px] text-gray-900 px-2 py-1.5">García Ruiz, Ana María</p>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Rellena los datos y el motivo</p>
          <p className="text-sm text-gray-500 mb-3">Nombre y curso del alumno/a, sus datos como familiar y el motivo de la visita. El <strong className="text-gray-700">email</strong> es importante: ahí recibirá la confirmación y el enlace para cancelar.</p>
          <div className="space-y-1.5 max-w-xs text-[11px] font-semibold">
            <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-900 px-2.5 py-1.5 flex items-center gap-1.5"><GraduationCap size={12} /> Datos del alumno/a</div>
            <div className="rounded-md border border-green-200 bg-green-50 text-green-900 px-2.5 py-1.5 flex items-center gap-1.5"><Users size={12} /> Datos del familiar</div>
            <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-2.5 py-1.5 flex items-center gap-1.5"><FileText size={12} /> Motivo de la visita</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Envía la solicitud y te llega a ti</p>
          <p className="text-sm text-gray-500 mb-3">La familia ve el mensaje <strong className="text-gray-700">«Solicitud enviada»</strong>. Tú recibes un email y la solicitud aparece en la pestaña <strong className="text-gray-700">Pendientes</strong> de «Citas con Familias», donde la confirmas con fecha, hora y lugar.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-1"><Mail size={11} className="text-gray-400" /><span className="text-[10px] text-gray-500">Para: tu correo del centro</span></div>
            <p className="text-[11px] text-gray-700 font-medium">Nueva solicitud de cita – García López, Ana</p>
          </div>
        </div>
      </li>

      <PartHeading icon={X} title="Cancelar la cita" subtitle="Pasos 6 a 8 · cuando la familia no puede asistir" bg="bg-slate-700" />

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={6} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Al confirmarla, la familia recibe el enlace de cancelación</p>
          <p className="text-sm text-gray-500 mb-3">El email <strong className="text-gray-700">«Cita confirmada»</strong> incluye la fecha, la hora, el lugar y un botón para cancelar. Es la única forma de cancelar que tiene la familia.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 max-w-xs">
            <p className="text-[11px] text-gray-700 font-medium mb-1">Cita confirmada · IES Julio Verne</p>
            <p className="text-[10px] text-gray-500 mb-2">22 de mayo a las 16:30 · Sala de visitas</p>
            <span className="inline-block px-2.5 py-1 rounded bg-red-600 text-[10px] text-white font-semibold">Cancelar mi cita</span>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={7} accent="red" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">La familia revisa los datos y confirma la cancelación</p>
          <p className="text-sm text-gray-500 mb-3">El botón abre una página con los datos de la cita y la pregunta <strong className="text-gray-700">«¿Desea cancelar esta cita?»</strong>. Al pulsar <strong className="text-gray-700">Sí, cancelar la cita</strong> queda cancelada.</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 max-w-[240px]">
            <p className="text-[11px] font-semibold text-gray-700 mb-2">¿Desea cancelar esta cita?</p>
            <div className="bg-gray-50 rounded px-2 py-1.5 text-[10px] text-gray-500 mb-2 space-y-0.5">
              <p className="flex items-center gap-1"><CalendarDays size={9} /> 22 de mayo · <Clock size={9} /> 16:30</p>
              <p className="flex items-center gap-1"><MapPin size={9} /> Sala de visitas</p>
            </div>
            <span className="block text-center px-2 py-1 rounded bg-red-600 text-[10px] text-white font-semibold">Sí, cancelar la cita</span>
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
          <p className="font-medium text-gray-900 text-sm mb-1">Recibes el aviso de la cancelación</p>
          <p className="text-sm text-gray-500 mb-3">Te llega el email <strong className="text-gray-700">«Cita cancelada por la familia»</strong> y la cita pasa a la pestaña <strong className="text-gray-700">Canceladas</strong>, marcada con «(familia)».</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">Cancelada</span>
            <span className="text-[10px] text-gray-400">(familia)</span>
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Tutorial: Citas del día (ordenanzas) ─────────────────────────────────────

function TutorialOrdenanza() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Accede a «Citas del día»</p>
          <p className="text-sm text-gray-500 mb-3">En el menú lateral pulsa <strong className="text-gray-700">Citas del día</strong>. En el móvil, abre antes el menú con el botón ☰ de la parte superior.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs space-y-1 max-w-[200px]">
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><LayoutDashboard size={12} /> Dashboard</div>
            <div className="flex items-center gap-2 text-blue-700 font-semibold bg-blue-50 py-1 px-2 rounded border border-blue-200"><CalendarClock size={12} /> Citas del día</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><HelpCircle size={12} /> Ayuda y Tutoriales</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Consulta las citas de hoy</p>
          <p className="text-sm text-gray-500 mb-3">Solo aparecen las citas <strong className="text-gray-700">confirmadas para hoy</strong>, agrupadas por profesor/a y ordenadas por hora. Arriba verás cuántas hay en total.</p>
          <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-[11px] font-semibold">3 citas hoy</span>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Identifica a la familia y a quién viene a ver</p>
          <p className="text-sm text-gray-500 mb-3">Cada tarjeta indica el <strong className="text-gray-700">profesor/a</strong> en la cabecera y, en cada cita, la <strong className="text-gray-700">hora</strong>, el alumno/a con su curso, el familiar con su parentesco y el <strong className="text-gray-700">lugar</strong> de la reunión.</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden max-w-xs">
            <div className="bg-blue-900 px-3 py-2 flex items-center gap-2">
              <User size={12} className="text-blue-300" />
              <span className="text-white text-[11px] font-semibold flex-1">García López, Ana</span>
              <span className="bg-white/20 text-white text-[10px] rounded-full px-1.5">1</span>
            </div>
            <div className="px-3 py-2.5 flex items-start gap-2.5">
              <div className="bg-blue-50 rounded px-2 py-1.5 text-blue-700 font-bold text-xs">16:30</div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-900">Pérez Ruiz, Lucía <span className="font-normal text-gray-400">(2º ESO B)</span></p>
                <p className="text-[10px] text-gray-500">María Ruiz · Madre</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={9} /> Sala de visitas</p>
              </div>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Busca por alumno, familiar o profesor</p>
          <p className="text-sm text-gray-500 mb-3">Cuando llegue una familia, escribe parte del nombre del alumno/a, del familiar o del profesor/a y la lista se filtra al momento.</p>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2 max-w-xs">
            <Search size={12} className="text-gray-400" />
            <span className="text-[11px] text-gray-700">lucía</span>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">La lista se actualiza sola</p>
          <p className="text-sm text-gray-500 mb-3">La página se refresca automáticamente <strong className="text-gray-700">cada minuto</strong>, así que puedes dejarla abierta toda la jornada. Si quieres ver los cambios al instante, pulsa el botón de actualizar de la cabecera.</p>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700"><RefreshCw size={14} className="text-white" /></span>
        </div>
      </li>
    </ol>
  );
}

// ─── Tutorial: Préstamos ──────────────────────────────────────────────────────

function TutorialPrestamos() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Accede a «Gratuidad de Libros»</p>
          <p className="text-sm text-gray-500 mb-3">En el menú lateral, pulsa <strong className="text-gray-700">Gratuidad de Libros</strong>.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs space-y-1 max-w-[210px]">
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><CalendarDays size={12} /> Calendario</div>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 py-1 px-2 rounded border border-emerald-200"><BookMarked size={12} /> Gratuidad de Libros</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><BookOpen size={12} /> Anuncios</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Selecciona la pestaña «Préstamos»</p>
          <p className="text-sm text-gray-500 mb-3">Es la pestaña activa por defecto al entrar en la sección.</p>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "Préstamos", active: true },
              { label: "Devoluciones", active: false },
              { label: "Seguimiento", active: false },
            ].map(tab => (
              <span key={tab.label} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border ${tab.active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-200"}`}>
                {tab.label}
              </span>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Elige tu grupo en el selector</p>
          <p className="text-sm text-gray-500 mb-3">Despliega el selector y elige tu clase. Aparecerá un contador con el número de alumnos.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="border border-blue-400 rounded-lg px-3 py-1.5 text-[11px] font-medium bg-blue-50/40 text-gray-700 flex items-center gap-1.5">
              2º ESO A <span className="text-gray-400">▼</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1 rounded-full">
              <Users size={11} /> 24 alumnos/as
            </span>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 1 — Elige el libro que vas a entregar</p>
          <p className="text-sm text-gray-500 mb-3">Solo puedes marcar <strong className="text-gray-700">un libro a la vez</strong>, para que el proceso sea lo más sencillo posible. El número <strong className="text-gray-700">disponibles/total</strong> aparece junto a cada título.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[240px]">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-700">Lote del curso · 2º ESO</span>
              <span className="text-[9px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">3 libros</span>
            </div>
            {[
              { titulo: "Lengua Castellana", stock: "24/25", checked: false, sinStock: false },
              { titulo: "Matemáticas", stock: "22/25", checked: true, sinStock: false },
              { titulo: "Historia de España", stock: "0/25", checked: false, sinStock: true },
            ].map(l => (
              <div key={l.titulo} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0 ${l.checked && !l.sinStock ? "bg-blue-50" : ""} ${l.sinStock ? "opacity-60" : ""}`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 ${l.checked && !l.sinStock ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                  {l.checked && !l.sinStock && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </div>
                <span className="text-[10px] text-gray-800 flex-1 truncate">{l.titulo}</span>
                <span className={`text-[10px] font-semibold tabular-nums flex-shrink-0 ${l.sinStock ? "text-red-500" : "text-gray-700"}`}>{l.stock}</span>
              </div>
            ))}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[9px] text-gray-400">Disponibles / Total. Sin stock no se puede marcar.</p>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 2 — Marca quién recibe el libro</p>
          <p className="text-sm text-gray-500 mb-3">En el panel derecho, marca la casilla de cada alumno: <strong className="text-gray-700">la entrega se registra al instante</strong>, no hace falta ningún botón adicional. Quien ya lo tuviera aparece premarcado como <span className="text-green-700 font-medium">Entregado</span>. Junto a cada alumno puedes marcar también, si quieres, si el libro se entrega <strong className="text-gray-700">Nuevo</strong> o <strong className="text-gray-700">Deteriorado</strong> — es opcional, y puedes marcarlo antes o después de registrar la entrega.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[300px]">
            <div className="px-3 py-2 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-700">Alumnado del grupo</span>
            </div>
            {[
              { nombre: "García Pérez, Ana", entregado: true, estado: "nuevo" as const },
              { nombre: "Martínez López, Luis", entregado: false, estado: null },
              { nombre: "Sánchez Ruiz, Carmen", entregado: false, estado: null },
            ].map(a => (
              <div key={a.nombre} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0 ${a.entregado ? "bg-green-50/40" : ""}`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 ${a.entregado ? "bg-green-600 border-green-600" : "border-gray-300"}`}>
                  {a.entregado && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </div>
                <span className="text-[10px] text-gray-800 flex-1 min-w-0 truncate">{a.nombre}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`flex items-center gap-0.5 text-[8px] ${a.estado === "nuevo" ? "text-blue-600 font-semibold" : "text-gray-400"}`}>
                    <span className={`w-2.5 h-2.5 rounded-sm border ${a.estado === "nuevo" ? "bg-blue-600 border-blue-600" : "border-gray-300"}`} />
                    Nuevo
                  </span>
                  <span className="flex items-center gap-0.5 text-[8px] text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-sm border border-gray-300" />
                    Det.
                  </span>
                </span>
                {a.entregado && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 text-green-700 bg-green-100">Entregado</span>
                )}
              </div>
            ))}
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
          <p className="font-medium text-gray-900 text-sm mb-1">¿Te has equivocado? Desmárcalo</p>
          <p className="text-sm text-gray-500 mb-3">No hay botón «Entregar»: cada marca ya ha quedado registrada. Si te confundes de alumno, vuelve a pulsar su casilla — antes de anular la entrega, te pedirá confirmarlo.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[260px] shadow-sm">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
              <X size={11} className="text-red-500" />
              <span className="text-[10px] font-semibold text-gray-700">Anular entrega</span>
            </div>
            <p className="px-3 py-2 text-[10px] text-gray-600">
              ¿Seguro que quieres anular la entrega de <strong>Matemáticas</strong> a <strong>García Pérez, Ana</strong>?
            </p>
            <div className="flex gap-2 px-3 pb-2.5">
              <span className="flex-1 text-center border border-gray-300 text-gray-600 text-[9px] font-medium py-1 rounded-md">Cancelar</span>
              <span className="flex-1 text-center bg-red-600 text-white text-[9px] font-medium py-1 rounded-md">Anular</span>
            </div>
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Tutorial: Devoluciones ───────────────────────────────────────────────────

function TutorialDevoluciones() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Selecciona la pestaña «Devoluciones»</p>
          <p className="text-sm text-gray-500 mb-3">Desde <strong className="text-gray-700">Gratuidad de Libros</strong>, pulsa la pestaña <strong className="text-gray-700">Devoluciones</strong>.</p>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "Préstamos", active: false },
              { label: "Devoluciones", active: true },
              { label: "Seguimiento", active: false },
            ].map(tab => (
              <span key={tab.label} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border ${tab.active ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-500 border-gray-200"}`}>
                {tab.label}
              </span>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Elige el modo y el grupo</p>
          <p className="text-sm text-gray-500 mb-3">El modo <strong className="text-gray-700">Por asignatura</strong> (predeterminado) es el más rápido: procesa un libro para toda la clase a la vez. Elige también el grupo.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="border border-blue-400 rounded-lg px-3 py-1.5 text-[11px] font-medium bg-blue-50/40 text-gray-700">
              Por asignatura <span className="text-gray-400">▼</span>
            </div>
            <div className="border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] font-medium bg-white text-gray-700">
              2º ESO A <span className="text-gray-400">▼</span>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 1 — Selecciona los libros que se devuelven</p>
          <p className="text-sm text-gray-500 mb-3">El panel izquierdo muestra los libros del grupo con préstamos activos. El número indica cuántos alumnos tienen ese libro. Pulsa los que se estén devolviendo ahora.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[250px]">
            <div className="px-3 py-2 border-b border-gray-100 flex justify-between">
              <span className="text-[10px] font-semibold text-gray-700">Libros del grupo</span>
              <div className="flex gap-2 text-[9px]">
                <span className="text-blue-600 font-medium cursor-pointer">Todos</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400 font-medium cursor-pointer">Ninguno</span>
              </div>
            </div>
            {[
              { titulo: "Lengua Castellana", asig: "Lengua", count: "21", checked: true },
              { titulo: "Matemáticas", asig: "Matemáticas", count: "19", checked: false },
              { titulo: "Geografía e Historia", asig: "Sociales", count: "23", checked: false },
            ].map(l => (
              <div key={l.titulo} className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 ${l.checked ? "bg-blue-50" : ""}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 ${l.checked ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                  {l.checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-800 truncate">{l.titulo}</p>
                  <p className="text-[9px] text-gray-400">{l.asig}</p>
                </div>
                <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Imprime la ficha de control si prefieres rellenar a mano las devoluciones (opcional)</p>
          <p className="text-sm text-gray-500 mb-3">Con al menos un libro seleccionado aparece el botón <strong className="text-gray-700">Imprimir Ficha Control</strong> bajo la lista. Al pulsarlo se abre una nueva pestaña lista para imprimir o guardar como PDF, con una hoja por libro y el listado de alumnos del grupo.</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 text-[11px] font-medium px-3 py-2 rounded-lg bg-white">
              <Printer size={13} /> Imprimir Ficha Control
            </span>
            <span className="text-[10px] text-gray-400">→ abre PDF en nueva pestaña</span>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 2 — Indica el estado de la devolución por alumno</p>
          <p className="text-sm text-gray-500 mb-3">Para cada alumno, pulsa el estado del libro: <strong className="text-green-700">Reutilizable</strong>, <strong className="text-amber-700">No reutilizable</strong> o <strong className="text-red-700">Perdido</strong>. Los botones globales de la cabecera aplican el mismo estado a todos a la vez.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[310px]">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1.5">
              <span className="text-[9px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg whitespace-nowrap">Todo reutilizable</span>
              <span className="text-[9px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg whitespace-nowrap">Todo no reutilizable</span>
              <span className="text-[9px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg whitespace-nowrap">Todo perdido</span>
            </div>
            {[
              { nombre: "García Pérez, Ana", estado: "Reutilizable", color: "bg-green-100 text-green-700 border-green-300" },
              { nombre: "Martínez López, Luis", estado: "No reutilizable", color: "bg-amber-100 text-amber-700 border-amber-300" },
              { nombre: "Sánchez Ruiz, Carmen", estado: null, color: "" },
            ].map(a => (
              <div key={a.nombre} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${a.estado ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {a.nombre[0]}{a.nombre.split(" ").at(-1)?.[0]}
                </div>
                <span className="text-[10px] text-gray-800 flex-1 min-w-0 truncate">{a.nombre}</span>
                {a.estado ? (
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-lg border flex-shrink-0 ${a.color}`}>{a.estado}</span>
                ) : (
                  <span className="text-[9px] text-gray-300 flex-shrink-0">— sin marcar</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={6} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Añade observaciones si hay incidencias (opcional)</p>
          <p className="text-sm text-gray-500 mb-3">Si hay libros deteriorados o perdidos, escribe una nota. Se adjuntará automáticamente a la incidencia generada.</p>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-[11px] text-gray-400 max-w-xs">
            Observaciones en caso de deterioros o extravíos (opcional) ...
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
          <p className="font-medium text-gray-900 text-sm mb-1">Pulsa «Finalizar devolución» y listo</p>
          <p className="text-sm text-gray-500 mb-3">El botón muestra cuántos alumnos tienen estado asignado del total pendiente. Los libros con estado <strong className="text-amber-700">No reutilizable</strong> o <strong className="text-red-700">Perdido</strong> generan una incidencia de gratuidad de forma automática.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-[11px] font-semibold">
              <RotateCcw size={12} /> Finalizar devolución (21/21)
            </span>
          </div>
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
            ✓ 21 devoluciones registradas.
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Tutorial: Revisiones ────────────────────────────────────────────────────

function TutorialRevisiones() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Selecciona la pestaña «Revisiones»</p>
          <p className="text-sm text-gray-500 mb-3">Desde <strong className="text-gray-700">Gratuidad de Libros</strong>, pulsa la pestaña <strong className="text-gray-700">Revisiones</strong>.</p>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "Préstamos", active: false },
              { label: "Devoluciones", active: false },
              { label: "Revisiones", active: true },
            ].map(tab => (
              <span key={tab.label} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border ${tab.active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200"}`}>
                {tab.label}
              </span>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Elige el modo y el grupo</p>
          <p className="text-sm text-gray-500 mb-3">El modo <strong className="text-gray-700">Por asignatura</strong> (predeterminado) es el más rápido: procesa un libro para toda la clase a la vez. Elige también el grupo a revisar.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="border border-indigo-400 rounded-lg px-3 py-1.5 text-[11px] font-medium bg-indigo-50/40 text-gray-700">
              Por asignatura <span className="text-gray-400">▼</span>
            </div>
            <div className="border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] font-medium bg-white text-gray-700">
              2º ESO A <span className="text-gray-400">▼</span>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 1 — Selecciona los libros a revisar</p>
          <p className="text-sm text-gray-500 mb-3">El panel izquierdo muestra los libros del grupo con préstamos activos. El número indica cuántos alumnos tienen ese libro. Pulsa los que vayas a revisar ahora.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[250px]">
            <div className="px-3 py-2 border-b border-gray-100 flex justify-between">
              <span className="text-[10px] font-semibold text-gray-700">Libros del grupo</span>
              <div className="flex gap-2 text-[9px]">
                <span className="text-indigo-600 font-medium">Todos</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400 font-medium">Ninguno</span>
              </div>
            </div>
            {[
              { titulo: "Lengua Castellana", asig: "Lengua", count: "21", checked: true },
              { titulo: "Matemáticas", asig: "Matemáticas", count: "19", checked: true },
              { titulo: "Geografía e Historia", asig: "Sociales", count: "23", checked: false },
            ].map(l => (
              <div key={l.titulo} className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 ${l.checked ? "bg-indigo-50" : ""}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 ${l.checked ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                  {l.checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-800 truncate">{l.titulo}</p>
                  <p className="text-[9px] text-gray-400">{l.asig}</p>
                </div>
                <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 2 — Indica el estado por alumno</p>
          <p className="text-sm text-gray-500 mb-3">Para cada alumno pulsa el estado del ejemplar: <strong className="text-green-700">Reutilizable</strong>, <strong className="text-amber-700">No reutilizable</strong> o <strong className="text-red-700">Perdido</strong>. Los botones de la cabecera aplican el mismo estado a todos a la vez.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[310px]">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1.5">
              <span className="text-[9px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg whitespace-nowrap">Todo reutilizable</span>
              <span className="text-[9px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg whitespace-nowrap">Todo no reutilizable</span>
              <span className="text-[9px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg whitespace-nowrap">Todo perdido</span>
            </div>
            {[
              { nombre: "García Pérez, Ana", estado: "Reutilizable", color: "bg-green-100 text-green-700 border-green-300" },
              { nombre: "Martínez López, Luis", estado: "No reutilizable", color: "bg-amber-100 text-amber-700 border-amber-300" },
              { nombre: "Sánchez Ruiz, Carmen", estado: null, color: "" },
            ].map(a => (
              <div key={a.nombre} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${a.estado ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                  {a.nombre[0]}{a.nombre.split(" ").at(-1)?.[0]}
                </div>
                <span className="text-[10px] text-gray-800 flex-1 min-w-0 truncate">{a.nombre}</span>
                {a.estado ? (
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-lg border flex-shrink-0 ${a.color}`}>{a.estado}</span>
                ) : (
                  <span className="text-[9px] text-gray-300 flex-shrink-0">— sin marcar</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Añade observaciones si hay deterioros o extravíos (opcional)</p>
          <p className="text-sm text-gray-500 mb-3">Si hay libros deteriorados o perdidos, escribe una nota. Se adjuntará automáticamente a la incidencia que se genere.</p>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-[11px] text-gray-400 max-w-xs">
            Observaciones en caso de deterioros o extravíos (opcional) …
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={6} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Pulsa «Guardar revisión» y confirma</p>
          <p className="text-sm text-gray-500 mb-3">El botón indica cuántos alumnos tienen estado asignado del total. Aparece un diálogo de confirmación; pulsa <strong className="text-gray-700">Confirmar</strong> para guardar.</p>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold">
              <ClipboardCheck size={12} /> Guardar revisión (19/21)
            </span>
            <div className="bg-white border border-gray-200 rounded-xl p-3 max-w-[220px] shadow-sm">
              <p className="text-[11px] font-semibold text-gray-900 mb-1.5">Confirmar revisión</p>
              <p className="text-[10px] text-gray-500 mb-3">¿Guardar la revisión de <strong className="text-gray-700">19 alumnos</strong> (2 libros)?</p>
              <div className="flex gap-2">
                <span className="flex-1 text-center border border-gray-200 text-[10px] text-gray-500 py-1.5 rounded-lg">Cancelar</span>
                <span className="flex-1 text-center bg-indigo-600 text-[10px] text-white font-semibold py-1.5 rounded-lg">Confirmar</span>
              </div>
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
          <p className="font-medium text-gray-900 text-sm mb-1">¡Listo! Revisión guardada</p>
          <p className="text-sm text-gray-500 mb-3">Los libros aparecen con el badge <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">Revisado</span> y pueden volver a revisarse en cualquier momento. Los libros marcados como <strong className="text-amber-700">No reutilizable</strong> o <strong className="text-red-700">Perdido</strong> generan una incidencia de gratuidad automáticamente.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
            ✓ 38 revisiones guardadas.
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

// ─── Tutorial: Nueva incidencia — TIC ─────────────────────────────────────────

function TutorialTic() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Accede a «Nueva incidencia»</p>
          <p className="text-sm text-gray-500 mb-3">En el menú lateral, dentro de «Peticiones», pulsa <strong className="text-gray-700">Nueva incidencia</strong>.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs space-y-1 max-w-[210px]">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Peticiones</div>
            <div className="flex items-center gap-2 text-blue-700 font-semibold bg-blue-50 py-1 px-2 rounded border border-blue-200"><PlusCircle size={12} /> Nueva incidencia</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><Monitor size={12} /> Peticiones TIC</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><Wrench size={12} /> Peticiones Mantenimiento</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Elige «Un equipo o programa»</p>
          <p className="text-sm text-gray-500 mb-3">No hace falta saber si es «TIC» o «Mantenimiento» — solo describe el tipo de problema con tus propias palabras.</p>
          <div className="grid grid-cols-2 gap-2 max-w-[260px]">
            <div className="border-2 border-blue-400 bg-blue-50 rounded-xl p-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-1.5"><Monitor size={14} className="text-blue-600" /></div>
              <p className="text-[10px] font-semibold text-gray-900">Un equipo o programa</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Ordenador, red, aplicación...</p>
            </div>
            <div className="border-2 border-gray-200 rounded-xl p-2.5 opacity-60">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-1.5"><Wrench size={14} className="text-red-500" /></div>
              <p className="text-[10px] font-semibold text-gray-900">Instalaciones o mobiliario</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Aulas, puertas, limpieza...</p>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Indica a quién afecta</p>
          <p className="text-sm text-gray-500 mb-3">Elige si el problema solo te afecta a ti o puede afectar a más personas del centro.</p>
          <div className="space-y-1.5 max-w-[230px]">
            <div className="flex items-center gap-2 border-2 border-blue-400 bg-blue-50 rounded-lg px-2.5 py-2">
              <User size={13} className="text-blue-600" />
              <span className="text-[10px] font-medium text-gray-800">Solo me afecta a mí</span>
            </div>
            <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-2.5 py-2 opacity-60">
              <Users size={13} className="text-gray-500" />
              <span className="text-[10px] font-medium text-gray-800">Puede afectar a más usuarios</span>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Describe el problema</p>
          <p className="text-sm text-gray-500 mb-3">Escribe un título breve, una descripción y la prioridad. La foto es opcional — en el móvil puedes hacerla en el momento.</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 max-w-[230px] space-y-2">
            <div>
              <label className="text-[9px] text-gray-500 block mb-0.5">Título</label>
              <div className="border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700">No enciende el proyector</div>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 block mb-0.5">Prioridad</label>
              <div className="border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700">Normal</div>
            </div>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-500">
              <Camera size={11} className="text-gray-400" /> Hacer foto o elegir imagen
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Pulsa «Crear Petición»</p>
          <p className="text-sm text-gray-500 mb-3">Tu petición queda registrada al instante y aparece en el tablero de Peticiones TIC.</p>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500">Atrás</span>
            <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-[11px] text-white font-semibold">Crear Petición</span>
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
          <p className="font-medium text-gray-900 text-sm mb-1">¡Listo! Petición registrada</p>
          <p className="text-sm text-gray-500 mb-3">El equipo TIC verá tu petición en su tablero. Puedes hacer seguimiento, y borrarla tú mismo si te has equivocado, desde <strong className="text-gray-700">Peticiones TIC</strong>.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
            ✓ Petición TIC-042 creada correctamente.
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Tutorial: Nueva incidencia — Mantenimiento ───────────────────────────────

function TutorialMantenimiento() {
  return (
    <ol className="divide-y divide-gray-50">
      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={1} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Accede a «Nueva incidencia»</p>
          <p className="text-sm text-gray-500 mb-3">En el menú lateral, dentro de «Peticiones», pulsa <strong className="text-gray-700">Nueva incidencia</strong>.</p>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs space-y-1 max-w-[210px]">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Peticiones</div>
            <div className="flex items-center gap-2 text-blue-700 font-semibold bg-blue-50 py-1 px-2 rounded border border-blue-200"><PlusCircle size={12} /> Nueva incidencia</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><Monitor size={12} /> Peticiones TIC</div>
            <div className="flex items-center gap-2 text-gray-400 py-1 px-2"><Wrench size={12} /> Peticiones Mantenimiento</div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={2} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Elige «Las instalaciones o el mobiliario»</p>
          <p className="text-sm text-gray-500 mb-3">No hace falta saber si es «TIC» o «Mantenimiento» — solo describe el tipo de problema con tus propias palabras.</p>
          <div className="grid grid-cols-2 gap-2 max-w-[260px]">
            <div className="border-2 border-gray-200 rounded-xl p-2.5 opacity-60">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-1.5"><Monitor size={14} className="text-blue-600" /></div>
              <p className="text-[10px] font-semibold text-gray-900">Un equipo o programa</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Ordenador, red, aplicación...</p>
            </div>
            <div className="border-2 border-red-400 bg-red-50 rounded-xl p-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-1.5"><Wrench size={14} className="text-red-500" /></div>
              <p className="text-[10px] font-semibold text-gray-900">Instalaciones o mobiliario</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Aulas, puertas, limpieza...</p>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={3} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Describe el problema y la ubicación</p>
          <p className="text-sm text-gray-500 mb-3">Indica el título, dónde está (aula, planta, zona...), la descripción y la prioridad. La foto es opcional.</p>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 max-w-[230px] space-y-2">
            <div>
              <label className="text-[9px] text-gray-500 block mb-0.5">Título</label>
              <div className="border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700">Persiana rota</div>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 block mb-0.5">Ubicación</label>
              <div className="border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700">Aula 2º ESO B</div>
            </div>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-500">
              <Camera size={11} className="text-gray-400" /> Hacer foto o elegir imagen
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={4} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Pulsa «Crear Petición»</p>
          <p className="text-sm text-gray-500 mb-3">Tu petición queda registrada al instante y aparece en el tablero de Peticiones Mantenimiento.</p>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500">Cancelar</span>
            <span className="px-3 py-1.5 rounded-lg bg-red-500 text-[11px] text-white font-semibold">Crear Petición</span>
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
          <p className="font-medium text-gray-900 text-sm mb-1">¡Listo! Petición registrada</p>
          <p className="text-sm text-gray-500 mb-3">El equipo de mantenimiento la verá en su tablero. Si eres tú quien la creó (o eres Admin), puedes editarla o borrarla desde <strong className="text-gray-700">Peticiones Mantenimiento</strong>.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
            ✓ Petición MNT-018 creada correctamente.
          </div>
        </div>
      </li>
    </ol>
  );
}

// ─── Content & tips map ───────────────────────────────────────────────────────

const ITEM_CONTENT: Record<ItemId, React.ReactNode> = {
  carros: <TutorialCarros />,
  citas: <TutorialCitas />,
  familias: <TutorialFamilias />,
  ordenanza: <TutorialOrdenanza />,
  prestamos: <TutorialPrestamos />,
  devoluciones: <TutorialDevoluciones />,
  revisiones: <TutorialRevisiones />,
  tic: <TutorialTic />,
  mantenimiento: <TutorialMantenimiento />,
  movil: <ProtocoloMovil />,
};

const ITEM_TIPS: Record<ItemId, React.ReactNode> = {
  prestamos: (
    <p className="text-xs text-amber-800">
      <strong>¿Varios libros para el mismo grupo?</strong> Repite el paso 1 con cada libro: elige uno, marca a quien lo recibe, y pasa al siguiente. Junto a cada alumno tienes un icono de lista para ver todos los libros que ya le has entregado, además de las casillas <strong>Nuevo</strong>/<strong>Deteriorado</strong> por si quieres dejar constancia del estado del ejemplar.
    </p>
  ),
  devoluciones: (
    <p className="text-xs text-amber-800">
      <strong>¿Devolución por alumno?</strong> Cambia el selector a <strong>Por alumno</strong> si prefieres procesar un alumno a la vez: elige el alumno en el panel izquierdo e indica el estado de cada libro en el derecho. Útil cuando un alumno entrega varios libros de distintas asignaturas al mismo tiempo.
    </p>
  ),
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
  familias: (
    <p className="text-xs text-amber-800">
      <strong>¿La familia quiere cancelar una solicitud aún pendiente?</strong> Hasta que confirmes la cita no recibe el enlace de cancelación, así que tendrá que avisarte a ti o al centro. El enlace deja de funcionar cuando la cita ya está completada o cancelada.
    </p>
  ),
  ordenanza: (
    <p className="text-xs text-amber-800">
      <strong>¿Una familia no aparece en la lista?</strong> Solo se muestran las citas confirmadas para hoy. Si la cita está pendiente de confirmar, se ha cancelado o es de otro día, no aparecerá: consulta con el profesor/a correspondiente.
    </p>
  ),
  revisiones: (
    <p className="text-xs text-amber-800">
      <strong>¿Ver o anular una revisión ya guardada?</strong> Activa el toggle <strong>Ver revisados</strong> en la barra superior para consultar el estado de los libros ya revisados y, si es necesario, anular la revisión con el botón de deshacer (↩).
    </p>
  ),
  tic: (
    <p className="text-xs text-amber-800">
      <strong>¿Ya sabes si es TIC o Mantenimiento?</strong> Puedes saltarte la pantalla de elección: desde el tablero de <strong>Peticiones TIC</strong> también hay un botón «Nueva Petición» que te lleva por el mismo camino.
    </p>
  ),
  mantenimiento: (
    <p className="text-xs text-amber-800">
      <strong>¿Te equivocaste al crearla?</strong> Si eres el autor de la petición (o eres Admin), puedes eliminarla pulsando el icono de papelera en su tarjeta del tablero, con confirmación.
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

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({ module, onClick }: { module: ModuleMeta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 text-left hover:border-gray-200 hover:shadow-sm transition-all group w-full"
    >
      <div className={`w-11 h-11 rounded-xl ${module.color} flex items-center justify-center flex-shrink-0`}>
        {module.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{module.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{module.description}</p>
        <p className="text-[11px] text-gray-400 mt-1">
          {module.tutorials.length} tutorial{module.tutorials.length !== 1 ? "es" : ""}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  inactiveModuleSlugs: string[];
  roleNames: string[];
}

export function AyudaClient({ inactiveModuleSlugs, roleNames }: Props) {
  const [activeModule, setActiveModule] = useState<ModuleId | null>(null);
  const [activeItem, setActiveItem]     = useState<ItemId | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!activeItemMeta || !contentRef.current) return;
    const category = activeItemMeta.category === "protocolo" ? "Protocolo" : "Tutorial";
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${activeItemMeta.title}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @page { size: A4 portrait; margin: 14mm 16mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body class="bg-white">
  <div class="mb-5 pb-4 border-b border-gray-200">
    <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">${category} · IES Julio Verne</p>
    <h1 class="text-xl font-bold text-gray-900">${activeItemMeta.title}</h1>
    <p class="text-sm text-gray-400 mt-0.5">${activeItemMeta.badge}</p>
  </div>
  <div>${contentRef.current.innerHTML}</div>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 600); });<\/script>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // Same rule as the sidebar: Ordenanza users (not Admin/Directiva) only get their role-specific help
  const isOrdenanza = roleNames.includes("Ordenanza") && !roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  const visibleModules  = MODULES.filter((m) => {
    if (isOrdenanza) return m.roles?.includes("Ordenanza") ?? false;
    if (m.roles) return m.roles.some((r) => roleNames.includes(r));
    const slugs = Array.isArray(m.slug) ? m.slug : m.slug ? [m.slug] : [];
    return slugs.some((s) => !inactiveModuleSlugs.includes(s));
  });
  const protocolos      = ITEMS.filter((i) => i.category === "protocolo");
  const activeItemMeta  = activeItem   ? ITEMS.find((t) => t.id === activeItem)!    : null;
  const activeModuleMeta = activeModule ? MODULES.find((m) => m.id === activeModule)! : null;

  // Multi-step navigation ─────────────────────────────────────────────────────

  function handleModuleClick(mod: ModuleMeta) {
    setActiveModule(mod.id);
    // Single-tutorial module → skip intermediate list, go straight to detail
    if (mod.tutorials.length === 1) setActiveItem(mod.tutorials[0]);
    else setActiveItem(null);
  }

  function handleBack() {
    if (activeItem !== null) {
      if (!activeModuleMeta || activeModuleMeta.tutorials.length === 1) {
        // Protocol item OR single-tutorial module → back to home
        setActiveModule(null);
        setActiveItem(null);
      } else {
        // Multi-tutorial module → back to module list
        setActiveItem(null);
      }
    } else {
      // Module list → back to home
      setActiveModule(null);
    }
  }

  const showHome       = !activeModule && !activeItem;
  const showModuleList = activeModule !== null && activeItem === null;
  const showDetail     = activeItem !== null;

  const backLabel = showDetail && activeModuleMeta && activeModuleMeta.tutorials.length > 1
    ? activeModuleMeta.title
    : "Ayuda y Tutoriales";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        {!showHome ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> {backLabel}
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

      {/* ── Home view ─────────────────────────────────────────────────────── */}
      {showHome && (
        <>
          {/* Web del Claustro + Códigos Ausencias — teaching staff only */}
          {!isOrdenanza && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://sites.google.com/iesjulioverne.es/webclaustro/inicio?authuser=0"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Web de ayuda del Claustro</p>
                  <p className="text-xs text-gray-500 mt-0.5">Documentación y recursos del claustro de IES Julio Verne</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
              </a>

              <a
                href="/documentos/codigos-ausencias.pdf"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-pink-500 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Códigos Ausencias</p>
                  <p className="text-xs text-gray-500 mt-0.5">Motivos y códigos para la solicitud de permisos y licencias</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
              </a>
            </div>
          )}

          <div className="space-y-5">
            {/* Module tutorial buttons — filtered by active modules */}
            {visibleModules.length > 0 && (
              <section>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Tutoriales</p>
                <div className="grid gap-2">
                  {visibleModules.map((mod) => (
                    <ModuleCard key={mod.id} module={mod} onClick={() => handleModuleClick(mod)} />
                  ))}
                </div>
              </section>
            )}

            {/* Protocols — hidden for Ordenanza */}
            {!isOrdenanza && (
              <section>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Protocolos</p>
                <div className="grid gap-2">
                  {protocolos.map((item) => (
                    <ItemCard key={item.id} item={item} onSelect={(id) => { setActiveModule(null); setActiveItem(id); }} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {/* ── Module list view (multi-tutorial modules) ─────────────────────── */}
      {showModuleList && activeModuleMeta && (
        <div className="space-y-3">
          <div className={`${activeModuleMeta.color} rounded-xl px-5 py-4 flex items-center gap-4`}>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {activeModuleMeta.icon}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-0.5">Tutoriales</p>
              <h2 className="text-white font-bold text-base">{activeModuleMeta.title}</h2>
            </div>
          </div>
          <div className="grid gap-2">
            {activeModuleMeta.tutorials.map((itemId) => {
              const item = ITEMS.find((i) => i.id === itemId)!;
              return <ItemCard key={itemId} item={item} onSelect={(id) => setActiveItem(id)} />;
            })}
          </div>
        </div>
      )}

      {/* ── Detail view ───────────────────────────────────────────────────── */}
      {showDetail && activeItemMeta && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className={`${activeItemMeta.headerBg} px-6 py-5 flex items-center gap-4`}>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {activeItemMeta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-0.5">
                {activeItemMeta.category === "protocolo" ? "Protocolo" : "Tutorial"}
              </p>
              <h2 className="text-white font-semibold text-base leading-snug">{activeItemMeta.title}</h2>
              <p className="text-white/60 text-xs mt-0.5">{activeItemMeta.badge}</p>
            </div>
            <button
              onClick={handlePrint}
              title="Descargar / imprimir PDF"
              className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Printer size={14} />
              PDF
            </button>
          </div>

          <div ref={contentRef}>
            {ITEM_CONTENT[activeItem!]}
          </div>

          <div className="bg-amber-50 border-t border-amber-100 px-6 py-4 flex gap-3 items-start">
            <span className="text-amber-500 text-base flex-shrink-0">💡</span>
            {ITEM_TIPS[activeItem!]}
          </div>
        </div>
      )}

    </div>
  );
}
