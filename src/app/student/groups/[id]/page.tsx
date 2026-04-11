import { redirect } from "next/navigation";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentGroupByIdPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Rota de conveniência para estudante.
 *
 * Mantém compatibilidade para o namespace legado /student,
 * redirecionando para a URL canônica do estudante sem duplicar a página de grupo.
 */
export default async function StudentGroupByIdPage({ params }: StudentGroupByIdPageProps) {
  const { id } = await params;
  redirect(`${STUDENT_ROUTES.GROUP}/${id}`);
}
