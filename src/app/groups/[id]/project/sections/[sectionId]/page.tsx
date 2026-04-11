import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { fetchGroupById } from "@/services/group-service";
import { ensureGroupProjectSectionsStructure, updateGroupProjectSection } from "@/services/project-section-service";
import { fetchGroupProjectSectionComments } from "@/services/project-section-comment-service";
import { fetchGroupProjectSectionNextSteps } from "@/services/project-section-next-step-service";
import { requireGroupAccess } from "@/services/group-access-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ProjectSectionStatus } from "@/types/project-section";

interface SectionEditorPageProps {
  params: Promise<{ id: string; sectionId: string }>;
  searchParams?: Promise<{ saved?: string }>;
}

type SectionGuidance = {
  objective: string;
  guidingQuestions: string[];
  howToWrite: string;
};

function getSectionGuidance(sectionKey: string): SectionGuidance {
  const map: Record<string, SectionGuidance> = {
    tema_contexto: {
      objective: "Apresentar o tema escolhido, o contexto do território e a relevância da investigação.",
      guidingQuestions: [
        "Qual tema o grupo escolheu e por que ele importa no território?",
        "Que situação concreta motivou o projeto?",
        "Quais observações do bairro ou comunidade contextualizam o recorte?",
      ],
      howToWrite:
        "Comece situando o leitor no território. Descreva a realidade observada pelo grupo, explique o que chamou atenção e por que esse tema merece investigação.",
    },
    problema_justificativa: {
      objective: "Definir com clareza o problema investigado e justificar sua relevância.",
      guidingQuestions: [
        "Qual problema social ou comunitário está sendo investigado?",
        "Quem é afetado e de que forma?",
        "Por que vale a pena investigar esse problema?",
      ],
      howToWrite:
        "Formule o problema em uma ou duas frases objetivas. Em seguida, explique quem é impactado e por que esse problema é socialmente relevante. Use dados ou observações como evidência.",
    },
    objetivos: {
      objective: "Transformar o problema em objetivos claros que orientem a pesquisa.",
      guidingQuestions: [
        "O que o grupo pretende compreender ou transformar?",
        "Quais etapas práticas são necessárias?",
        "Os objetivos são coerentes com o problema investigado?",
      ],
      howToWrite:
        "Escreva um objetivo geral e de dois a quatro objetivos específicos. Use verbos de ação: investigar, analisar, propor, validar. Cada objetivo específico deve ser uma etapa concreta rumo ao objetivo geral.",
    },
    metodologia_plano: {
      objective: "Descrever como o grupo vai investigar o tema e organizar o percurso.",
      guidingQuestions: [
        "Quais estratégias de pesquisa serão usadas?",
        "Como as tarefas serão divididas?",
        "Que recursos e fontes são necessários?",
      ],
      howToWrite:
        "Detalhe as etapas da investigação em ordem lógica. Explique quem fará o quê, quais fontes serão consultadas e como o grupo vai registrar os resultados.",
    },
    desenvolvimento_registros: {
      objective: "Registrar o percurso investigativo, aprendizados e evidências produzidas.",
      guidingQuestions: [
        "O que o grupo fez e o que aprendeu no processo?",
        "Que evidências mostram o avanço da investigação?",
        "Quais ajustes de rota foram necessários?",
      ],
      howToWrite:
        "Narre o percurso com honestidade: o que funcionou, o que precisou ser revisto e o que foi descoberto. Inclua evidências concretas como entrevistas, dados e observações.",
    },
    resultado_produto_final: {
      objective: "Apresentar os resultados alcançados e o produto final construído.",
      guidingQuestions: [
        "Quais resultados o grupo alcançou?",
        "Como o produto final dialoga com o problema inicial?",
        "Que impacto ou continuidade esse trabalho pode gerar?",
      ],
      howToWrite:
        "Conecte os resultados ao problema investigado no início. Descreva o produto final com clareza e finalize apontando próximos passos ou impactos possíveis do trabalho.",
    },
  };

  return (
    map[sectionKey] ?? {
      objective: "Explicitar o propósito desta seção e o que o grupo precisa comunicar.",
      guidingQuestions: [
        "O que esta seção precisa mostrar?",
        "Que evidências fortalecem esta parte?",
        "Como escrever este trecho com mais clareza e autoria?",
      ],
      howToWrite:
        "Escreva com voz autoral, evidenciando o processo investigativo e as escolhas do grupo. Evite texto genérico — mostre o que o grupo realmente viveu e aprendeu.",
    }
  );
}

function statusLabel(status: ProjectSectionStatus) {
  if (status === "concluido") return { text: "Concluída", variant: "green" as const };
  if (status === "em_andamento") return { text: "Em andamento", variant: "yellow" as const };
  return { text: "Não iniciada", variant: "gray" as const };
}

function formatDate(date?: string | null) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

