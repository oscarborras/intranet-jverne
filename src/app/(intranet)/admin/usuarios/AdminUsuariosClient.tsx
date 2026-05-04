"use client";

import { useState } from "react";
import { Users, Edit2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Perfil } from "@/lib/types";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string;
}

interface Props {
  users: UserRow[];
  perfiles: Perfil[];
  userRolesMap: { user_id: string; perfil_id: number }[];
  currentUserId: string;
}

export function AdminUsuariosClient({ users, perfiles, userRolesMap, currentUserId }: Props) {
  const [rolesMap, setRolesMap] = useState<Record<string, number[]>>(
    userRolesMap.reduce<Record<string, number[]>>((acc, ur) => {
      if (!acc[ur.user_id]) acc[ur.user_id] = [];
      acc[ur.user_id].push(ur.perfil_id);
      return acc;
    }, {})
  );
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"usuarios" | "auditoria">("usuarios");

  function startEdit(userId: string) {
    setEditingUser(userId);
    setEditRoles(rolesMap[userId] ?? []);
  }

  function toggleRole(perfilId: number) {
    setEditRoles((prev) =>
      prev.includes(perfilId) ? prev.filter((id) => id !== perfilId) : [...prev, perfilId]
    );
  }

  async function saveRoles(userId: string) {
    setSaving(true);
    const supabase = createClient();

    // Remove all existing roles
    await supabase.from("user_roles_intranet").delete().eq("user_id", userId);

    // Insert new roles
    if (editRoles.length > 0) {
      await supabase.from("user_roles_intranet").insert(
        editRoles.map((pid) => ({ user_id: userId, perfil_id: pid }))
      );
    }

    setRolesMap((prev) => ({ ...prev, [userId]: editRoles }));
    setEditingUser(null);
    setSaving(false);
  }

  function getUserRoles(userId: string): Perfil[] {
    const ids = rolesMap[userId] ?? [];
    return perfiles.filter((p) => ids.includes(p.id));
  }

  const isAdmin = (userId: string) =>
    (rolesMap[userId] ?? []).some((id) => perfiles.find((p) => p.id === id)?.nombre === "Admin");

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Users size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500">Gestión de usuarios y auditoría de accesos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["usuarios", "auditoria"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "usuarios" ? "Usuarios" : "Auditoría y Accesos"}
          </button>
        ))}
      </div>

      {tab === "usuarios" && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Roles</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Admin</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const roles = getUserRoles(u.id);
                const admin = isAdmin(u.id);
                const isEditing = editingUser === u.id;

                return (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name || u.email.split("@")[0]}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1">
                          {perfiles.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => toggleRole(p.id)}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border font-medium transition-colors",
                                editRoles.includes(p.id)
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-gray-500 border-gray-300 hover:border-blue-400"
                              )}
                            >
                              {p.nombre}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r) => (
                            <span
                              key={r.id}
                              className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium"
                            >
                              {r.nombre}
                            </span>
                          ))}
                          {roles.length === 0 && (
                            <span className="text-xs text-gray-400">Sin asignar</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {admin ? (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Sí</span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveRoles(u.id)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(u.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "auditoria" && (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          Auditoría — próximamente
        </div>
      )}
    </div>
  );
}
