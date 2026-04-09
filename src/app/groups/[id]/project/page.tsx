import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureGroupProjectSectionsStructure, updateGroupProjectSection } from "@/services/project-section-service";
import {
  createProjectSectionComment,
  fetchGroupProjectSectionComments,
} from "@/services/project-section-comment-service";
import {
  createProjectSectionQuestion,
  fetchGroupProjectSectionQuestions,
} from "@/services/project-section-question-service";
import {
  createProjectSectionQuestionAnswer,
  fetchGroupProjectSectionQuestionAnswers,
} from "@/services/project-section-question-answer-service";
import {
  createProjectSectionNextStep,
  fetchGroupProjectSectionNextSteps,
} from "@/services/project-section-next-step-service";
import {
  createProjectDevelopmentChecklistItem,
  fetchGroupProjectDevelopmentChecklistItems,
  updateProjectDevelopmentChecklistItemStatus,
} from "@/services/project-development-checklist-service";
import { fetchGroupById } from "@/services/group-service";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import type { ProjectSectionStatus } from "@/types/project-section";
import type { ProjectDevelopmentChecklistStatus } from "@/types/project-development-checklist-item";

interface GroupProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    section_status?: string;
    section_id?: string;
    comment_status?: string;
    comment_section?: string;
    question_status?: string;
    question_section?: string;
    answer_status?: string;
    answer_question?: string;
    next_step_status?: string;
    next_step_section?: string;
    checklist_status?: string;
    checklist_action?: string;
    checklist_item?: string;
  }>;
}

function getStatusLabel(status: ProjectSectionStatus) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluido") return "Concluída";
  return "Não iniciada";
}

