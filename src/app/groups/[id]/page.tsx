import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { requireGroupAccess } from "@/services/group-access-service";
import {
  addStudentToGroup,
  respondAdvisorIndication,
  updateGroupAdvisors,
  updateGroupStatus,
  fetchAllGroups,
} from "@/services/group-service";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchAllStudents } from "@/services/student-service";
import { ensureGroupProjectSectionsStructure, updateGroupProjectSection } from "@/services/project-section-service";
import {
  createProjectSectionComment,
  fetchGroupProjectSectionComments,
} from "@/services/project-section-comment-service";
import {
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
  createProjectSectionVersion,
  fetchGroupProjectSectionVersions,
} from "@/services/project-section-version-service";
import {
  fetchGroupProjectSectionStageSchedule,
  upsertProjectSectionStageSchedule,
} from "@/services/project-section-stage-schedule-service";
import { resolveDisplayedGroupTheme } from "@/lib/utils/group-theme-label";
import type { Student } from "@/types/student";
import type { GroupStatus } from "@/types/group";
import type { ProjectSectionStatus } from "@/types/project-section";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function getProjectSectionStatusLabel(status: string) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluido") return "Concluída";
  return "Não iniciada";
}

type SectionPedagogicalGuidance = {
  objective: string;
  guidingQuestions: string[];
  expectedEvidence: string;
};

function getSectionPedagogicalGuidance(sectionKey: string): SectionPedagogicalGuidance {
  const guidanceBySectionKey: Record<string, SectionPedagogicalGuidance> = {
    tema_contexto: {
      objective:
        "Apresentar o tema escolhido, o contexto do território e a relevância inicial da investigação para a comunidade escolar.",
      guidingQuestions: [
        "Qual tema o grupo escolheu e por que ele importa no território?",
        "Que situação concreta da escola, bairro ou comunidade motivou o projeto?",
        "Quais vozes, experiências ou observações ajudam a contextualizar esse recorte?",
      ],
      expectedEvidence: "Registros do contexto, observações iniciais do território e justificativa da escolha do tema em linguagem autoral.",
    },
    problema_justificativa: {
      objective:
        "Definir com clareza o problema investigado e explicar por que enfrentá-lo é pedagogicamente e socialmente relevante.",
      guidingQuestions: [
        "Qual problema social, cultural, ambiental ou comunitário está sendo investigado?",
        "Quem é afetado por esse problema e de que forma?",
        "Por que vale a pena investigar esse problema no contexto do TCA?",
      ],
      expectedEvidence: "Problema formulado com clareza, justificativa consistente e relação explícita com a realidade do território.",
    },
    objetivos: {
      objective:
        "Transformar o problema em um objetivo geral e em objetivos específicos que orientem a pesquisa e a ação do grupo.",
      guidingQuestions: [
        "O que o grupo pretende compreender, analisar ou transformar com este projeto?",
        "Quais etapas práticas precisam acontecer para alcançar o objetivo geral?",
        "Os objetivos estão claros, viáveis e coerentes com o problema investigado?",
      ],
      expectedEvidence: "Objetivo geral objetivo, objetivos específicos acionáveis e coerência entre problema, investigação e proposta final.",
    },
    metodologia_plano: {
      objective:
        "Descrever como o grupo vai investigar o tema, organizar o percurso e distribuir responsabilidades ao longo do TCA.",
      guidingQuestions: [
        "Quais estratégias de pesquisa o grupo vai utilizar?",
        "Como as tarefas serão divididas entre os integrantes?",
        "Que recursos, fontes e prazos são necessários para executar o plano?",
      ],
      expectedEvidence: "Plano de investigação, divisão de responsabilidades, recursos previstos e sequência de ações com lógica clara.",
    },
    desenvolvimento_registros: {
      objective:
        "Registrar o percurso investigativo, os aprendizados, as revisões de rota e as evidências produzidas pelo grupo.",
      guidingQuestions: [
        "O que o grupo fez até aqui e o que aprendeu no processo?",
        "Que evidências mostram o avanço da investigação?",
        "Quais ajustes foram necessários ao longo do percurso?",
      ],
      expectedEvidence: "Síntese do processo com registros, análises, aprendizados, revisões e evidências concretas do percurso.",
    },
    resultado_produto_final: {
      objective:
        "Apresentar os resultados alcançados, o produto final construído e o potencial de transformação social do projeto.",
      guidingQuestions: [
        "Quais resultados o grupo alcançou com a investigação?",
        "Como o produto final dialoga com o problema inicial?",
        "Que impacto ou continuidade esse trabalho pode gerar?",
      ],
      expectedEvidence: "Resultados sintetizados, produto final descrito com clareza e relação explícita com a proposta de transformação.",
    },
  };

  return guidanceBySectionKey[sectionKey] || {
    objective: "Explicitar o propósito desta parte do projeto e o que o grupo precisa comunicar com clareza e autoria.",
    guidingQuestions: [
      "O que esta seção precisa mostrar para quem lê o projeto?",
      "Que evidências ou argumentos fortalecem esta parte do trabalho?",
      "Como o grupo pode escrever este trecho com mais clareza e autoria?",
    ],
    expectedEvidence: "Conteúdo coerente com o objetivo da seção, em linguagem autoral e com evidências do processo investigativo.",
  };
}

