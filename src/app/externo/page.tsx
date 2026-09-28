import { redirect } from "next/navigation";
import { EXTERNO_HOME } from "@/lib/externo";

export default function ExternoIndexPage() {
  redirect(EXTERNO_HOME);
}
