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

  const sectionCount = projectSections.length;
  const currentGroupLabel = context.group?.theme || (context.group?.id ? `Grupo ${String(context.group.id).slice(0, 8)}` : "Sem grupo formado");

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

      <section className="grid gap-3 md:grid-cols-3">
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

        <Card className="border border-[#E3EDE0] bg-white/95 p-4 shadow-[0_6px_18px_rgba(31,41,55,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F] mb-2">Acesso rápido</p>
          <p className="text-lg font-bold text-[#1F2937]">Jornada</p>
          <p className="text-sm text-[#6B7280] mt-1">Missão atual, avanço por etapas e conquistas do grupo.</p>
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