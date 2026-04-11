import { loadStudentPortalData } from "@/app/student/_lib/student-portal-data";
import { StudentHomeContent } from "@/components/student/StudentHomeContent";

interface StudentPageProps {
  searchParams?: Promise<{ modo?: string }>;
}

/**
 * Página inicial do estudante.
 *
 * Esta tela é o ponto de entrada antes da fase de escrita,
 * com foco em acolhimento, onboarding e decisão inicial.
 */
export default async function StudentPage({ searchParams }: StudentPageProps) {
  const _params = searchParams ? await searchParams : {};
  const {
    context,
    firstName,
    hasGroup,
    nextJourneyHref,
    projectSections,
  } = await loadStudentPortalData();

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-[#E3EDE0] bg-white/90 px-5 py-5 shadow-[0_8px_24px_rgba(31,41,55,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">Área do estudante</p>
        <h1 className="mt-2 text-3xl font-bold tca-title-guide">Seu espaço no TCA Hub</h1>
        <p className="text-gray-600 mt-1.5 max-w-2xl">
          Um ponto de partida mais leve para acompanhar o projeto, entender a etapa atual e seguir para a próxima ação.
        </p>
      </header>

      <StudentHomeContent
        firstName={firstName}
        hasGroup={hasGroup}
        group={context.group}
        groupId={context.group?.id}
        nextJourneyHref={nextJourneyHref}
        projectSections={projectSections}
      />
    </section>
  );
}
