import { redirect } from "next/navigation";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

/**
 * Rota legada de compatibilidade.
 *
 * Mantida para não quebrar links antigos enquanto a navegação migra
 * para a rota canônica /estudante.
 */
interface LegacyMeuProjetoPageProps {
  searchParams?: Promise<{ modo?: string }>;
}

export default async function LegacyMeuProjetoPage({ searchParams }: LegacyMeuProjetoPageProps) {
  const params = searchParams ? await searchParams : {};

  if (params.modo) {
    redirect(`${STUDENT_ROUTES.HOME}?modo=${encodeURIComponent(params.modo)}`);
  }

  redirect(STUDENT_ROUTES.HOME);
}
