import { HelpCircle } from "lucide-react";

export default function AyudaPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <HelpCircle size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ayuda y Tutoriales</h1>
          <p className="text-sm text-gray-500">Guías de uso de la intranet</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
        Próximamente disponible
      </div>
    </div>
  );
}
