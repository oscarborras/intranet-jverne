"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function VerFotoButton({ path, nombre }: { path: string; nombre?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleView() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.storage.from("incidencias").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    setLoading(false);
  }

  return (
    <button
      onClick={handleView}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
      {nombre ?? "Ver foto"}
    </button>
  );
}
