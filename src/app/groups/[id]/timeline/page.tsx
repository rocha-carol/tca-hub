import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGroupById } from "@/services/group-service";
import { fetchGroupProjectSectionStageSchedule } from "@/services/project-section-stage-schedule-service";
import { fetchGroupInPersonMeetings } from "@/services/group-in-person-meeting-service";
import { fetchGroupProjectSections } from "@/services/project-section-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const TCA_STAGES = [
  { key: "tema", label: "Tema definido", icon: "🌱" },
  { key: "pesquisa", label: "Pesquisa", icon: "🔍" },
  { key: "entrevistas", label: "Entrevistas", icon: "🎤" },
  { key: "producao", label: "Produção", icon: "✏️" },
  { key: "apresentacao", label: "Apresentação", icon: "🎯" },
];

interface TimelinePageProps {
  params: Promise<{ id: string }>;
}

function meetingStatusBadge(status: string) {
  if (status === "realizado") return <Badge variant="green">Realizado</Badge>;
  if (status === "cancelado") return <Badge variant="red">Cancelado</Badge>;
  return <Badge variant="blue">Agendado</Badge>;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function stageIndexFromSection(sectionOrder: number): number {
  if (sectionOrder <= 1) return 0;
  if (sectionOrder === 2) return 1;
  if (sectionOrder === 3) return 2;
  if (sectionOrder <= 5) return 3;
  return 4;
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { id } = await params;

  const group = await fetchGroupById(id);
  if (!group) notFound();

  let sections: Awaited<ReturnType<typeof fetchGroupProjectSections>> = [];
  let schedule: Awaited<ReturnType<typeof fetchGroupProjectSectionStageSchedule>> = [];
  let meetings: Awaited<ReturnType<typeof fetchGroupInPersonMeetings>> = [];

  try {
    sections = await fetchGroupProjectSections(id);
  } catch { /* silencioso */ }

  try {
    schedule = await fetchGroupProjectSectionStageSchedule(id);
  } catch { /* silencioso */ }

  try {
    meetings = await fetchGroupInPersonMeetings(id);
  } catch { /* silencioso */ }

  const sectionTitleById = new Map(sections.map((s) => [String(s.id), `${s.section_order}. ${s.section_title}`]));

  // Determine current active stage based on section statuses
  const concluidos = sections.filter((s) => s.status === "concluido").length;
  const emAndamento = sections.filter((s) => s.status === "em_andamento").length;
  let activeStageIndex = 0;
  if (concluidos === sections.length && sections.length > 0) activeStageIndex = 4;
  else if (concluidos >= 4) activeStageIndex = 3;
  else if (concluidos >= 2 || emAndamento > 0) activeStageIndex = Math.min(concluidos + (emAndamento > 0 ? 1 : 0), 3);
  else if (sections.length > 0) activeStageIndex = 0;

  const sortedSchedule = [...schedule].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const sortedMeetings = [...meetings].sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));

  return (
    <div className="max-w-4xl space-y-8">
      <div className="tca-stripes h-1.5 w-full rounded-md" />

      <header>
        <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
          ← Projeto
        </Link>
        <h1 className="text-3xl font-bold text-[#1F2937] mt-2">Cronograma</h1>
        <p className="text-[#6B7280] mt-1">{group.theme || group.member_1_name}</p>
      </header>

      {/* Linha do tempo horizontal — 5 etapas */}
      <section>
        <h2 className="text-base font-semibold text-[#1F2937] mb-5">Etapas do TCA</h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start min-w-[540px] gap-0">
            {TCA_STAGES.map((stage, i) => {
              const isDone = i < activeStageIndex;
              const isActive = i === activeStageIndex;
              const isLast = i === TCA_STAGES.length - 1;
              return (
                <div key={stage.key} className="flex items-start flex-1">
                  {/* Stage node */}
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow
                        ${isDone ? "bg-[#4CAF50] text-white" : isActive ? "bg-[#8BC34A] text-white ring-4 ring-[#c8e6c9]" : "bg-gray-100 text-gray-400"}`}
                    >
                      {isDone ? "✓" : stage.icon}
                    </div>
                    <p
                      className={`text-xs font-semibold mt-2 text-center leading-tight
                        ${isDone ? "text-[#4CAF50]" : isActive ? "text-[#1F2937]" : "text-[#9CA3AF]"}`}
                    >
                      {stage.label}
                    </p>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex-shrink-0 w-8 mt-6">
                      <div className={`h-0.5 w-full ${i < activeStageIndex ? "bg-[#4CAF50]" : "bg-gray-200"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Prazos por seção */}
      <section>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Prazos por seção</h2>
        {sortedSchedule.length === 0 ? (
          <Card>
            <p className="text-[#6B7280] text-sm">Nenhum prazo cadastrado ainda. O orientador pode definir prazos por seção na página do projeto.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedSchedule.map((item) => {
              const sectionTitle = sectionTitleById.get(String(item.section_id)) || `Seção ${item.section_id}`;
              const isPast = new Date(item.due_date) < new Date();
              return (
                <Card key={String(item.id)} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPast ? "bg-[#EB5757]" : "bg-[#4CAF50]"}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1F2937] text-sm truncate">{sectionTitle}</p>
                      {item.notes && (
                        <p className="text-xs text-[#6B7280] mt-0.5 truncate">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={isPast ? "red" : "blue"}>{formatDate(item.due_date)}</Badge>
                    <p className="text-xs text-[#6B7280] mt-1">{item.author_name}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Encontros presenciais */}
      <section>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Encontros presenciais</h2>
        {sortedMeetings.length === 0 ? (
          <Card>
            <p className="text-[#6B7280] text-sm">Nenhum encontro agendado ainda.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedMeetings.map((meeting) => (
              <Card key={String(meeting.id)} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1F2937]">{meeting.agenda}</p>
                    <p className="text-sm text-[#6B7280]">
                      {formatDate(meeting.meeting_date)}
                      {meeting.meeting_time && ` às ${meeting.meeting_time}`}
                      {meeting.location && ` — ${meeting.location}`}
                    </p>
                  </div>
                  {meetingStatusBadge(meeting.status)}
                </div>
                {meeting.notes && (
                  <p className="text-sm text-[#6B7280] bg-gray-50 rounded-lg px-3 py-2">
                    {meeting.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
