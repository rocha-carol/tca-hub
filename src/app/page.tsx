import { redirect } from "next/navigation";

/**
 * Tela inicial provisória para navegação de testes do MVP.
 *
 * Esta tela evita autenticação real e oferece entradas diretas por perfil.
 * O objetivo é acelerar validação de fluxos locais sem alterar backend ou banco.
 */
export default function Home() {
  redirect("/auth/login?perfil=student");
}