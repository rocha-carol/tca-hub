import { Card } from "@/components/ui/Card";
import BackLinkButton from "@/components/ui/BackLinkButton";
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

  const sectionCount = projectSections.length;
  const currentGroupLabel = context.group?.theme || (context.group?.id ? `Grupo ${String(context.group.id).slice(0, 8)}` : "Sem grupo formado");

  return (
    <section className="space-y-4">
      <header>
        <div className="mb-4 flex justify-end">
          <BackLinkButton fallbackHref="/student" label="← Voltar" />
        </div>
        <h1 className="text-3xl font-bold tca-title-guide">Jornada do projeto</h1>
        <p className="text-gray-600 mt-1.5">
          Aqui ficam o progresso da investigação, a missão atual e os marcos já desbloqueados pelo grupo.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="border border-[#E3EDE0] bg-white/95 p-4 shadow-[0_6px_18px_rgba(31,41,55,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F] mb-2">Situação</p>
          <p className="text-lg font-bold text-[#1F2937]">{hasGroup ? "Grupo ativo" : "Sem grupo"}</p>
          <p className="text-sm text-[#6B7280] mt-1">{currentGroupLabel}</p>
        </Card>

        <Card className="border border-[#E3EDE0] bg-white/95 p-4 shadow-[0_6px_18px_rgba(31,41,55,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F] mb-2">Projeto</p>
          <p className="text-lg font-bold text-[#1F2937]">{sectionCount} etapas</p>
          <p className="text-sm text-[#6B7280] mt-1">Estrutura principal disponível para acompanhamento.</p>
        </Card>
      </section>

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