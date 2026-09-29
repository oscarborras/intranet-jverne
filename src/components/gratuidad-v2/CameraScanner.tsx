"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2, X } from "lucide-react";
import { normalizarCodigo } from "./useBarcodeScanner";

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

interface NativeDetectorCtor {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
}

const FORMATS = ["code_128"];
const INTERVALO_MS = 200;

/**
 * Native BarcodeDetector (Chrome on Android) or, where missing (iOS, Firefox,
 * desktop Safari), the zxing-wasm ponyfill, loaded on demand.
 */
async function crearDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (Native) {
    try {
      const soportados = await Native.getSupportedFormats();
      if (FORMATS.every((f) => soportados.includes(f))) return new Native({ formats: FORMATS });
    } catch {
      // fall back to the ponyfill
    }
  }
  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
  return new BarcodeDetector({ formats: ["code_128"] }) as unknown as Detector;
}

interface Props {
  onScan: (codigo: string) => void;
  onClose: () => void;
}

/** Live camera preview that reports every Code128 barcode it sees. */
export function CameraScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  const [estado, setEstado] = useState<"cargando" | "activo" | "error">("cargando");
  const [error, setError] = useState("");
  const [destello, setDestello] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelado = false;

    async function iniciar() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("La cámara solo funciona con conexión segura (https).");
        setEstado("error");
        return;
      }
      try {
        const [detector, s] = await Promise.all([
          crearDetector(),
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          }),
        ]);
        if (cancelado) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play();
        setEstado("activo");

        const tick = async () => {
          if (cancelado) return;
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const raw = codes.find((c) => c.rawValue)?.rawValue;
              if (raw) {
                onScanRef.current(normalizarCodigo(raw));
                setDestello(true);
                setTimeout(() => setDestello(false), 250);
              }
            } catch {
              // transient decode errors: keep trying
            }
          }
          timer = setTimeout(tick, INTERVALO_MS);
        };
        tick();
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError" ? "Permiso de cámara denegado. Actívalo en los ajustes del navegador."
            : name === "NotFoundError" ? "No se ha encontrado ninguna cámara."
              : "No se pudo iniciar la cámara.",
        );
        setEstado("error");
      }
    }

    iniciar();
    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] sm:aspect-video max-h-[45vh] w-full">
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover" aria-label="Vista de la cámara" />
      {/* Aiming guide */}
      {estado === "activo" && (
        <div
          aria-hidden="true"
          className={`absolute inset-x-[12%] top-1/2 -translate-y-1/2 h-[30%] border-4 rounded-lg transition-colors ${destello ? "border-emerald-400" : "border-white/70"}`}
        />
      )}
      {estado === "cargando" && (
        <div className="absolute inset-0 flex items-center justify-center text-white gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Iniciando cámara…
        </div>
      )}
      {estado === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 text-sm p-6 text-center">
          <CameraOff size={28} /> {error}
        </div>
      )}
      <button
        onClick={onClose}
        aria-label="Cerrar cámara"
        className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <X size={20} />
      </button>
      {estado === "activo" && (
        <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/90">Centra el código de barras en el recuadro</p>
      )}
    </div>
  );
}
