import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveAutorNames(
  supabase: SupabaseClient,
  autorIds: string[]
): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(autorIds)];
  if (uniqueIds.length === 0) return {};

  const [{ data: userRows }, { data: profesoresRows }] = await Promise.all([
    supabase.from("users_view").select("id, email, full_name").in("id", uniqueIds),
    supabase.from("profesores").select("email, profesor"),
  ]);

  const profesorByEmail = new Map(
    (profesoresRows ?? [])
      .filter((p) => p.email)
      .map((p) => [(p.email as string).toLowerCase(), p.profesor as string])
  );

  return Object.fromEntries(
    (userRows ?? []).map((u) => {
      const email = (u.email as string | null)?.toLowerCase();
      const nombre = email ? profesorByEmail.get(email) : undefined;
      return [u.id as string, nombre ?? (u.full_name as string | null) ?? (u.email as string | null) ?? "—"];
    })
  );
}
