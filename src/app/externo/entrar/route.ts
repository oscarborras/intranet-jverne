import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { EXTERNO_HOME, hasExternoSession, iniciarSesionExterna, isTecnicoExterno } from "@/lib/externo";

// Entry point to the external portal when there is no portal cookie yet. Ends in exactly one of:
// the portal (valid portal session, or a listed technician's Supabase session converted into one),
// the intranet (a normal account) or /login. It never sends back to the portal without a valid
// cookie, so it cannot loop.
export async function GET() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  if (await hasExternoSession()) {
    return NextResponse.redirect(`${origin}${EXTERNO_HOME}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email && (await isTecnicoExterno(user.email))) {
    await iniciarSesionExterna(supabase, { ...user, email: user.email });
    return NextResponse.redirect(`${origin}${EXTERNO_HOME}`);
  }

  return NextResponse.redirect(`${origin}${user ? "/dashboard" : "/login"}`);
}
