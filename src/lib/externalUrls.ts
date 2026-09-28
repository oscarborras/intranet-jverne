// External webs set in Configuración → URLs (config_intranet claves "url_<key>"),
// shown embedded inside the intranet from the side menu.
import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Links keyed without the "url_" prefix (url_horarios → horarios). Memoized per request. */
export const getExternalUrls = cache(async (): Promise<Record<string, string>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("config_intranet")
    .select("clave, valor")
    .like("clave", "url\\_%");
  return Object.fromEntries(
    (data ?? [])
      .map((r) => [r.clave.replace(/^url_/, ""), r.valor.trim()] as const)
      // Only https: an http page inside the https intranet is blocked by the browser,
      // and this also rules out javascript: and other schemes
      .filter(([, url]) => /^https:\/\//i.test(url))
  );
});
