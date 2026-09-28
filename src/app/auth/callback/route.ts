import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { EXTERNO_HOME, iniciarSesionExterna, isTecnicoExterno } from "@/lib/externo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Construir el origin público desde las cabeceras del proxy
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.includes(".alu@")) {
        await supabase.auth.signOut();
        if (user.id) {
          const { createAdminClient } = await import("@/lib/supabase/admin");
          await createAdminClient().auth.admin.deleteUser(user.id);
        }
        return NextResponse.redirect(`${origin}/acceso-denegado`);
      }
      // External maintenance technician: replace the Supabase session with the portal's own
      // httpOnly cookie, so their browser never holds a database token
      if (user?.email && (await isTecnicoExterno(user.email))) {
        await iniciarSesionExterna(supabase, { ...user, email: user.email });
        return NextResponse.redirect(`${origin}${EXTERNO_HOME}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}