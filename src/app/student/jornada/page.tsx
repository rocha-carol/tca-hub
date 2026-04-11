import { Card } from "@/components/ui/Card";
import { TcaStepsGuide } from "@/components/student/TcaStepsGuide";
import { loadStudentPortalData } from "@/app/student/_lib/student-portal-data";

export default async function StudentJourneyPage() {
  const {
    hasGroup,
    context,
    nextJourneyHref,
    processPhotosCount,
    projectSections,
    repertoryItemsCount,
    studentName,
    themeGuideState,
  } = await loadStudentPortalData();

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold tca-title-guide">Jornada do projeto</h1>
        <p className="text-gray-600 mt-1.5">
          Aqui ficam o progresso da investigação, a missão atual e os marcos já desbloqueados pelo grupo.
        </p>
      </header>

      <Card className="border border-[#DCEBD5] bg-[#F8FBF6]">
        <p className="text-sm text-[#374151] leading-relaxed">
          Esta é a página de acompanhamento da jornada. Ela reúne as etapas do TCA, mostra o que já foi concluído,
          indica o próximo passo do grupo e concentra os reconhecimentos pedagógicos do percurso.
        </p>
      </Card>

      <TcaStepsGuide
        hasGroup={hasGroup}
        group={context.group}
        groupId={context.group?.id}
        nextJourneyHref={nextJourneyHref}
        projectSections={projectSections}
        processPhotosCount={processPhotosCount}
        repertoryItemsCount={repertoryItemsCount}
        themeGuideSuggestions={themeGuideState?.ai_suggestions ?? null}
        studentName={studentName}
        studentsError={context.studentsError}
        groupsError={context.groupsError}
      />
    </section>
  );
}