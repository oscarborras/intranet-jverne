"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";

// The horarios web is only reachable from the school network (it resolves to a private IP).
// An iframe gives no error event when it cannot load, so the browser probes the URL first:
// a no-cors fetch resolves (opaque) when the server answers and rejects on network errors.
const PROBE_TIMEOUT_MS = 6000;

type Estado = "comprobando" | "disponible" | "inaccesible";

export function HorariosFrame({ url }: { url: string }) {
  const [estado, setEstado] = useState<Estado>("comprobando");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal })
      .then(() => { if (!cancelled) setEstado("disponible"); })
      .catch(() => { if (!cancelled) setEstado("inaccesible"); })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url, intento]);

  const reintentar = () => {
    setEstado("comprobando");
    setIntento((n) => n + 1);
  };

  if (estado === "disponible") {
    return (
      <iframe
        src={url}
        title="Horarios del centro"
        className="flex-1 w-full rounded-xl border border-gray-200 bg-white"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (estado === "comprobando") {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-500" role="status">
        <Loader2 size={18} className="animate-spin" />
        Cargando la web de horarios…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <WifiOff size={28} className="text-amber-600" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Web de horarios no disponible</h2>
        <p className="text-sm text-gray-600">
          El acceso a la web de horarios solo está disponible desde el instituto, conectado a la red{" "}
          <strong>Julioverne</strong>.
        </p>
        <p className="text-sm text-gray-500">
          Si ya estás en el instituto, comprueba que tu dispositivo está conectado a esa red y vuelve a intentarlo.
        </p>
      </div>
      <button
        type="button"
        onClick={reintentar}
        className="flex items-center gap-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <RefreshCw size={16} />
        Reintentar
      </button>
    </div>
  );
}
