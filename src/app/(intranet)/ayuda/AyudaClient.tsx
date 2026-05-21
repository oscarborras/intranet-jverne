"use client";

import { useState } from "react";
import {
  HelpCircle, Laptop, Users, CalendarDays, Plus, BookOpen,
  CheckCircle2, MapPin, ChevronRight, ArrowLeft, Clock,
  Mail, X, CalendarCheck, Smartphone, ShieldAlert,
  BookMarked, FileText, GraduationCap, ExternalLink, RotateCcw, Printer,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemId = "carros" | "citas" | "movil" | "prestamos" | "devoluciones";
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
    id: "prestamos",
    category: "tutorial",
    icon: <BookMarked size={22} className="text-white" />,
    title: "Registrar préstamos de libros",
    description: "Entrega el lote de libros a un grupo completo o a alumnos individuales.",
    badge: "6 pasos · 2 min",
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
          <p className="font-medium text-gray-900 text-sm mb-1">Elige el grupo en el selector</p>
          <p className="text-sm text-gray-500 mb-3">Despliega el selector y elige la clase. Aparecerá un contador con el número de alumnos.</p>
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
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 1 — Marca los libros a entregar</p>
          <p className="text-sm text-gray-500 mb-3">El panel izquierdo muestra el lote del nivel. Marca los libros que repartirás hoy. El número <strong className="text-gray-700">disponibles/total</strong> aparece junto a cada título.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[240px]">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-700">Lote del curso · 2º ESO</span>
              <span className="text-[9px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">3 libros</span>
            </div>
            {[
              { titulo: "Lengua Castellana", stock: "24/25", checked: true, sinStock: false },
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
              <p className="text-[9px] text-gray-400">Disponibles / Total. Sin stock no se asignan.</p>
            </div>
          </div>
        </div>
      </li>

      <li className="px-6 py-5 flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <StepNum n={5} accent="blue" /><StepConnector />
        </div>
        <div className="flex-1 pb-1">
          <p className="font-medium text-gray-900 text-sm mb-1">Paso 2 — Selecciona los alumnos receptores</p>
          <p className="text-sm text-gray-500 mb-3">En el panel derecho, marca los alumnos. Usa <strong className="text-gray-700">Seleccionar todo</strong> para marcar toda la clase de golpe. Los que ya tienen el lote completo aparecen como <span className="text-green-700 font-medium">Entregado</span>.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[270px]">
            <div className="px-3 py-2 border-b border-gray-100 flex justify-between">
              <span className="text-[10px] font-semibold text-gray-700">Alumnado del grupo</span>
              <span className="text-[9px] text-gray-400 font-semibold uppercase">3/24 entregados</span>
            </div>
            {[
              { nombre: "García Pérez, Ana", estado: "Entregado", estColor: "text-green-700 bg-green-100", checked: false },
              { nombre: "Martínez López, Luis", estado: "1/3", estColor: "text-amber-700 bg-amber-100", checked: true },
              { nombre: "Sánchez Ruiz, Carmen", estado: "0/3", estColor: "text-gray-400", checked: true },
            ].map(a => (
              <div key={a.nombre} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0 ${a.checked ? "bg-blue-50" : ""}`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 ${a.checked ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                  {a.checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </div>
                <span className="text-[10px] text-gray-800 flex-1 min-w-0 truncate">{a.nombre}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${a.estColor}`}>{a.estado}</span>
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
          <p className="font-medium text-gray-900 text-sm mb-1">Pulsa «Entregar lote» y listo</p>
          <p className="text-sm text-gray-500 mb-3">El botón indica cuántos registros nuevos se crearán (alumnos × libros pendientes). Pulsa para confirmar; los alumnos pasarán a <span className="text-green-700 font-medium">Entregado</span>.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-semibold">
              <CheckCircle2 size={12} /> Entregar lote (46)
            </span>
            <span className="text-xs text-gray-400">→ se crean 46 préstamos</span>
          </div>
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
            ✓ 46 préstamos registrados correctamente.
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
  prestamos: <TutorialPrestamos />,
  devoluciones: <TutorialDevoluciones />,
  movil: <ProtocoloMovil />,
};

const ITEM_TIPS: Record<ItemId, React.ReactNode> = {
  prestamos: (
    <p className="text-xs text-amber-800">
      <strong>¿Entrega parcial?</strong> Si un alumno recibió solo algunos libros del lote, su contador aparece como <strong>2/3</strong>. Usa el botón <strong>Completar</strong> junto a su nombre para marcarlo manualmente como lote completo cuando reciba el resto.
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

      {/* Web del Claustro */}
      {!active && (
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
      )}

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
