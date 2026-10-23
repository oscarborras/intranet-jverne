import { redirect } from "next/navigation";

// Authorised people are now shown in each student's card in "Alumnado"
export default function AutorizadosPage() {
  redirect("/alumnado");
}
