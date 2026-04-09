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
import { fetchGroupById } from "@/services/group-service";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import type { ProjectSectionStatus } from "@/types/project-section";

interface GroupProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    section_status?: string;
    section_id?: string;
    comment_status?: string;
    comment_section?: string;
    question_status?: string;
    question_section?: string;
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

  let sections = [] as Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>>;
  let sectionsError: string | null = null;
  let comments = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionComments>>;
  let commentsError: string | null = null;
  let questions = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionQuestions>>;
  let questionsError: string | null = null;

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
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