export default async function SectionEditorPage({ params, searchParams }: SectionEditorPageProps) {
  const { id, sectionId } = await params;
  const query = searchParams ? await searchParams : {};
  const { group, profile } = await requireGroupAccess(id);
  const canManageStatuses = profile?.role === "advisor" || profile?.role === "coordinator";

  const sections = await ensureGroupProjectSectionsStructure(id).catch(() => []);

  const section = sections.find((s) => String(s.id) === sectionId);
  if (!section) notFound();

  const guidance = getSectionGuidance(section.section_key);
  const sl = statusLabel(section.status);
  const isStudentView = profile?.role === "student";
  const shouldShowThemeTitleGuidance = isStudentView && section.section_key === "tema_contexto";

  let comments: Awaited<ReturnType<typeof fetchGroupProjectSectionComments>> = [];
  let nextSteps: Awaited<ReturnType<typeof fetchGroupProjectSectionNextSteps>> = [];

  try {
    const all = await fetchGroupProjectSectionComments(id);
    comments = all.filter((c) => String(c.section_id) === sectionId);
  } catch { /* silencioso */ }

  try {
    const all = await fetchGroupProjectSectionNextSteps(id);
    nextSteps = all.filter((n) => String(n.section_id) === sectionId);
  } catch { /* silencioso */ }

  async function handleSave(formData: FormData) {
    "use server";
    const { profile } = await requireGroupAccess(id);

    const latestSections = await ensureGroupProjectSectionsStructure(id).catch(() => []);
    const latestSection = latestSections.find((item) => String(item.id) === sectionId);
    const rawStatus = String(formData.get("status") ?? latestSection?.status ?? "nao_iniciado");
    const allowed: ProjectSectionStatus[] = ["nao_iniciado", "em_andamento", "concluido"];
    const canManageSectionStatus = profile.role === "advisor" || profile.role === "coordinator";
    const status: ProjectSectionStatus = canManageSectionStatus
      ? (allowed.includes(rawStatus as ProjectSectionStatus)
          ? (rawStatus as ProjectSectionStatus)
          : (latestSection?.status ?? "nao_iniciado"))
      : (latestSection?.status ?? "nao_iniciado");

    await updateGroupProjectSection(sectionId, {
      content: String(formData.get("content") ?? "").trim() || null,
      status,
    });

    revalidatePath(STUDENT_ROUTES.HOME);
    revalidatePath(STUDENT_ROUTES.LEGACY_NAMESPACE_HOME);
    revalidatePath(`/groups/${id}/project/sections/${sectionId}`);
    revalidatePath(`/groups/${id}/project`);

    if (profile.role === "student") {
      redirect(STUDENT_ROUTES.JOURNEY);
    }

    redirect(`/groups/${id}/project/sections/${sectionId}?saved=1`);
  }

  const sectionIndex = sections.findIndex((s) => String(s.id) === sectionId);
  const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;

  return (
    <div className="max-w-5xl">
      {/* Faixa de cor */}
      <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
        <Link href={`/groups/${id}/project`} className="text-[#4CAF50] hover:underline">
          Projeto
        </Link>
        <span>›</span>
        <span className="text-[#1F2937] font-medium truncate">{section.section_title}</span>
      </nav>

      {/* Orientação pedagógica — banner */}
      <div className="rounded-2xl bg-[#f0faf0] border border-[#c8e6c9] p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#4CAF50] flex items-center justify-center">
            <span className="text-white text-lg leading-none">✦</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[#4CAF50] font-semibold mb-1">
              Orientação pedagógica — {section.section_title}
            </p>
            <p className="text-sm text-[#1F2937] leading-relaxed">{guidance.objective}</p>
          </div>
        </div>
      </div>

      {/* Layout 2 colunas: editor + painel */}
      <div className="flex gap-6 items-start">

        {/* ── Coluna principal: editor ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Cabeçalho da seção */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-[#6B7280] mb-1">
                Seção {section.section_order}
              </p>
              <h1 className="text-2xl font-bold text-[#1F2937]">{section.section_title}</h1>
              {section.section_description && (
                <p className="text-sm text-[#6B7280] mt-1">{section.section_description}</p>
              )}
            </div>
            <Badge variant={sl.variant}>{sl.text}</Badge>
          </div>

          {/* Perguntas norteadoras */}
          <Card className="bg-[#fffdf5] border border-[#fce9b0]">
            <p className="text-xs font-semibold text-[#F2C94C] uppercase tracking-widest mb-3">
              Perguntas norteadoras
            </p>
            <ul className="space-y-2">
              {guidance.guidingQuestions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#1F2937]">
                  <span className="text-[#F2C94C] font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Editor de texto */}
          <Card>
            {query.saved === "1" && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Texto da seção salvo com sucesso.
              </div>
            )}

            <form action={handleSave} className="space-y-4">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <label
                  htmlFor="content"
                  className="text-sm font-semibold text-[#1F2937]"
                >
                  Texto da seção
                </label>
                {canManageStatuses ? (
                  <select
                    name="status"
                    defaultValue={section.status}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                  >
                    <option value="nao_iniciado">Não iniciada</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluída</option>
                  </select>
                ) : (
                  <p className="text-xs text-[#6B7280]">
                    Status definido por orientadores e coordenação.
                  </p>
                )}
              </div>

              <textarea
                id="content"
                name="content"
                defaultValue={section.content ?? ""}
                rows={18}
                placeholder={`Escreva aqui o texto da seção "${section.section_title}"…\n\nDica: ${guidance.howToWrite}`}
                className="w-full rounded-xl border border-gray-200 bg-[#fafaf9] px-4 py-3 text-sm text-[#1F2937] placeholder:text-gray-400 focus:border-[#4CAF50] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30 leading-relaxed resize-y"
              />

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-[#6B7280]">
                  {section.updated_at
                    ? `Atualizada em ${formatDate(section.updated_at)}`
                    : "Ainda não salva"}
                </p>
                <button
                  type="submit"
                  className="rounded-xl bg-[#4CAF50] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#43A047] transition-colors"
                >
                  Salvar seção
                </button>
              </div>
            </form>
          </Card>

          {/* Navegação entre seções */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {prevSection ? (
              <Link
                href={`/groups/${id}/project/sections/${prevSection.id}`}
                className="flex items-center gap-1 text-sm text-[#4CAF50] hover:underline"
              >
                ← {prevSection.section_title}
              </Link>
            ) : (
              <span />
            )}
            {nextSection ? (
              <Link
                href={`/groups/${id}/project/sections/${nextSection.id}`}
                className="flex items-center gap-1 text-sm text-[#4CAF50] hover:underline"
              >
                {nextSection.section_title} →
              </Link>
            ) : (
              <Link
                href={`/groups/${id}/project/preview`}
                className="flex items-center gap-1 text-sm text-[#2F80ED] hover:underline"
              >
                Ver preview completo →
              </Link>
            )}
          </div>
        </div>

        {/* ── Painel lateral direito ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0 sticky top-4">

          {/* PRÓXIMOS PASSOS */}
          <div className="rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-[#4CAF50] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Próximos passos
              </p>
            </div>
            <div className="p-4">
              {nextSteps.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Nenhum próximo passo definido para esta seção.</p>
              ) : (
                <ul className="space-y-2">
                  {nextSteps.map((ns) => (
                    <li key={String(ns.id)} className="flex gap-2 text-sm text-[#1F2937]">
                      <span className="text-[#4CAF50] mt-0.5 flex-shrink-0">•</span>
                      <span>{ns.next_steps}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* COMENTÁRIOS */}
          <div className="rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-[#2F80ED] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Comentários
              </p>
            </div>
            <div className="p-4">
              {comments.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Nenhum comentário do orientador para esta seção.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={String(c.id)} className="text-sm">
                      <p className="font-semibold text-[#1F2937] text-xs mb-0.5">
                        {c.author_name}
                        <span className="ml-1 font-normal text-[#6B7280]">
                          {formatDate(c.created_at)}
                        </span>
                      </p>
                      <p className="text-[#374151] leading-relaxed">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ORIENTAÇÕES */}
          <div className="rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-[#F2C94C] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1F2937]">
                Orientações
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-[#1F2937] mb-2">
                Como escrever {section.section_title.toLowerCase()}
              </p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {guidance.howToWrite}
              </p>
            </div>
          </div>

          {shouldShowThemeTitleGuidance ? (
            <div className="rounded-2xl bg-[#F5F9FF] shadow-md border border-[#DBEAFE] overflow-hidden">
              <div className="bg-[#2F80ED] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-white">
                  Dica
                </p>
              </div>
              <div className="p-4 space-y-2 text-sm text-[#1F2937] leading-relaxed">
                <p className="text-xs font-semibold text-[#2F80ED] uppercase tracking-widest">
                  Tema primeiro, título depois
                </p>
                <p>
                  <strong>Tema</strong> é o assunto ou a questão que o grupo quer investigar.
                </p>
                <p>
                  <strong>Título</strong> é o nome que o projeto pode ganhar mais tarde, quando a ideia estiver mais clara.
                </p>
                <p className="text-[#4B5563]">
                  Nesta etapa, o mais importante é entender sobre o que vocês querem pesquisar e por que isso importa.
                  Não precisa sair daqui com o título pronto.
                </p>
              </div>
            </div>
          ) : null}

          {/* Link para todos os comentários */}
          <Link
            href={`/groups/${id}/comments`}
            className="text-xs text-center text-[#4CAF50] hover:underline"
          >
            Ver todos os comentários →
          </Link>
        </aside>
      </div>
    </div>
  );
}