function renderMemberCard(
  name: string,
  series: string | null
) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0 flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-600" aria-hidden="true" />
        <span className="truncate font-medium text-gray-900">{name}</span>
      </div>
      <span className="shrink-0 text-xs text-gray-500">{series || "Série não informada"}</span>
    </li>
  );
}

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    indication_response?: string;
    advisor_error?: string;
    member_status?: string;
    section_status?: string;
    section_id?: string;
    comment_status?: string;
    comment_section?: string;
    answer_status?: string;
    answer_question?: string;
    next_step_status?: string;
    next_step_section?: string;
    schedule_status?: string;
    schedule_section?: string;
  }>;
}

/**
 * Página de detalhe de um grupo.
 *
 * Permite visualizar todos os dados do grupo e associar orientadores
 * via seletor com os orientadores cadastrados no sistema.
 */
export default async function GroupDetailPage({ params, searchParams }: GroupDetailPageProps) {
  const { id } = await params;
  const {
    indication_response,
    advisor_error,
    member_status,
    section_status,
    section_id,
    comment_status,
    comment_section,
    answer_status,
    answer_question,
    next_step_status,
    next_step_section,
    schedule_status,
    schedule_section,
  } = await searchParams;
  const { group, profile } = await requireGroupAccess(id);
  const isStudentView = profile?.role === "student";
  const canManageStatuses = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageMembers = profile?.role === "coordinator";
  const canManageProjectSections = profile?.role === "advisor" || profile?.role === "coordinator";

  async function handleAssignAdvisors(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}`);
    }

    const primaryAdvisorId = String(formData.get("primary_advisor_id") ?? "").trim() || null;
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    try {
      await updateGroupAdvisors(id, primaryAdvisorId, coAdvisorId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("indisponível") || message.includes("limite")) {
        redirect(`/groups/${id}?advisor_error=unavailable`);
      }
      redirect(`/groups/${id}?advisor_error=save`);
    }

    revalidatePath(`/groups/${id}`);
    redirect(`/groups/${id}`);
  }

  async function handleUpdateStatus(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}`);
    }

    const rawStatus = String(formData.get("status") ?? "planejamento").trim();
    const validStatus: GroupStatus[] = ["planejamento", "em_andamento", "concluido"];
    const status = validStatus.includes(rawStatus as GroupStatus)
      ? (rawStatus as GroupStatus)
      : "planejamento";

    await updateGroupStatus(id, status);

    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    redirect(`/groups/${id}`);
  }

  async function handleRespondAdvisorIndication(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}`);
    }

    const decision = String(formData.get("decision") ?? "").trim();
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    if (decision !== "aceita" && decision !== "recusada") {
      redirect(`/groups/${id}`);
    }

    try {
      await respondAdvisorIndication(id, decision, coAdvisorId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("indisponível") || message.includes("limite")) {
        redirect(`/groups/${id}?indication_response=unavailable`);
      }
      if (message.includes("coorientador") && message.includes("mesmo")) {
        redirect(`/groups/${id}?indication_response=invalid_co`);
      }
      redirect(`/groups/${id}?indication_response=error`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    redirect(`/groups/${id}?indication_response=${decision}`);
  }

  async function handleAddMember(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}`);
    }

    const studentId = String(formData.get("student_id") ?? "").trim();

    if (!studentId) {
      redirect(`/groups/${id}?member_status=invalid`);
    }

    try {
      await addStudentToGroup(id, studentId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";

      if (message.includes("5 integrantes")) {
        redirect(`/groups/${id}?member_status=full`);
      }

      if (message.includes("outro grupo")) {
        redirect(`/groups/${id}?member_status=linked`);
      }

      if (message.includes("já faz parte")) {
        redirect(`/groups/${id}?member_status=duplicate`);
      }

      redirect(`/groups/${id}?member_status=error`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    revalidatePath("/coordinator/dashboard");
    redirect(`/groups/${id}?member_status=success`);
  }

  async function handleUpdateProjectSection(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}`);
    }

    const targetSectionId = String(formData.get("section_id") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!targetSectionId) {
      redirect(`/groups/${id}?section_status=error`);
    }

    const latestSections = await ensureGroupProjectSectionsStructure(id).catch(() => []);
    const latestSection = latestSections.find((section) => String(section.id) === targetSectionId);
    const rawStatus = String(formData.get("status") ?? latestSection?.status ?? "nao_iniciado").trim();
    const allowed: ProjectSectionStatus[] = ["nao_iniciado", "em_andamento", "concluido"];
    const status = allowed.includes(rawStatus as ProjectSectionStatus)
      ? (rawStatus as ProjectSectionStatus)
      : (latestSection?.status ?? "nao_iniciado");

    try {
      await updateGroupProjectSection(targetSectionId, {
        content: content || null,
        status,
      });

      await createProjectSectionVersion({
        group_id: id,
        section_id: targetSectionId,
        content: content || null,
        status,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}?section_status=error&section_id=${targetSectionId}`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}?section_status=success&section_id=${targetSectionId}`);
  }

  async function handleUpsertSectionSchedule(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}?schedule_status=forbidden`);
    }

    const targetSectionId = String(formData.get("section_id") ?? "").trim();
    const dueDate = String(formData.get("due_date") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;

    if (!targetSectionId || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      redirect(`/groups/${id}?schedule_status=invalid&schedule_section=${targetSectionId}`);
    }

    try {
      await upsertProjectSectionStageSchedule({
        group_id: id,
        section_id: targetSectionId,
        due_date: dueDate,
        notes,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}?schedule_status=error&schedule_section=${targetSectionId}`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}?schedule_status=success&schedule_section=${targetSectionId}`);
  }

  async function handleAddSectionComment(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}?comment_status=forbidden`);
    }

    const targetSectionId = String(formData.get("section_id") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();

    if (!targetSectionId || comment.length < 3) {
      redirect(`/groups/${id}?comment_status=invalid&comment_section=${targetSectionId}`);
    }

    try {
      await createProjectSectionComment({
        group_id: id,
        section_id: targetSectionId,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
        comment,
      });
    } catch {
      redirect(`/groups/${id}?comment_status=error&comment_section=${targetSectionId}`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}?comment_status=success&comment_section=${targetSectionId}`);
  }

  async function handleAddQuestionAnswer(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}?answer_status=forbidden`);
    }

    const targetSectionId = String(formData.get("section_id") ?? "").trim();
    const questionId = String(formData.get("question_id") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();

    if (!targetSectionId || !questionId || answer.length < 3) {
      redirect(`/groups/${id}?answer_status=invalid&answer_question=${questionId}`);
    }

    try {
      await createProjectSectionQuestionAnswer({
        group_id: id,
        section_id: targetSectionId,
        question_id: questionId,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
        answer,
      });
    } catch {
      redirect(`/groups/${id}?answer_status=error&answer_question=${questionId}`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}?answer_status=success&answer_question=${questionId}`);
  }

  async function handleAddSectionNextStep(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}?next_step_status=forbidden`);
    }

    const targetSectionId = String(formData.get("section_id") ?? "").trim();
    const nextSteps = String(formData.get("next_steps") ?? "").trim();

    if (!targetSectionId || nextSteps.length < 3) {
      redirect(`/groups/${id}?next_step_status=invalid&next_step_section=${targetSectionId}`);
    }

    try {
      await createProjectSectionNextStep({
        group_id: id,
        section_id: targetSectionId,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
        next_steps: nextSteps,
      });
    } catch {
      redirect(`/groups/${id}?next_step_status=error&next_step_section=${targetSectionId}`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}?next_step_status=success&next_step_section=${targetSectionId}`);
  }

  // Carrega orientadores para preencher o seletor — falha silenciosa se tabela não existir
  let advisors: Awaited<ReturnType<typeof fetchAllAdvisors>> = [];
  try {
    advisors = await fetchAllAdvisors();
  } catch {
    // sem orientadores cadastrados — seletor ficará vazio
  }

  let students: Student[] = [];
  try {
    students = await fetchAllStudents();
  } catch {
    students = [];
  }

  let allGroups = [] as Awaited<ReturnType<typeof fetchAllGroups>>;
  try {
    allGroups = await fetchAllGroups();
  } catch {
    allGroups = [];
  }

  let projectSections = [] as Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>>;
  let projectSectionsError: string | null = null;
  try {
    projectSections = await ensureGroupProjectSectionsStructure(id);
  } catch (error) {
    projectSectionsError =
      error instanceof Error ? error.message : "Erro desconhecido ao carregar estrutura de seções do projeto.";
  }

  let projectSectionComments = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionComments>>;
  try {
    projectSectionComments = await fetchGroupProjectSectionComments(id);
  } catch {
    projectSectionComments = [];
  }

  let projectSectionQuestions = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionQuestions>>;
  try {
    projectSectionQuestions = await fetchGroupProjectSectionQuestions(id);
  } catch {
    projectSectionQuestions = [];
  }

  let projectSectionAnswers = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionQuestionAnswers>>;
  try {
    projectSectionAnswers = await fetchGroupProjectSectionQuestionAnswers(id);
  } catch {
    projectSectionAnswers = [];
  }

  let projectSectionNextSteps = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionNextSteps>>;
  try {
    projectSectionNextSteps = await fetchGroupProjectSectionNextSteps(id);
  } catch {
    projectSectionNextSteps = [];
  }

  let projectSectionVersions = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionVersions>>;
  try {
    projectSectionVersions = await fetchGroupProjectSectionVersions(id);
  } catch {
    projectSectionVersions = [];
  }

  let projectSectionSchedules = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionStageSchedule>>;
  try {
    projectSectionSchedules = await fetchGroupProjectSectionStageSchedule(id);
  } catch {
    projectSectionSchedules = [];
  }

  // Resolve nome dos orientadores vinculados
  const primaryAdvisor = advisors.find((a) => a.id === group.primary_advisor_id);
  const coAdvisor = advisors.find((a) => a.id === group.co_advisor_id);
  const indicatedAdvisor = advisors.find((a) => idsAreEqual(a.id, group.indicated_advisor_id));

  const currentStatus: GroupStatus =
    group.status === "em_andamento" || group.status === "concluido"
      ? group.status
      : "planejamento";
  const themeSection = projectSections.find((section) => section.section_key === "tema_contexto") ?? null;
  const displayedTheme = resolveDisplayedGroupTheme({
    storedTheme: group.theme,
    themeSectionContent: themeSection?.content ?? null,
  });

  const currentGroupMemberCount = [
    group.member_1_name,
    group.member_2_name,
    group.member_3_name,
    group.member_4_name,
    group.member_5_name,
  ].filter((value) => Boolean(String(value ?? "").trim())).length;
  const studentsWithoutGroup = students.filter((student) => {
    if (student.active === false) {
      return false;
    }

    return !allGroups.some((currentGroup) =>
      [currentGroup.student_1_id, currentGroup.student_2_id, currentGroup.student_3_id, currentGroup.student_4_id, currentGroup.student_5_id]
        .some((value) => String(value ?? "") === String(student.id))
    );
  });

  const commentsBySection = new Map<string, typeof projectSectionComments>();
  for (const comment of projectSectionComments) {
    const key = String(comment.section_id);
    const list = commentsBySection.get(key) ?? [];
    list.push(comment);
    commentsBySection.set(key, list);
  }

  const questionsBySection = new Map<string, typeof projectSectionQuestions>();
  const questionToSectionMap = new Map<string, string>();
  for (const question of projectSectionQuestions) {
    const key = String(question.section_id);
    const list = questionsBySection.get(key) ?? [];
    list.push(question);
    questionsBySection.set(key, list);
    questionToSectionMap.set(String(question.id), key);
  }

  const answersByQuestion = new Map<string, typeof projectSectionAnswers>();
  for (const answer of projectSectionAnswers) {
    const key = String(answer.question_id);
    const list = answersByQuestion.get(key) ?? [];
    list.push(answer);
    answersByQuestion.set(key, list);
  }

  const nextStepsBySection = new Map<string, typeof projectSectionNextSteps>();
  for (const nextStep of projectSectionNextSteps) {
    const key = String(nextStep.section_id);
    const list = nextStepsBySection.get(key) ?? [];
    list.push(nextStep);
    nextStepsBySection.set(key, list);
  }

  const versionsBySection = new Map<string, typeof projectSectionVersions>();
  for (const version of projectSectionVersions) {
    const key = String(version.section_id);
    const list = versionsBySection.get(key) ?? [];
    list.push(version);
    versionsBySection.set(key, list);
  }

  const stageScheduleBySection = new Map<string, (typeof projectSectionSchedules)[number]>();
  for (const schedule of projectSectionSchedules) {
    stageScheduleBySection.set(String(schedule.section_id), schedule);
  }

  const expandedSectionId =
    section_id ||
    comment_section ||
    next_step_section ||
    schedule_section ||
    (answer_question ? questionToSectionMap.get(String(answer_question)) ?? null : null);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-2xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          {!isStudentView && (
            <Link href="/groups" className="text-lime-700 hover:underline text-sm">
              ← Voltar para grupos
            </Link>
          )}
          <h1 className="text-3xl font-bold tca-title-guide mt-3">Detalhe do grupo</h1>
        </header>

        {/* Integrantes */}
        <div className="tca-soft-surface rounded-lg p-4 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Integrantes do Grupo</h2>

          <ul className="divide-y divide-lime-100/80 rounded-md border border-lime-100 bg-white/70 px-3">
            {renderMemberCard(group.member_1_name, group.member_1_series)}

            {group.member_2_name && (
              renderMemberCard(group.member_2_name, group.member_2_series)
            )}

            {group.member_3_name && (
              renderMemberCard(group.member_3_name, group.member_3_series)
            )}

            {group.member_4_name && (
              renderMemberCard(group.member_4_name, group.member_4_series ?? null)
            )}

            {group.member_5_name && (
              renderMemberCard(group.member_5_name, group.member_5_series ?? null)
            )}
          </ul>

          {canManageMembers && currentGroupMemberCount < 5 && (
            <div className="mt-4 rounded-lg border border-lime-100 bg-white/80 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">Inserir novo integrante</p>
                <p className="text-xs text-gray-600 mt-1">
                  Apenas estudantes sem grupo podem ser adicionados. Vagas disponíveis: {5 - currentGroupMemberCount}.
                </p>
              </div>

              {member_status === "success" && (
                <p className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Integrante adicionado com sucesso.
                </p>
              )}
              {member_status === "invalid" && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Selecione um estudante para adicionar ao grupo.
                </p>
              )}
              {member_status === "linked" && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Este estudante já está vinculado a outro grupo.
                </p>
              )}
              {member_status === "duplicate" && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Este estudante já faz parte deste grupo.
                </p>
              )}
              {member_status === "full" && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Este grupo já atingiu o limite de 5 integrantes.
                </p>
              )}
              {member_status === "error" && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Não foi possível adicionar o integrante. Tente novamente.
                </p>
              )}

              {studentsWithoutGroup.length > 0 ? (
                <form action={handleAddMember} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="student_id" className="block text-sm text-gray-600 mb-1">
                      Estudantes sem grupo
                    </label>
                    <select
                      id="student_id"
                      name="student_id"
                      defaultValue=""
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                    >
                      <option value="">— Selecionar estudante —</option>
                      {studentsWithoutGroup.map((student) => (
                        <option key={student.id} value={String(student.id)}>
                          {student.name} — {student.grade || "Série não informada"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                  >
                    Adicionar integrante
                  </button>
                </form>
              ) : (
                <p className="text-sm text-gray-500">Nenhum estudante sem grupo disponível no momento.</p>
              )}
            </div>
          )}
        </div>

        {/* Orientação */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Orientação</h2>

          {/* Resumo atual */}
          <div className="mb-5 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Orientador principal:</span>{" "}
              {primaryAdvisor ? (
                <span className="text-gray-900">{primaryAdvisor.name}</span>
              ) : (
                <span className="text-gray-400 italic">A definir</span>
              )}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Coorientador:</span>{" "}
              {coAdvisor ? (
                <span className="text-gray-900">{coAdvisor.name}</span>
              ) : (
                <span className="text-gray-400 italic">A definir</span>
              )}
            </p>

            <p className="text-sm text-gray-700">
              <span className="font-medium">Indicação:</span>{" "}
              {group.indication_status === "pendente" ? (
                <span className="text-amber-700 font-medium">Pendente</span>
              ) : group.indication_status === "aceita" ? (
                <span className="text-green-700 font-medium">Aceita</span>
              ) : group.indication_status === "recusada" ? (
                <span className="text-red-700 font-medium">Indisponível</span>
              ) : (
                <span className="text-gray-400 italic">Sem indicação ativa</span>
              )}
            </p>
          </div>

          {group.indication_status === "pendente" && indicatedAdvisor && (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 font-medium">
                Indicação pendente para: {indicatedAdvisor.name}
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Registre abaixo se a indicação foi aceita ou se o orientador ficou indisponível.
              </p>

              {indication_response === "invalid_co" && (
                <p className="text-xs text-red-700 mt-2 font-medium">
                  O coorientador não pode ser o mesmo orientador principal indicado.
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <form action={handleRespondAdvisorIndication} className="space-y-2">
                  <input type="hidden" name="decision" value="aceita" />

                  <div>
                    <label htmlFor="pending-co-advisor-id" className="block text-xs text-amber-900 mb-1">
                      Coorientador opcional
                    </label>
                    <select
                      id="pending-co-advisor-id"
                      name="co_advisor_id"
                      defaultValue={group.co_advisor_id ?? ""}
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md text-black bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">— Nenhum —</option>
                      {advisors
                        .filter((advisor) => !idsAreEqual(advisor.id, indicatedAdvisor.id))
                        .map((advisor) => (
                          <option key={advisor.id} value={advisor.id}>
                            {advisor.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-md"
                  >
                    Registrar aceite
                  </button>
                </form>

                <form action={handleRespondAdvisorIndication}>
                  <input type="hidden" name="decision" value="recusada" />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-md"
                  >
                    Marcar indisponível
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Formulário de associação */}
          {advisors.length > 0 ? (
            <>
              {!isStudentView && (
              <form action={handleAssignAdvisors} className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700">Atualizar orientadores:</p>

                {advisor_error === "unavailable" && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Este orientador principal está indisponível no momento (limite de orientações atingido).
                  </p>
                )}
                {advisor_error === "save" && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Não foi possível salvar a atualização de orientadores. Tente novamente.
                  </p>
                )}

                <div>
                  <label htmlFor="primary_advisor_id" className="block text-sm text-gray-600 mb-1">
                    Orientador principal
                  </label>
                  <select
                    id="primary_advisor_id"
                    name="primary_advisor_id"
                    defaultValue={group.primary_advisor_id ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="">— Nenhum —</option>
                    {advisors.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>
                        {advisor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="co_advisor_id" className="block text-sm text-gray-600 mb-1">
                    Coorientador
                  </label>
                  <select
                    id="co_advisor_id"
                    name="co_advisor_id"
                    defaultValue={group.co_advisor_id ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="">— Nenhum —</option>
                    {advisors.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>
                        {advisor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                >
                  Salvar orientadores
                </button>
              </form>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
              Nenhum orientador cadastrado.{" "}
              <Link href="/advisors" className="text-lime-700 hover:underline">
                Cadastre um orientador
              </Link>{" "}
              para associar ao grupo.
            </p>
          )}
        </div>

        {/* Projeto */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projeto</h2>

          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-700">Tema</dt>
              <dd className="text-gray-900 mt-1">{displayedTheme}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-700">Descrição</dt>
              <dd className="text-gray-900 mt-1 whitespace-pre-line">
                {group.description || "Sem descrição"}
              </dd>
            </div>
          </dl>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">Status atual:</span> {getStatusLabel(currentStatus)}
            </p>

            {canManageStatuses ? (
              <form action={handleUpdateStatus} className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="status" className="block text-sm text-gray-600 mb-1">
                    Atualizar status do grupo
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={currentStatus}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="planejamento">Planejamento</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                >
                  Salvar status
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-500">
                A atualização de status do grupo fica disponível apenas para orientadores e coordenação.
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Estrutura das seções do projeto TCA</h3>

            <div className="mb-3">
              <Link
                href={`/groups/${id}/project`}
                className="text-sm text-lime-700 hover:underline font-medium"
              >
                Abrir página completa do projeto por seções →
              </Link>
            </div>

            {projectSectionsError && (
              <p className="text-xs text-amber-800 mb-2">{projectSectionsError}</p>
            )}

            {projectSections.length === 0 ? (
              <p className="text-sm text-gray-500">Estrutura ainda não disponível para este grupo.</p>
            ) : canManageProjectSections ? (
              <div className="space-y-3">
                {projectSections.map((section) => {
                  const currentSectionId = String(section.id);
                  const sectionGuidance = getSectionPedagogicalGuidance(section.section_key);
                  const schedule = stageScheduleBySection.get(currentSectionId);
                  const sectionQuestions = questionsBySection.get(currentSectionId) || [];
                  const sectionComments = commentsBySection.get(currentSectionId) || [];
                  const sectionNextSteps = nextStepsBySection.get(currentSectionId) || [];
                  const sectionVersions = versionsBySection.get(currentSectionId) || [];
                  const isExpanded = expandedSectionId === currentSectionId;

                  return (
                    <details
                      key={currentSectionId}
                      className="rounded-lg border border-gray-200 bg-white"
                      open={isExpanded}
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-lg px-4 py-3 hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {section.section_order}. {section.section_title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {section.section_description || "Sem descrição"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                            section.status === "concluido"
                              ? "bg-green-100 text-green-700"
                              : section.status === "em_andamento"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {getProjectSectionStatusLabel(section.status)}
                        </span>
                      </summary>

                      <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                        <div className="rounded-md border border-lime-100 bg-lime-50/80 p-4">
                          <p className="text-sm font-semibold text-lime-900">Orientação pedagógica desta seção</p>
                          <p className="text-sm text-lime-950 mt-2">{sectionGuidance.objective}</p>

                          <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-lime-800">
                                Perguntas orientadoras
                              </p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                {sectionGuidance.guidingQuestions.map((question) => (
                                  <li key={`${section.section_key}-${question}`}>{question}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="rounded-md border border-lime-200 bg-white/70 px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-lime-800">
                                Evidência esperada
                              </p>
                              <p className="text-sm text-gray-700 mt-2">{sectionGuidance.expectedEvidence}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
                          <p className="text-sm font-semibold text-blue-900">Cronograma da etapa</p>

                          {schedule?.notes && (
                            <p className="text-xs text-blue-800 mt-1 whitespace-pre-line">{schedule.notes}</p>
                          )}

                          {schedule_status === "success" && schedule_section === currentSectionId && (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mt-3">
                              Cronograma atualizado com sucesso.
                            </p>
                          )}
                          {schedule_status === "invalid" && schedule_section === currentSectionId && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-3">
                              Data inválida. Informe um prazo no formato correto.
                            </p>
                          )}
                          {schedule_status === "error" && schedule_section === currentSectionId && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-3">
                              Não foi possível salvar o cronograma desta etapa. Tente novamente.
                            </p>
                          )}
                          {schedule_status === "forbidden" && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-3">
                              Apenas orientadores (ou coordenação) podem alterar o cronograma nesta etapa.
                            </p>
                          )}

                          <form action={handleUpsertSectionSchedule} className="mt-3 grid gap-2">
                            <input type="hidden" name="section_id" value={currentSectionId} />

                            <div>
                              <label htmlFor={`due-date-${currentSectionId}`} className="block text-xs text-blue-900 mb-1">
                                Prazo da etapa
                              </label>
                              <input
                                id={`due-date-${currentSectionId}`}
                                name="due_date"
                                type="date"
                                defaultValue={schedule?.due_date || ""}
                                className="w-full md:w-64 px-3 py-2 border border-blue-200 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label htmlFor={`schedule-notes-${currentSectionId}`} className="block text-xs text-blue-900 mb-1">
                                Observações do prazo (opcional)
                              </label>
                              <textarea
                                id={`schedule-notes-${currentSectionId}`}
                                name="notes"
                                rows={2}
                                defaultValue={schedule?.notes || ""}
                                placeholder="Ex.: Entregar versão preliminar para revisão até a data limite."
                                className="w-full px-3 py-2 border border-blue-200 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-fit bg-blue-700 hover:bg-blue-800 text-white font-medium px-3 py-2 rounded-md text-sm"
                            >
                              Salvar cronograma da etapa
                            </button>
                          </form>
                        </div>

                        {section_status === "success" && section_id === currentSectionId && (
                          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                            Seção atualizada com sucesso.
                          </p>
                        )}
                        {section_status === "error" && (!section_id || section_id === currentSectionId) && (
                          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            Não foi possível atualizar esta seção. Tente novamente.
                          </p>
                        )}

                        <form action={handleUpdateProjectSection} className="space-y-3">
                          <input type="hidden" name="section_id" value={currentSectionId} />

                          <div>
                            <label htmlFor={`content-${currentSectionId}`} className="block text-sm text-gray-700 mb-1">
                              Conteúdo da seção
                            </label>
                            <textarea
                              id={`content-${currentSectionId}`}
                              name="content"
                              rows={6}
                              defaultValue={section.content || ""}
                              placeholder="Escreva aqui o conteúdo desta seção..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label htmlFor={`status-${currentSectionId}`} className="block text-sm text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              id={`status-${currentSectionId}`}
                              name="status"
                              defaultValue={section.status}
                              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="nao_iniciado">Não iniciada</option>
                              <option value="em_andamento">Em andamento</option>
                              <option value="concluido">Concluída</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                          >
                            Salvar seção
                          </button>
                        </form>

                        <div className="p-3 border border-gray-100 rounded-md bg-gray-50">
                          <p className="text-sm font-semibold text-gray-800 mb-2">Histórico de versões da seção</p>

                          {sectionVersions.length === 0 ? (
                            <p className="text-xs text-gray-500">Nenhuma versão registrada ainda para esta seção.</p>
                          ) : (
                            <div className="space-y-2">
                              {sectionVersions.slice(0, 5).map((version) => (
                                <div key={String(version.id)} className="border border-gray-200 rounded-md px-3 py-2 bg-white">
                                  <p className="text-xs text-gray-700 font-medium">
                                    Versão {version.version_number}
                                    {version.created_at
                                      ? ` • ${new Date(version.created_at).toLocaleString("pt-BR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}`
                                      : ""}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {version.author_name} ({version.author_role === "advisor" ? "orientador" : version.author_role === "coordinator" ? "coordenação" : "estudante"})
                                    {` • Status: ${getProjectSectionStatusLabel(version.status)}`}
                                  </p>
                                  <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">
                                    {(version.content || "Sem conteúdo.").slice(0, 220)}
                                    {version.content && version.content.length > 220 ? "..." : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Dúvidas dos estudantes</h4>

                          <div className="space-y-2 mb-3">
                            {sectionQuestions.length === 0 ? (
                              <p className="text-sm text-gray-500">Ainda não há dúvidas registradas nesta seção.</p>
                            ) : (
                              sectionQuestions.map((question) => {
                                const questionAnswers = answersByQuestion.get(String(question.id)) || [];

                                return (
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

                                      {answer_status === "success" && answer_question === String(question.id) && (
                                        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-2">
                                          Resposta registrada com sucesso.
                                        </p>
                                      )}
                                      {answer_status === "invalid" && answer_question === String(question.id) && (
                                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
                                          Resposta inválida. Escreva ao menos 3 caracteres.
                                        </p>
                                      )}
                                      {answer_status === "error" && answer_question === String(question.id) && (
                                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
                                          Não foi possível salvar a resposta. Tente novamente.
                                        </p>
                                      )}

                                      <div className="space-y-2 mb-2">
                                        {questionAnswers.length === 0 ? (
                                          <p className="text-sm text-gray-500">Nenhuma resposta registrada ainda.</p>
                                        ) : (
                                          questionAnswers.map((answer) => (
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

                                      <form action={handleAddQuestionAnswer} className="space-y-2">
                                        <input type="hidden" name="section_id" value={currentSectionId} />
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
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Comentários do orientador</h4>

                          {comment_status === "success" && comment_section === currentSectionId && (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                              Comentário registrado com sucesso.
                            </p>
                          )}
                          {comment_status === "invalid" && comment_section === currentSectionId && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                              Comentário inválido. Escreva ao menos 3 caracteres.
                            </p>
                          )}
                          {comment_status === "error" && comment_section === currentSectionId && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                              Não foi possível salvar o comentário. Tente novamente.
                            </p>
                          )}

                          <div className="space-y-2 mb-3">
                            {sectionComments.length === 0 ? (
                              <p className="text-sm text-gray-500">Ainda não há comentários nesta seção.</p>
                            ) : (
                              sectionComments.map((comment) => (
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

                          <form action={handleAddSectionComment} className="space-y-2">
                            <input type="hidden" name="section_id" value={currentSectionId} />
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
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Próximos passos</h4>

                          {next_step_status === "success" && next_step_section === currentSectionId && (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                              Próximos passos registrados com sucesso.
                            </p>
                          )}
                          {next_step_status === "invalid" && next_step_section === currentSectionId && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                              Texto inválido. Escreva ao menos 3 caracteres.
                            </p>
                          )}
                          {next_step_status === "error" && next_step_section === currentSectionId && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                              Não foi possível salvar os próximos passos. Tente novamente.
                            </p>
                          )}

                          <div className="space-y-2 mb-3">
                            {sectionNextSteps.length === 0 ? (
                              <p className="text-sm text-gray-500">Ainda não há próximos passos registrados nesta seção.</p>
                            ) : (
                              sectionNextSteps.map((nextStep) => (
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

                          <form action={handleAddSectionNextStep} className="space-y-2">
                            <input type="hidden" name="section_id" value={currentSectionId} />
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
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <ul className="space-y-2">
                {projectSections.map((section) => (
                  <li
                    key={String(section.id)}
                    className="flex items-start justify-between gap-3 border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {section.section_order}. {section.section_title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
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
                      {getProjectSectionStatusLabel(section.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="text-gray-500 text-xs mt-4">
          {group.created_at && (
            <p>
              Grupo criado em{" "}
              {new Date(group.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </footer>
      </section>
    </main>
  );
}

