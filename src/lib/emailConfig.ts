// Email delivery services and the app modules that send emails. Shared by the server
// (lib/emailProviders.ts) and Configuración → Envíos emails, so it must stay client-safe.

export const EMAIL_PROVIDERS = {
  resend: { nombre: "Resend", envVar: "RESEND_API_KEY" },
  brevo: { nombre: "Brevo", envVar: "BREVO_API_KEY" },
} as const;

export type EmailProvider = keyof typeof EMAIL_PROVIDERS;

export const DEFAULT_EMAIL_PROVIDER: EmailProvider = "resend";

export const EMAIL_MODULES = {
  citas_familias: "Citas con familias",
  ausencias: "Ausencias",
  peticiones_tic: "Peticiones TIC",
  peticiones_mantenimiento: "Peticiones Mantenimiento",
  calendario: "Calendario",
} as const;

export type EmailModule = keyof typeof EMAIL_MODULES;

// config_intranet clave holding the provider chosen for each module
const PROVIDER_CLAVE_PREFIX = "email_proveedor_";

export function emailProviderClave(modulo: EmailModule): string {
  return `${PROVIDER_CLAVE_PREFIX}${modulo}`;
}

export function isEmailProviderClave(clave: string): boolean {
  return clave.startsWith(PROVIDER_CLAVE_PREFIX);
}

export function emailModuleFromClave(clave: string): EmailModule | null {
  const modulo = clave.slice(PROVIDER_CLAVE_PREFIX.length);
  return modulo in EMAIL_MODULES ? (modulo as EmailModule) : null;
}

export function isEmailProvider(value: unknown): value is EmailProvider {
  return typeof value === "string" && value in EMAIL_PROVIDERS;
}
