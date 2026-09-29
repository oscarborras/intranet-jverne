// Roles for the Gratuidad v2 module. They mirror the SQL helpers
// gplv2_puede_operar() and gplv2_puede_gestionar(); keep both in sync.

/** Look up data and scan deliveries / returns */
export const ROLES_OPERAR_V2 = ["Admin", "Directiva", "Coord_Gratuidad", "Profesor", "TDE"];

/** Catalogue, copies, labels, write-offs and incidents */
export const ROLES_GESTIONAR_V2 = ["Admin", "Directiva", "Coord_Gratuidad"];

export function puedeGestionarV2(roleNames: string[]): boolean {
  return roleNames.some((r) => ROLES_GESTIONAR_V2.includes(r));
}
