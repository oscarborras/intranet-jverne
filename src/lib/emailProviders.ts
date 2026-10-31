import "server-only";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_EMAIL_PROVIDER,
  EMAIL_PROVIDERS,
  emailProviderClave,
  isEmailProvider,
  type EmailModule,
  type EmailProvider,
} from "@/lib/emailConfig";

// Sends the app's emails through the service chosen for each module in Configuración → Envíos emails.
// API keys live in .env.local (RESEND_API_KEY, BREVO_API_KEY), never in the database.

const DEFAULT_FROM = "IES Julio Verne <noreply@iesjulioverne.es>";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
}

interface Sender {
  name: string;
  email: string;
}

type ProviderSend = (from: Sender, msg: EmailMessage) => Promise<void>;

// "Name <email>" or a bare email address
function parseSender(value: string): Sender {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1], email: match[2].trim() } : { name: "", email: value.trim() };
}

// Each provider may use its own verified sender; both fall back to the school's noreply address
function senderFor(provider: EmailProvider): Sender {
  const override = provider === "brevo" ? process.env.BREVO_SENDER : process.env.RESEND_SENDER;
  return parseSender(override || DEFAULT_FROM);
}

function toList(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

let resendClient: Resend | null = null;

const sendWithResend: ProviderSend = async (from, msg) => {
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await resendClient.emails.send({
    from: from.name ? `${from.name} <${from.email}>` : from.email,
    to: toList(msg.to),
    subject: msg.subject,
    html: msg.html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
};

// https://developers.brevo.com/reference/sendtransacemail
const sendWithBrevo: ProviderSend = async (from, msg) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: from.name ? from : { email: from.email },
      to: toList(msg.to).map((email) => ({ email })),
      subject: msg.subject,
      htmlContent: msg.html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
};

const SENDERS: Record<EmailProvider, ProviderSend> = {
  resend: sendWithResend,
  brevo: sendWithBrevo,
};

export function isEmailProviderReady(provider: EmailProvider): boolean {
  return Boolean(process.env[EMAIL_PROVIDERS[provider].envVar]);
}

// Provider configured for the module. Read with the admin client because some senders are public
// family routes with no session; it only reads one config value.
export async function getEmailProvider(modulo: EmailModule): Promise<EmailProvider> {
  const { data } = await createAdminClient()
    .from("config_intranet")
    .select("valor")
    .eq("clave", emailProviderClave(modulo))
    .maybeSingle();
  return isEmailProvider(data?.valor) ? data.valor : DEFAULT_EMAIL_PROVIDER;
}

// Whether the module can send emails right now (its provider has an API key)
export async function isEmailEnabled(modulo: EmailModule): Promise<boolean> {
  return isEmailProviderReady(await getEmailProvider(modulo));
}

// Sends through the module's provider. Skips (with a warning) when that provider has no API key,
// and throws when the provider rejects the message, so callers keep their non-blocking .catch().
export async function sendEmail(modulo: EmailModule, msg: EmailMessage): Promise<void> {
  if (toList(msg.to).length === 0) return;
  const provider = await getEmailProvider(modulo);
  if (!isEmailProviderReady(provider)) {
    console.warn(`[email] ${EMAIL_PROVIDERS[provider].envVar} no configurada: no se envía "${msg.subject}" (${modulo})`);
    return;
  }
  await SENDERS[provider](senderFor(provider), msg);
}
