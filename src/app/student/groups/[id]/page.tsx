import { redirect } from "next/navigation";

interface StudentGroupByIdPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Rota de conveniência para estudante.
 *
 * Mantém URL amigável no namespace /student sem duplicar a página de grupo.
 */
export default async function StudentGroupByIdPage({ params }: StudentGroupByIdPageProps) {
  const { id } = await params;
  redirect(`/groups/${id}`);
}
