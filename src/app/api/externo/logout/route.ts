import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { EXTERNO_COOKIE } from "@/lib/externo";

// External portal: sign out by deleting the portal cookie
export async function POST(_req: NextRequest) {
  // Public origin behind the reverse proxy (see .agents/rules/programacion.md)
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";

  const response = NextResponse.redirect(`${proto}://${host}/login`, { status: 303 });
  response.cookies.set(EXTERNO_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  return response;
}
