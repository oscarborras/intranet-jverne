"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldOff } from "lucide-react";

export default function AccesoDenegadoPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.jpg"
              alt="IES Julio Verne"
              width={120}
              height={120}
              className="rounded-full shadow-xl border-4 border-white/30"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Intranet IES Julio Verne</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <ShieldOff className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Acceso no autorizado</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu cuenta no tiene permiso para acceder a esta aplicación. Si crees que es un error, contacta con la administración del centro.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-xl transition-colors"
          >
            Volver al inicio
          </button>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          IES Julio Verne © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
