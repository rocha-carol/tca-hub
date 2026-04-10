import { redirect } from "next/navigation";

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
    redirect("/groups");
  }

  // Compatibilidade: rota antiga passa a apontar para a nova entrada do estudante.
  redirect("/student");
}
