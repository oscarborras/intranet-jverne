// Data Access Layer: single place to verify the session and the user's profiles.
// The proxy only does an optimistic redirect; every page, Server Action and
// Route Handler must go through these helpers before touching data.
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/types";

export interface AuthContext {
  user: User;
  roles: Perfil[];
  roleNames: string[];
}

/** Student Google accounts are not allowed into the intranet. */
function isStudentAccount(user: User): boolean {
  return user.email?.includes(".alu@") ?? false;
}

/**
 * Verified user for the current request (getUser() validates the JWT against Supabase).
 * Memoized per request, so the layout and the page share a single Auth call.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Profiles of a user, memoized per request. */
export const getUserRoles = cache(async (userId: string): Promise<Perfil[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(id, nombre, descripcion, created_at)")
    .eq("user_id", userId);
  return (data ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil | null)
    .filter((p): p is Perfil => Boolean(p));
});

// ─── Server Components ───────────────────────────────────────────────────────

/** Returns the verified user or redirects to /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isStudentAccount(user)) redirect("/acceso-denegado");
  return user;
}

/** Verified user plus their profiles, or redirect to /login. */
export async function requireAuth(): Promise<AuthContext> {
  const user = await requireUser();
  const roles = await getUserRoles(user.id);
  return { user, roles, roleNames: roles.map((r) => r.nombre) };
}

/** Like requireAuth(), but also redirects to `fallback` if the user has none of `allowed`. */
export async function requireRole(allowed: string[], fallback = "/dashboard"): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.roleNames.some((r) => allowed.includes(r))) redirect(fallback);
  return ctx;
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

export type ApiAuthResult = ({ ok: true } & AuthContext) | { ok: false; response: NextResponse };

/**
 * Route Handler variant: never redirects, answers with JSON 401/403 instead.
 * Usage: `const auth = await authorizeApi(["Admin"]); if (!auth.ok) return auth.response;`
 */
export async function authorizeApi(allowed?: string[]): Promise<ApiAuthResult> {
  const user = await getCurrentUser();
  if (!user || isStudentAccount(user)) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  const roles = await getUserRoles(user.id);
  const roleNames = roles.map((r) => r.nombre);
  if (allowed && !roleNames.some((r) => allowed.includes(r))) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true, user, roles, roleNames };
}
