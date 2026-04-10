import { redirect } from "next/navigation";

/**
 * Rota legada de compatibilidade.
 *
 * Mantida para não quebrar links antigos enquanto a navegação migra
 * para /student/meu-projeto.
 */
interface LegacyMeuProjetoPageProps {
  searchParams?: Promise<{ modo?: string }>;
}

export default async function LegacyMeuProjetoPage({ searchParams }: LegacyMeuProjetoPageProps) {
  const params = searchParams ? await searchParams : {};

  if (params.modo) {
    redirect(`/student/meu-projeto?modo=${encodeURIComponent(params.modo)}`);
  }

  redirect("/student/meu-projeto");
}