export default async function GroupProjectPage({ params, searchParams }: GroupProjectPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const profile = await getAuthenticatedProfile();
  const canCommentAsAdvisor = profile?.role === "advisor" || profile?.role === "coordinator";
  const canAnswerAsAdvisor = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageChecklist = profile?.role === "advisor" || profile?.role === "coordinator";
  const canAskAsStudent = profile?.role === "student";

  const group = await fetchGroupById(id);
  if (!group) {
    notFound();
  }

  async function handleUpdateSection(formData: FormData) {
    "use server";

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const rawStatus = String(formData.get("status") ?? "nao_iniciado").trim();

    const allowed: ProjectSectionStatus[] = ["nao_iniciado", "em_andamento", "concluido"];
    const status = allowed.includes(rawStatus as ProjectSectionStatus)
      ? (rawStatus as ProjectSectionStatus)
      : "nao_iniciado";

    if (!sectionId) {
      redirect(`/groups/${id}/project?section_status=error`);
    }

    try {
      await updateGroupProjectSection(sectionId, {
        content: content || null,
        status,
      });
    } catch {
      redirect(`/groups/${id}/project?section_status=error&section_id=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    redirect(`/groups/${id}/project?section_status=success&section_id=${sectionId}`);
  }

  async function handleAddSectionComment(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?comment_status=forbidden`);
    }

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();

    if (!sectionId || comment.length < 3) {
      redirect(`/groups/${id}/project?comment_status=invalid&comment_section=${sectionId}`);
    }

    try {
      await createProjectSectionComment({
        group_id: id,
        section_id: sectionId,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
        comment,
      });
    } catch {
      redirect(`/groups/${id}/project?comment_status=error&comment_section=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?comment_status=success&comment_section=${sectionId}`);
  }

  async function handleAddSectionQuestion(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || authenticatedProfile.role !== "student") {
      redirect(`/groups/${id}/project?question_status=forbidden`);
    }

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const question = String(formData.get("question") ?? "").trim();

    if (!sectionId || question.length < 3) {
      redirect(`/groups/${id}/project?question_status=invalid&question_section=${sectionId}`);
    }

    try {
      await createProjectSectionQuestion({
        group_id: id,
        section_id: sectionId,
        author_profile_id: authenticatedProfile.id,
        author_role: "student",
        author_name: authenticatedProfile.name,
        question,
      });
    } catch {
      redirect(`/groups/${id}/project?question_status=error&question_section=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?question_status=success&question_section=${sectionId}`);
  }

  async function handleAddQuestionAnswer(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?answer_status=forbidden`);
    }

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const questionId = String(formData.get("question_id") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();

    if (!sectionId || !questionId || answer.length < 3) {
      redirect(`/groups/${id}/project?answer_status=invalid&answer_question=${questionId}`);
    }

    try {
      await createProjectSectionQuestionAnswer({
        group_id: id,
        section_id: sectionId,
        question_id: questionId,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
        answer,
      });
    } catch {
      redirect(`/groups/${id}/project?answer_status=error&answer_question=${questionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?answer_status=success&answer_question=${questionId}`);
  }

  async function handleAddSectionNextStep(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?next_step_status=forbidden`);
    }

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const nextSteps = String(formData.get("next_steps") ?? "").trim();

    if (!sectionId || nextSteps.length < 3) {
      redirect(`/groups/${id}/project?next_step_status=invalid&next_step_section=${sectionId}`);
    }

    try {
      await createProjectSectionNextStep({
        group_id: id,
        section_id: sectionId,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
        next_steps: nextSteps,
      });
    } catch {
      redirect(`/groups/${id}/project?next_step_status=error&next_step_section=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?next_step_status=success&next_step_section=${sectionId}`);
  }

  async function handleAddChecklistItem(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?checklist_status=forbidden&checklist_action=add`);
    }

    const itemText = String(formData.get("item_text") ?? "").trim();
    const sectionIdRaw = String(formData.get("section_id") ?? "").trim();
    const sectionId = sectionIdRaw ? sectionIdRaw : null;

    if (itemText.length < 3) {
      redirect(`/groups/${id}/project?checklist_status=invalid&checklist_action=add`);
    }

    try {
      await createProjectDevelopmentChecklistItem({
        group_id: id,
        section_id: sectionId,
        item_text: itemText,
        created_by_profile_id: authenticatedProfile.id,
        created_by_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        created_by_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?checklist_status=error&checklist_action=add`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?checklist_status=success&checklist_action=add`);
  }

  async function handleToggleChecklistItemStatus(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?checklist_status=forbidden&checklist_action=toggle`);
    }

    const itemId = String(formData.get("item_id") ?? "").trim();
    const rawStatus = String(formData.get("next_status") ?? "").trim();
    const allowed: ProjectDevelopmentChecklistStatus[] = ["pendente", "concluido"];
    const nextStatus = allowed.includes(rawStatus as ProjectDevelopmentChecklistStatus)
      ? (rawStatus as ProjectDevelopmentChecklistStatus)
      : null;

    if (!itemId || !nextStatus) {
      redirect(`/groups/${id}/project?checklist_status=invalid&checklist_action=toggle&checklist_item=${itemId}`);
    }

    try {
      await updateProjectDevelopmentChecklistItemStatus(itemId, nextStatus);
    } catch {
      redirect(`/groups/${id}/project?checklist_status=error&checklist_action=toggle&checklist_item=${itemId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?checklist_status=success&checklist_action=toggle&checklist_item=${itemId}`);
  }

  let sections = [] as Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>>;
  let sectionsError: string | null = null;
  let comments = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionComments>>;
  let commentsError: string | null = null;
  let questions = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionQuestions>>;
  let questionsError: string | null = null;
  let answers = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionQuestionAnswers>>;
  let answersError: string | null = null;
  let nextSteps = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionNextSteps>>;
  let nextStepsError: string | null = null;
  let checklistItems = [] as Awaited<ReturnType<typeof fetchGroupProjectDevelopmentChecklistItems>>;
  let checklistError: string | null = null;

  try {
    sections = await ensureGroupProjectSectionsStructure(id);
  } catch (error) {
    sectionsError = error instanceof Error ? error.message : "Erro ao carregar seções do projeto.";
  }

  try {
    comments = await fetchGroupProjectSectionComments(id);
  } catch (error) {
    commentsError = error instanceof Error ? error.message : "Erro ao carregar comentários das seções.";
  }

  try {
    questions = await fetchGroupProjectSectionQuestions(id);
  } catch (error) {
    questionsError = error instanceof Error ? error.message : "Erro ao carregar dúvidas das seções.";
  }

  try {
    answers = await fetchGroupProjectSectionQuestionAnswers(id);
  } catch (error) {
    answersError = error instanceof Error ? error.message : "Erro ao carregar respostas das dúvidas.";
  }

  try {
    nextSteps = await fetchGroupProjectSectionNextSteps(id);
  } catch (error) {
    nextStepsError = error instanceof Error ? error.message : "Erro ao carregar próximos passos.";
  }

  try {
    checklistItems = await fetchGroupProjectDevelopmentChecklistItems(id);
  } catch (error) {
    checklistError = error instanceof Error ? error.message : "Erro ao carregar checklist de desenvolvimento.";
  }

  const commentsBySection = new Map<string, typeof comments>();
  for (const comment of comments) {
    const key = String(comment.section_id);
    const list = commentsBySection.get(key) ?? [];
    list.push(comment);
    commentsBySection.set(key, list);
  }

  const questionsBySection = new Map<string, typeof questions>();
  for (const question of questions) {
    const key = String(question.section_id);
    const list = questionsBySection.get(key) ?? [];
    list.push(question);
    questionsBySection.set(key, list);
  }

  const answersByQuestion = new Map<string, typeof answers>();
  for (const answer of answers) {
    const key = String(answer.question_id);
    const list = answersByQuestion.get(key) ?? [];
    list.push(answer);
    answersByQuestion.set(key, list);
  }

  const nextStepsBySection = new Map<string, typeof nextSteps>();
  for (const nextStep of nextSteps) {
    const key = String(nextStep.section_id);
    const list = nextStepsBySection.get(key) ?? [];
    list.push(nextStep);
    nextStepsBySection.set(key, list);
  }

  const sectionTitleById = new Map<string, string>();
  for (const section of sections) {
    sectionTitleById.set(String(section.id), `${section.section_order}. ${section.section_title}`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <Link href={`/groups/${id}`} className="text-blue-600 hover:underline text-sm">
            ← Voltar para detalhe do grupo
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Projeto por seções</h1>
          <p className="text-gray-600 mt-1">Grupo: {group.theme || group.member_1_name}</p>
        </header>

        {sectionsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente das seções do projeto</p>
            <p className="text-amber-800 text-sm mt-1">{sectionsError}</p>
          </div>
        )}

        {commentsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente dos comentários por seção</p>
            <p className="text-amber-800 text-sm mt-1">{commentsError}</p>
          </div>
        )}

        {questionsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente das dúvidas por seção</p>
            <p className="text-amber-800 text-sm mt-1">{questionsError}</p>
          </div>
        )}

        {answersError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente das respostas às dúvidas</p>
            <p className="text-amber-800 text-sm mt-1">{answersError}</p>
          </div>
        )}

        {nextStepsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente dos próximos passos por seção</p>
            <p className="text-amber-800 text-sm mt-1">{nextStepsError}</p>
          </div>
        )}

        {checklistError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do checklist de desenvolvimento</p>
            <p className="text-amber-800 text-sm mt-1">{checklistError}</p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Checklist de desenvolvimento</h2>

          {query.checklist_status === "success" && query.checklist_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Item adicionado ao checklist com sucesso.
            </p>
          )}
          {query.checklist_status === "success" && query.checklist_action === "toggle" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Status do item atualizado com sucesso.
            </p>
          )}
          {query.checklist_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos no checklist. Revise os campos e tente novamente.
            </p>
          )}
          {query.checklist_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível salvar alterações no checklist. Tente novamente.
            </p>
          )}
          {query.checklist_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Apenas orientadores (ou coordenação) podem alterar o checklist nesta etapa.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {checklistItems.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há itens no checklist deste grupo.</p>
            ) : (
              checklistItems.map((item) => (
                <div
                  key={String(item.id)}
                  className={`border rounded-md px-3 py-2 ${
                    item.status === "concluido" ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm ${item.status === "concluido" ? "text-green-900" : "text-gray-900"}`}>
                        {item.item_text}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.created_by_name} ({item.created_by_role === "advisor" ? "orientador" : "coordenação"})
                        {item.section_id ? ` • ${sectionTitleById.get(String(item.section_id)) || "Seção"}` : " • Geral"}
                        {item.created_at
                          ? ` • ${new Date(item.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          item.status === "concluido"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status === "concluido" ? "Concluído" : "Pendente"}
                      </span>

                      {canManageChecklist && (
                        <form action={handleToggleChecklistItemStatus}>
                          <input type="hidden" name="item_id" value={String(item.id)} />
                          <input
                            type="hidden"
                            name="next_status"
                            value={item.status === "concluido" ? "pendente" : "concluido"}
                          />
                          <button
                            type="submit"
                            className="text-xs font-medium px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                          >
                            {item.status === "concluido" ? "Reabrir" : "Concluir"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {canManageChecklist && (
            <form action={handleAddChecklistItem} className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label htmlFor="checklist-item-text" className="block text-sm text-gray-700 mb-1">
                  Novo item
                </label>
                <textarea
                  id="checklist-item-text"
                  name="item_text"
                  rows={3}
                  placeholder="Ex.: Revisar introdução e inserir referências bibliográficas da seção 1."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="checklist-section-id" className="block text-sm text-gray-700 mb-1">
                  Seção relacionada (opcional)
                </label>
                <select
                  id="checklist-section-id"
                  name="section_id"
                  defaultValue=""
                  className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Geral (sem seção específica)</option>
                  {sections.map((section) => (
                    <option key={String(section.id)} value={String(section.id)}>
                      {section.section_order}. {section.section_title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Adicionar item ao checklist
              </button>
            </form>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <p className="text-gray-600">Nenhuma seção disponível para edição ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <article key={String(section.id)} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {section.section_order}. {section.section_title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.section_description || "Sem descrição"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      section.status === "concluido"
                        ? "bg-green-100 text-green-700"
                        : section.status === "em_andamento"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {getStatusLabel(section.status)}
                  </span>
                </div>

                {query.section_status === "success" && query.section_id === String(section.id) && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                    Seção atualizada com sucesso.
                  </p>
                )}
                {query.section_status === "error" && (!query.section_id || query.section_id === String(section.id)) && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                    Não foi possível atualizar esta seção. Tente novamente.
                  </p>
                )}

                <form action={handleUpdateSection} className="space-y-3">
                  <input type="hidden" name="section_id" value={String(section.id)} />

                  <div>
                    <label htmlFor={`status-${section.id}`} className="block text-sm text-gray-700 mb-1">
                      Status da seção
                    </label>
                    <select
                      id={`status-${section.id}`}
                      name="status"
                      defaultValue={section.status}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="nao_iniciado">Não iniciada</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluída</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`content-${section.id}`} className="block text-sm text-gray-700 mb-1">
                      Conteúdo da seção
                    </label>
                    <textarea
                      id={`content-${section.id}`}
                      name="content"
                      rows={6}
                      defaultValue={section.content || ""}
                      placeholder="Escreva aqui o conteúdo desta seção..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                  >
                    Salvar seção
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Dúvidas dos estudantes</h3>

                  {query.question_status === "success" && query.question_section === String(section.id) && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                      Dúvida registrada com sucesso.
                    </p>
                  )}
                  {query.question_status === "invalid" && query.question_section === String(section.id) && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Dúvida inválida. Escreva ao menos 3 caracteres.
                    </p>
                  )}
                  {query.question_status === "error" && query.question_section === String(section.id) && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Não foi possível salvar a dúvida. Tente novamente.
                    </p>
                  )}
                  {query.question_status === "forbidden" && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Apenas estudantes podem registrar dúvidas nesta etapa.
                    </p>
                  )}

                  <div className="space-y-2 mb-3">
                    {(questionsBySection.get(String(section.id)) || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Ainda não há dúvidas registradas nesta seção.</p>
                    ) : (
                      (questionsBySection.get(String(section.id)) || []).map((question) => (
                        <div key={String(question.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                          <p className="text-sm text-gray-900">{question.question}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {question.author_name} (estudante)
                            {question.created_at
                              ? ` • ${new Date(question.created_at).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </p>

                          <div className="mt-3 pl-3 border-l-2 border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Respostas à dúvida</p>

                            {query.answer_status === "success" && query.answer_question === String(question.id) && (
                              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-2">
                                Resposta registrada com sucesso.
                              </p>
                            )}
                            {query.answer_status === "invalid" && query.answer_question === String(question.id) && (
                              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
                                Resposta inválida. Escreva ao menos 3 caracteres.
                              </p>
                            )}
                            {query.answer_status === "error" && query.answer_question === String(question.id) && (
                              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
                                Não foi possível salvar a resposta. Tente novamente.
                              </p>
                            )}
                            {query.answer_status === "forbidden" && (
                              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
                                Apenas orientadores (ou coordenação) podem responder dúvidas nesta etapa.
                              </p>
                            )}

                            <div className="space-y-2 mb-2">
                              {(answersByQuestion.get(String(question.id)) || []).length === 0 ? (
                                <p className="text-sm text-gray-500">Nenhuma resposta registrada ainda.</p>
                              ) : (
                                (answersByQuestion.get(String(question.id)) || []).map((answer) => (
                                  <div key={String(answer.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-white">
                                    <p className="text-sm text-gray-900">{answer.answer}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {answer.author_name} ({answer.author_role === "advisor" ? "orientador" : "coordenação"})
                                      {answer.created_at
                                        ? ` • ${new Date(answer.created_at).toLocaleString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}`
                                        : ""}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>

                            {canAnswerAsAdvisor && (
                              <form action={handleAddQuestionAnswer} className="space-y-2">
                                <input type="hidden" name="section_id" value={String(section.id)} />
                                <input type="hidden" name="question_id" value={String(question.id)} />
                                <textarea
                                  name="answer"
                                  rows={3}
                                  placeholder="Responder dúvida do estudante..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                  type="submit"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-2 rounded-md text-sm"
                                >
                                  Enviar resposta
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {canAskAsStudent && (
                    <form action={handleAddSectionQuestion} className="space-y-2">
                      <input type="hidden" name="section_id" value={String(section.id)} />
                      <textarea
                        name="question"
                        rows={3}
                        placeholder="Descreva sua dúvida sobre esta seção..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="submit"
                        className="bg-sky-600 hover:bg-sky-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                      >
                        Enviar dúvida
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Comentários do orientador</h3>

                  {query.comment_status === "success" && query.comment_section === String(section.id) && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                      Comentário registrado com sucesso.
                    </p>
                  )}
                  {query.comment_status === "invalid" && query.comment_section === String(section.id) && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Comentário inválido. Escreva ao menos 3 caracteres.
                    </p>
                  )}
                  {query.comment_status === "error" && query.comment_section === String(section.id) && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Não foi possível salvar o comentário. Tente novamente.
                    </p>
                  )}
                  {query.comment_status === "forbidden" && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Apenas orientadores (ou coordenação) podem registrar comentários nesta etapa.
                    </p>
                  )}

                  <div className="space-y-2 mb-3">
                    {(commentsBySection.get(String(section.id)) || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Ainda não há comentários nesta seção.</p>
                    ) : (
                      (commentsBySection.get(String(section.id)) || []).map((comment) => (
                        <div key={String(comment.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                          <p className="text-sm text-gray-900">{comment.comment}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {comment.author_name} ({comment.author_role === "advisor" ? "orientador" : "coordenação"})
                            {comment.created_at
                              ? ` • ${new Date(comment.created_at).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {canCommentAsAdvisor && (
                    <form action={handleAddSectionComment} className="space-y-2">
                      <input type="hidden" name="section_id" value={String(section.id)} />
                      <textarea
                        name="comment"
                        rows={3}
                        placeholder="Registrar comentário orientativo sobre esta seção..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                      >
                        Adicionar comentário
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Próximos passos</h3>

                  {query.next_step_status === "success" && query.next_step_section === String(section.id) && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                      Próximos passos registrados com sucesso.
                    </p>
                  )}
                  {query.next_step_status === "invalid" && query.next_step_section === String(section.id) && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Texto inválido. Escreva ao menos 3 caracteres.
                    </p>
                  )}
                  {query.next_step_status === "error" && query.next_step_section === String(section.id) && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Não foi possível salvar os próximos passos. Tente novamente.
                    </p>
                  )}
                  {query.next_step_status === "forbidden" && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      Apenas orientadores (ou coordenação) podem registrar próximos passos nesta etapa.
                    </p>
                  )}

                  <div className="space-y-2 mb-3">
                    {(nextStepsBySection.get(String(section.id)) || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Ainda não há próximos passos registrados nesta seção.</p>
                    ) : (
                      (nextStepsBySection.get(String(section.id)) || []).map((nextStep) => (
                        <div key={String(nextStep.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                          <p className="text-sm text-gray-900 whitespace-pre-line">{nextStep.next_steps}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {nextStep.author_name} ({nextStep.author_role === "advisor" ? "orientador" : "coordenação"})
                            {nextStep.created_at
                              ? ` • ${new Date(nextStep.created_at).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {canAnswerAsAdvisor && (
                    <form action={handleAddSectionNextStep} className="space-y-2">
                      <input type="hidden" name="section_id" value={String(section.id)} />
                      <textarea
                        name="next_steps"
                        rows={3}
                        placeholder="Registrar próximos passos orientados para esta seção..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        type="submit"
                        className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                      >
                        Registrar próximos passos
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
