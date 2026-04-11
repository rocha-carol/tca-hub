import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGroupById } from "@/services/group-service";
import { fetchGroupProjectSectionQuestions } from "@/services/project-section-question-service";
import { fetchGroupProjectSectionQuestionAnswers } from "@/services/project-section-question-answer-service";
import { fetchGroupProjectSections } from "@/services/project-section-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireGroupAccess } from "@/services/group-access-service";

interface QuestionsPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

export default async function QuestionsPage({ params }: QuestionsPageProps) {
  const { id } = await params;
  const { group } = await requireGroupAccess(id);

  let questions: Awaited<ReturnType<typeof fetchGroupProjectSectionQuestions>> = [];
  let answers: Awaited<ReturnType<typeof fetchGroupProjectSectionQuestionAnswers>> = [];
  let sections: Awaited<ReturnType<typeof fetchGroupProjectSections>> = [];

  try {
    questions = await fetchGroupProjectSectionQuestions(id);
  } catch { /* silencioso */ }

  try {
    answers = await fetchGroupProjectSectionQuestionAnswers(id);
  } catch { /* silencioso */ }

  try {
    sections = await fetchGroupProjectSections(id);
  } catch { /* silencioso */ }

  const sectionTitleById = new Map(sections.map((s) => [String(s.id), `${s.section_order}. ${s.section_title}`]));
  const answersByQuestion = new Map<string, typeof answers>();
  for (const answer of answers) {
    const key = String(answer.question_id);
    answersByQuestion.set(key, [...(answersByQuestion.get(key) ?? []), answer]);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="tca-stripes h-1.5 w-full rounded-md" />

      <header>
        <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
          ← Projeto
        </Link>
        <h1 className="text-3xl font-bold text-[#1F2937] mt-2">Dúvidas</h1>
        <p className="text-[#6B7280] mt-1">{group.theme || group.member_1_name}</p>
      </header>

      {questions.length === 0 ? (
        <Card>
          <p className="text-[#6B7280] text-sm">
            Nenhuma dúvida registrada ainda. Os estudantes podem perguntar pela página do projeto em cada seção.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const qAnswers = answersByQuestion.get(String(q.id)) ?? [];
            return (
              <Card key={String(q.id)} accent={qAnswers.length > 0 ? "green" : "yellow"}>
                {/* Pergunta */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl">❓</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1F2937]">{q.question}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-[#6B7280] items-center">
                      <span>{q.author_name}</span>
                      {formatDate(q.created_at) && <span>• {formatDate(q.created_at)}</span>}
                      {sectionTitleById.get(String(q.section_id)) && (
                        <span className="bg-gray-100 rounded px-2 py-0.5">
                          {sectionTitleById.get(String(q.section_id))}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={qAnswers.length > 0 ? "green" : "yellow"}>
                    {qAnswers.length > 0 ? "Respondida" : "Aguardando"}
                  </Badge>
                </div>

                {/* Respostas */}
                {qAnswers.length > 0 && (
                  <div className="space-y-2 pl-9">
                    {qAnswers.map((a) => (
                      <div key={String(a.id)} className="bg-green-50 rounded-xl p-3">
                        <p className="text-sm text-[#1F2937]">{a.answer}</p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {a.author_name} ({a.author_role === "coordinator" ? "Coordenador" : "Orientador"})
                          {formatDate(a.created_at) && ` • ${formatDate(a.created_at)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
