// External maintenance technicians: they sign in with Google like everyone else, but the
// OAuth callback drops their Supabase session and issues this app-signed, httpOnly cookie
// instead. Their browser never holds a Supabase token, so they cannot query the database
// directly; the portal routes read/write with the service role, only on maintenance data.
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const EXTERNO_COOKIE = "jv_externo";
export const EXTERNO_HOME = "/externo/mantenimiento";
/** Turns a leftover Supabase session of a listed technician into a portal session */
export const EXTERNO_ENTRAR = "/externo/entrar";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // one working day
export const CONFIG_CLAVE_TECNICOS_EXTERNOS = "tecnicos_externos_mantenimiento";

export interface ExternoSession {
  /** Supabase auth user id */
  uid: string;
  email: string;
  nombre: string;
  /** Expiry, seconds since epoch */
  exp: number;
}

// Signing key derived from the service-role secret (server-only), so no extra env var is needed
function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createHmac("sha256", secret).update("jv-externo-session-v1").digest();
}

function sign(data: string): string {
  return createHmac("sha256", signingKey()).update(data).digest("base64url");
}

function encodeSession(session: ExternoSession): string {
  const data = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${data}.${sign(data)}`;
}

function decodeSession(token: string | undefined): ExternoSession | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(data, "base64url").toString()) as ExternoSession;
    if (typeof session.exp !== "number" || session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

/** Emails listed in Configuración (comma, semicolon or newline separated), lowercased. Memoized per request. */
export const getTecnicosExternos = cache(async (): Promise<Set<string>> => {
  const { data } = await createAdminClient()
    .from("config_intranet")
    .select("valor")
    .eq("clave", CONFIG_CLAVE_TECNICOS_EXTERNOS)
    .maybeSingle();
  return new Set(
    ((data?.valor as string | undefined) ?? "")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
});

export async function isTecnicoExterno(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return (await getTecnicosExternos()).has(email.toLowerCase());
}

/** Cookie to set after a successful Google sign-in of an external technician. */
export function buildExternoSessionCookie(user: { uid: string; email: string; nombre: string }) {
  const session: ExternoSession = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  return {
    name: EXTERNO_COOKIE,
    value: encodeSession(session),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

/**
 * Replaces the technician's Supabase session with the portal cookie: removes the profiles the
 * signup trigger gave the account, signs out of Supabase (its cookies are cleared through
 * `supabase`) and sets the portal cookie. Must run in a Route Handler.
 */
export async function iniciarSesionExterna(supabase: SupabaseClient, user: User & { email: string }): Promise<void> {
  await createAdminClient().from("user_roles_intranet").delete().eq("user_id", user.id);
  await supabase.auth.signOut();
  const cookie = buildExternoSessionCookie({
    uid: user.id,
    email: user.email,
    nombre: (user.user_metadata?.full_name as string | undefined) || user.email.split("@")[0],
  });
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
}

/** Valid session whose email is still listed in Configuración (removing it revokes access at once). */
async function currentSession(): Promise<ExternoSession | null> {
  const session = decodeSession((await cookies()).get(EXTERNO_COOKIE)?.value);
  if (!session || !(await isTecnicoExterno(session.email))) return null;
  return session;
}

export async function hasExternoSession(): Promise<boolean> {
  return (await currentSession()) !== null;
}

/**
 * Portal pages: the external technician's session. Without one, go through the entry route,
 * which converts a leftover Supabase session or ends at /login.
 */
export async function requireExterno(): Promise<ExternoSession> {
  const session = await currentSession();
  if (!session) redirect(EXTERNO_ENTRAR);
  return session;
}

export type ExternoApiResult = { ok: true; session: ExternoSession } | { ok: false; response: NextResponse };

/** Portal route handlers: JSON 401 instead of a redirect. */
export async function authorizeExternoApi(): Promise<ExternoApiResult> {
  const session = await currentSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Sesión caducada. Vuelva a iniciar sesión." }, { status: 401 }) };
  }
  return { ok: true, session };
}
