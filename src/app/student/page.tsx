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
    studentName,
  } = await loadStudentPortalData();

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold tca-title-guide">Área do estudante</h1>
        <p className="text-gray-600 mt-1.5">Seu ponto de partida no TCA Hub.</p>
      </header>

      <StudentHomeContent
        firstName={firstName}
        hasGroup={hasGroup}
        group={context.group}
        groupId={context.group?.id}
        nextJourneyHref={nextJourneyHref}
        projectSections={projectSections}
        studentName={studentName}
        studentsError={context.studentsError}
        groupsError={context.groupsError}
      />
    </section>
  );
}
