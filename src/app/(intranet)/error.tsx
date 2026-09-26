"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LogIn } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function IntranetError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-red-600 px-5 py-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-white" />
        <h1 className="text-white font-semibold text-sm">Se ha producido un error</h1>
      </div>
      <div className="px-5 py-6 space-y-5">
        <p className="text-sm text-gray-600">
          No se ha podido cargar esta página. Vuelve a intentarlo y, si el problema continúa, puede que tu sesión
          haya caducado: inicia sesión de nuevo.
        </p>
        {error.digest && <p className="text-xs text-gray-400">Código de error: {error.digest}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <RotateCcw size={16} /> Reintentar
          </button>
          <Link
            href="/login"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <LogIn size={16} /> Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
