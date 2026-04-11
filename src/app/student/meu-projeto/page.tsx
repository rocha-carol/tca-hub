import { redirect } from "next/navigation";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

/**
 * Rota principal da experiência do estudante.
 *
 * Substitui gradualmente /meu-projeto sem quebrar compatibilidade.
 */
interface StudentMeuProjetoPageProps {
  searchParams?: Promise<{ modo?: string }>;
}

export default async function StudentMeuProjetoPage({ searchParams }: StudentMeuProjetoPageProps) {
  const params = searchParams ? await searchParams : {};

  // Mantém comportamento antigo para navegação provisória.
  if (params.modo === "provisorio") {
    redirect(STUDENT_ROUTES.HOME);
  }

  // Compatibilidade: rota antiga passa a apontar para a nova entrada do estudante.
  redirect(STUDENT_ROUTES.HOME);
}
