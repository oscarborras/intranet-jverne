import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadIncidenciaFoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ foto_path: string; foto_nombre: string } | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("incidencias").upload(storagePath, file);
  if (error) return null;
  return { foto_path: storagePath, foto_nombre: file.name };
}
