import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import type { Perfil } from "@/lib/types";
import { version } from "../../../package.json";

export default async function IntranetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: userRoles }, { data: modulosData }] = await Promise.all([
    supabase
      .from("user_roles_intranet")
      .select("perfil_id, perfiles_intranet(id, nombre, descripcion, created_at)")
      .eq("user_id", user.id),
    supabase.from("modulos_config").select("slug, activo"),
  ]);

  const roles: Perfil[] = (userRoles ?? [])
    .map((ur) => ur.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const isAdmin = roles.some((r) => r.nombre === "Admin");
  const inactiveModuleSlugs = (modulosData ?? [])
    .filter((m) => !m.activo)
    .map((m) => m.slug as string);

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar userRoles={roles} userName={userName} inactiveModuleSlugs={inactiveModuleSlugs} version={version} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          userName={userName}
          userEmail={user.email ?? ""}
          userRoles={roles}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav inactiveModuleSlugs={inactiveModuleSlugs} isAdmin={isAdmin} />
    </div>
  );
}
