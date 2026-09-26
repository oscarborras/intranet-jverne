import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayMadrid } from "@/lib/dates";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Public teacher search for the family appointment form.
// The full staff list never leaves the server: only a few matches per query.

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 5;
const RATE_LIMIT = 30; // requests per IP and minute
const RATE_WINDOW_MS = 60_000;

/** Lowercase and strip accents/diacritics: "José Núñez" -> "jose nunez". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export interface ProfesorBusqueda {
  id: string;
  profesor: string;
}

export async function GET(req: NextRequest) {
  if (isRateLimited(`profesores:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas. Espere un minuto y vuelva a intentarlo." },
      { status: 429 }
    );
  }

  const words = normalize(req.nextUrl.searchParams.get("q") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

  if (words.join("").length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ profesores: [], hayMas: false });
  }

  const admin = createAdminClient();
  const today = todayMadrid();
  const { data, error } = await admin
    .from("profesores")
    .select("id, profesor")
    .or(`fecha_cese.is.null,fecha_cese.gt.${today}`)
    .order("profesor", { ascending: true });

  if (error) {
    console.error("Error searching profesores:", error);
    return NextResponse.json({ error: "Error al buscar profesorado" }, { status: 500 });
  }

  // Every typed word must appear in the name (accent- and case-insensitive)
  const matches = ((data ?? []) as ProfesorBusqueda[]).filter((p) => {
    const name = normalize(p.profesor);
    return words.every((w) => name.includes(w));
  });

  return NextResponse.json({
    profesores: matches.slice(0, MAX_RESULTS),
    hayMas: matches.length > MAX_RESULTS,
  });
}
