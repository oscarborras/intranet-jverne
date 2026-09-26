import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy (Next.js 16, formerly "middleware"): refreshes the Supabase session on every
// request and performs an optimistic redirect. It is NOT the security boundary —
// pages and Route Handlers verify the user again through src/lib/auth.ts.

// Default deny: everything requires a session except these routes.
const PUBLIC_PREFIXES = [
  "/login",
  "/auth/callback",
  "/familias", // public appointment request / cancellation pages for families
  "/api/citas/solicitar",
  "/api/citas/profesores",
  "/api/citas/cancelar-familia",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getUser(): this call refreshes the tokens.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase unreachable — treat as unauthenticated
  }

  const { pathname } = request.nextUrl;

  // Keep refreshed session cookies on any response other than supabaseResponse
  const withSessionCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return withSessionCookies(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url));
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
