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
import {
  fetchGroupProjectSectionStageSchedule,
  upsertProjectSectionStageSchedule,
} from "@/services/project-section-stage-schedule-service";
import {
  createGroupInPersonMeeting,
  fetchGroupInPersonMeetings,
  updateGroupInPersonMeetingStatus,
} from "@/services/group-in-person-meeting-service";
import {
  createGroupInternalNotification,
  fetchGroupInternalNotifications,
} from "@/services/group-internal-notification-service";
import {
  fetchGroupFinalProduct,
  upsertGroupFinalProduct,
} from "@/services/group-final-product-service";
import {
  createGroupProcessPhoto,
  fetchGroupProcessPhotos,
} from "@/services/group-process-photo-service";
import {
  createGroupRepertoryItem,
  fetchGroupRepertoryItems,
} from "@/services/group-repertory-item-service";
import {
  createGroupInteractiveGuide,
  fetchGroupInteractiveGuides,
} from "@/services/group-interactive-guide-service";
import {
  fetchGroupInteractiveGuideProgress,
  upsertGroupInteractiveGuideProgress,
} from "@/services/group-interactive-guide-progress-service";
import {
  createGroupAIFeedback,
  fetchGroupAIFeedback,
} from "@/services/group-ai-feedback-service";
import {
  createProjectSectionVersion,
  fetchGroupProjectSectionVersions,
} from "@/services/project-section-version-service";
import {
  createProjectSectionAuthorshipIndicator,
  fetchProjectSectionAuthorshipIndicators,
} from "@/services/project-section-authorship-indicator-service";
import { requireGroupAccess } from "@/services/group-access-service";
import { generateProjectDevelopmentChecklistSimulated } from "@/lib/ai/project-development-checklist-simulated";
import { generatePedagogicalFeedbackWithAI } from "@/lib/ai/pedagogical-feedback-service";
import { ProjectProgress } from "@/components/project/ProjectProgress";
import { ProjectPreview } from "@/components/project/ProjectPreview";
import type { ProjectSectionStatus } from "@/types/project-section";
import type { ProjectDevelopmentChecklistStatus } from "@/types/project-development-checklist-item";
import type { GroupInPersonMeetingStatus } from "@/types/group-in-person-meeting";
import type { GroupInternalNotificationType } from "@/types/group-internal-notification";
import type { GroupFinalProductStatus } from "@/types/group-final-product";
import type { GroupRepertoryResourceType } from "@/types/group-repertory-item";
import type {
  GroupInteractiveGuideAudience,
  GroupInteractiveGuideType,
} from "@/types/group-interactive-guide";
import type { GroupInteractiveGuideProgressStatus } from "@/types/group-interactive-guide-progress";
import type { ProjectSectionAuthorshipIndicator } from "@/types/project-section-authorship-indicator";

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
    checklist_generated?: string;
    schedule_status?: string;
    schedule_section?: string;
    meeting_status?: string;
    meeting_action?: string;
    meeting_id?: string;
    notification_status?: string;
    notification_action?: string;
    final_product_status?: string;
    photo_status?: string;
    photo_action?: string;
    repertory_status?: string;
    repertory_action?: string;
    guide_status?: string;
    guide_action?: string;
    guide_seeded?: string;
    guide_item?: string;
    ai_feedback_status?: string;
    ai_feedback_action?: string;
    ai_feedback_section?: string;
    authorship_status?: string;
    authorship_action?: string;
    authorship_section?: string;
  }>;
}

function getStatusLabel(status: ProjectSectionStatus) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluido") return "Concluída";
  return "Não iniciada";
}

function getFinalProductStatusLabel(status: GroupFinalProductStatus | null | undefined) {
  return status === "finalizado" ? "Finalizado" : "Rascunho";
}

async function requireSharedProjectAccess(groupId: string) {
  const access = await requireGroupAccess(groupId);
  return access.profile;
}

async function requireAdvisorProjectAccess(groupId: string, forbiddenQuery: string) {
  const authenticatedProfile = await requireSharedProjectAccess(groupId);
  if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
    redirect(`/groups/${groupId}/project?${forbiddenQuery}`);
  }

  return authenticatedProfile;
}

async function requireStudentProjectAccess(groupId: string, forbiddenQuery: string) {
  const authenticatedProfile = await requireSharedProjectAccess(groupId);
  if (authenticatedProfile.role !== "student") {
    redirect(`/groups/${groupId}/project?${forbiddenQuery}`);
  }

  return authenticatedProfile;
}

function getRepertoryTypeLabel(type: GroupRepertoryResourceType) {
  if (type === "artigo") return "Artigo";
  if (type === "livro") return "Livro";
  if (type === "site") return "Site";
  if (type === "video") return "Vídeo";
  if (type === "podcast") return "Podcast";
  return "Outro";
}

function buildPreviewExcerpt(content: string | null | undefined, maxLength = 220) {
  if (!content || content.trim().length === 0) {
    return "";
  }

  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

type ProjectSectionReference = {
  id: string | number;
  section_title: string;
};

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

function findSectionIdByKeywords(
  sections: ProjectSectionReference[],
  keywords: string[]
): string | number | null {
  const normalizedKeywords = keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
  if (normalizedKeywords.length === 0) {
    return null;
  }

  const matched = sections.find((section) => {
    const title = section.section_title.toLowerCase();
    return normalizedKeywords.some((keyword) => title.includes(keyword));
  });

  return matched ? matched.id : null;
}

function buildDefaultTCAInteractiveGuides(sections: ProjectSectionReference[]) {
  const templates: Array<{
    title: string;
    guide_type: GroupInteractiveGuideType;
    content: string;
    suggested_activity: string;
    audience: GroupInteractiveGuideAudience;
    keywords: string[];
  }> = [
    {
      title: "Microguia 1 — Definição do problema social do território",
      guide_type: "metodologia",
      content:
        "Delimitem um problema real observado no território (escola, bairro ou comunidade). Registrem evidências concretas e expliquem por que esse problema é relevante para o coletivo.",
      suggested_activity:
        "Produzam uma síntese de 5 linhas respondendo: o que acontece, com quem acontece e por que isso importa no contexto local.",
      audience: "students",
      keywords: ["problema", "tema", "introdu"],
    },
    {
      title: "Microguia 2 — Pergunta investigativa clara",
      guide_type: "escrita",
      content:
        "Transformem o problema em uma pergunta investigativa objetiva, que possa ser respondida ao longo do TCA. Evitem perguntas muito amplas.",
      suggested_activity:
        "Escrevam 3 versões da pergunta e escolham a melhor com base em clareza, foco e viabilidade.",
      audience: "students",
      keywords: ["problema", "objetivo", "introdu"],
    },
    {
      title: "Microguia 3 — Objetivo geral e objetivos específicos",
      guide_type: "estrutura",
      content:
        "O objetivo geral deve indicar o resultado central do projeto. Já os objetivos específicos devem descrever etapas práticas para atingir o objetivo geral.",
      suggested_activity:
        "Construam 1 objetivo geral e 3 objetivos específicos iniciando com verbos de ação (investigar, analisar, propor, validar etc.).",
      audience: "students",
      keywords: ["objetivo", "metodologia", "desenvolvimento"],
    },
    {
      title: "Microguia 4 — Critérios de fontes e repertório",
      guide_type: "referencias",
      content:
        "Selecionem fontes confiáveis e variadas (materiais institucionais, artigos, dados públicos, entrevistas). Registrem por que cada fonte é útil para o problema estudado.",
      suggested_activity:
        "Cadastrem no mínimo 3 fontes e anotem a contribuição de cada uma para a argumentação do grupo.",
      audience: "students",
      keywords: ["refer", "fundament", "desenvolvimento"],
    },
    {
      title: "Microguia 5 — Organização da metodologia",
      guide_type: "metodologia",
      content:
        "Descrevam como a investigação será realizada: quem participa, quais instrumentos serão usados e em qual sequência as etapas acontecerão.",
      suggested_activity:
        "Montem um roteiro com etapas numeradas (coleta, análise, validação e proposta de intervenção).",
      audience: "students",
      keywords: ["metodologia", "desenvolvimento"],
    },
    {
      title: "Microguia 6 — Escrita autoral e voz do grupo",
      guide_type: "escrita",
      content:
        "Priorizem linguagem autoral: expliquem decisões, justificativas e aprendizados com palavras do grupo, evitando copiar trechos prontos.",
      suggested_activity:
        "Revisem um trecho do texto e marquem onde há voz autoral forte e onde ainda há escrita genérica.",
      audience: "students",
      keywords: ["desenvolvimento", "conclus", "introdu"],
    },
    {
      title: "Microguia 7 — Qualidade da conclusão",
      guide_type: "estrutura",
      content:
        "A conclusão deve responder à pergunta investigativa, retomar os objetivos e apontar limites, aprendizados e próximos desdobramentos.",
      suggested_activity:
        "Escrevam um parágrafo final com: resposta principal, evidência utilizada e proposta de continuidade.",
      audience: "students",
      keywords: ["conclus", "resultado"],
    },
    {
      title: "Microguia 8 — Preparação para socialização/apresentação",
      guide_type: "apresentacao",
      content:
        "Planejem como comunicar o TCA para diferentes públicos, destacando problema, processo, resultados e proposta de transformação.",
      suggested_activity:
        "Criem um roteiro de apresentação de 3 minutos com divisão de falas entre os integrantes.",
      audience: "todos",
      keywords: ["apresent", "socializa", "produto"],
    },
  ];

  return templates.map((template) => ({
    ...template,
    section_id: findSectionIdByKeywords(sections, template.keywords),
  }));
}

export default async function GroupProjectPage({ params, searchParams }: GroupProjectPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const { group, profile } = await requireGroupAccess(id);

  const canCommentAsAdvisor = profile?.role === "advisor" || profile?.role === "coordinator";
  const canAnswerAsAdvisor = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageChecklist = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageSchedule = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageMeetings = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageInternalNotifications = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageFinalProduct = !!profile;
  const canManageProcessPhotos = !!profile;
  const canManageRepertory = !!profile;
  const canManageInteractiveGuides = !!profile;
  const canRespondInteractiveGuides = profile?.role === "student";
  const canManageAIFeedback = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageAuthorshipIndicator = profile?.role === "advisor" || profile?.role === "coordinator";
  const canAskAsStudent = profile?.role === "student";

  async function handleUpdateSection(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireSharedProjectAccess(id);

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!sectionId) {
      redirect(`/groups/${id}/project?section_status=error`);
    }

    const currentSections = await ensureGroupProjectSectionsStructure(id).catch(() => []);
    const currentSection = currentSections.find((section) => String(section.id) === sectionId);
    const rawStatus = String(formData.get("status") ?? currentSection?.status ?? "nao_iniciado").trim();
    const allowed: ProjectSectionStatus[] = ["nao_iniciado", "em_andamento", "concluido"];
    const canManageSectionStatus = authenticatedProfile.role === "advisor" || authenticatedProfile.role === "coordinator";
    const status = canManageSectionStatus
      ? (allowed.includes(rawStatus as ProjectSectionStatus)
          ? (rawStatus as ProjectSectionStatus)
          : (currentSection?.status ?? "nao_iniciado"))
      : (currentSection?.status ?? "nao_iniciado");

    try {
      await updateGroupProjectSection(sectionId, {
        content: content || null,
        status,
      });

      await createProjectSectionVersion({
        group_id: id,
        section_id: sectionId,
        content: content || null,
        status,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
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

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "comment_status=forbidden");

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

    const authenticatedProfile = await requireStudentProjectAccess(id, "question_status=forbidden");

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

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "answer_status=forbidden");

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

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "next_step_status=forbidden");

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

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "checklist_status=forbidden&checklist_action=add");

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

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "checklist_status=forbidden&checklist_action=toggle");

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

  async function handleGenerateSimulatedChecklist() {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(
      id,
      "checklist_status=forbidden&checklist_action=generate_ai"
    );

    try {
      const currentSections = await ensureGroupProjectSectionsStructure(id);
      const currentChecklistItems = await fetchGroupProjectDevelopmentChecklistItems(id);
      const suggestions = generateProjectDevelopmentChecklistSimulated({
        sections: currentSections,
        existingItems: currentChecklistItems,
      });

      if (suggestions.length === 0) {
        redirect(`/groups/${id}/project?checklist_status=noop&checklist_action=generate_ai`);
      }

      for (const suggestion of suggestions) {
        await createProjectDevelopmentChecklistItem({
          group_id: id,
          section_id: suggestion.section_id,
          item_text: suggestion.item_text,
          created_by_profile_id: authenticatedProfile.id,
          created_by_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
          created_by_name: `${authenticatedProfile.name} • IA simulada`,
        });
      }

      revalidatePath(`/groups/${id}/project`);
      redirect(
        `/groups/${id}/project?checklist_status=success&checklist_action=generate_ai&checklist_generated=${suggestions.length}`
      );
    } catch {
      redirect(`/groups/${id}/project?checklist_status=error&checklist_action=generate_ai`);
    }
  }

  async function handleUpsertSectionSchedule(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "schedule_status=forbidden");

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const dueDate = String(formData.get("due_date") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;

    const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
    if (!sectionId || !isDateValid) {
      redirect(`/groups/${id}/project?schedule_status=invalid&schedule_section=${sectionId}`);
    }

    try {
      await upsertProjectSectionStageSchedule({
        group_id: id,
        section_id: sectionId,
        due_date: dueDate,
        notes,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?schedule_status=error&schedule_section=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?schedule_status=success&schedule_section=${sectionId}`);
  }

  async function handleAddInPersonMeeting(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "meeting_status=forbidden&meeting_action=add");

    const meetingDate = String(formData.get("meeting_date") ?? "").trim();
    const meetingTimeRaw = String(formData.get("meeting_time") ?? "").trim();
    const meetingTime = meetingTimeRaw.length > 0 ? meetingTimeRaw : null;
    const locationRaw = String(formData.get("location") ?? "").trim();
    const location = locationRaw.length > 0 ? locationRaw : null;
    const agenda = String(formData.get("agenda") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;

    const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(meetingDate);
    if (!isDateValid || agenda.length < 3) {
      redirect(`/groups/${id}/project?meeting_status=invalid&meeting_action=add`);
    }

    try {
      await createGroupInPersonMeeting({
        group_id: id,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        location,
        agenda,
        notes,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?meeting_status=error&meeting_action=add`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?meeting_status=success&meeting_action=add`);
  }

  async function handleUpdateMeetingStatus(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "meeting_status=forbidden&meeting_action=status");

    const meetingId = String(formData.get("meeting_id") ?? "").trim();
    const rawStatus = String(formData.get("next_status") ?? "").trim();
    const allowed: GroupInPersonMeetingStatus[] = ["agendado", "realizado", "cancelado"];
    const nextStatus = allowed.includes(rawStatus as GroupInPersonMeetingStatus)
      ? (rawStatus as GroupInPersonMeetingStatus)
      : null;

    if (!meetingId || !nextStatus) {
      redirect(`/groups/${id}/project?meeting_status=invalid&meeting_action=status&meeting_id=${meetingId}`);
    }

    try {
      await updateGroupInPersonMeetingStatus(meetingId, nextStatus);
    } catch {
      redirect(`/groups/${id}/project?meeting_status=error&meeting_action=status&meeting_id=${meetingId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?meeting_status=success&meeting_action=status&meeting_id=${meetingId}`);
  }

  async function handleAddInternalNotification(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "notification_status=forbidden&notification_action=add");

    const title = String(formData.get("title") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const sectionIdRaw = String(formData.get("section_id") ?? "").trim();
    const sectionId = sectionIdRaw ? sectionIdRaw : null;
    const rawType = String(formData.get("notification_type") ?? "aviso").trim();
    const allowedTypes: GroupInternalNotificationType[] = ["aviso", "prazo", "encontro", "orientacao"];
    const notificationType = allowedTypes.includes(rawType as GroupInternalNotificationType)
      ? (rawType as GroupInternalNotificationType)
      : "aviso";

    if (title.length < 3 || message.length < 3) {
      redirect(`/groups/${id}/project?notification_status=invalid&notification_action=add`);
    }

    try {
      await createGroupInternalNotification({
        group_id: id,
        section_id: sectionId,
        title,
        message,
        notification_type: notificationType,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?notification_status=error&notification_action=add`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?notification_status=success&notification_action=add`);
  }

  async function handleUpsertFinalProduct(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireSharedProjectAccess(id);

    const title = String(formData.get("title") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "").trim();
    const description = descriptionRaw.length > 0 ? descriptionRaw : null;
    const productFormat = String(formData.get("product_format") ?? "outro").trim() || "outro";
    const finalLinkRaw = String(formData.get("final_link") ?? "").trim();
    const finalLink = finalLinkRaw.length > 0 ? finalLinkRaw : null;
    const presentationNotesRaw = String(formData.get("presentation_notes") ?? "").trim();
    const presentationNotes = presentationNotesRaw.length > 0 ? presentationNotesRaw : null;
    const rawStatus = String(formData.get("status") ?? "rascunho").trim();
    const allowedStatus: GroupFinalProductStatus[] = ["rascunho", "finalizado"];
    const status = allowedStatus.includes(rawStatus as GroupFinalProductStatus)
      ? (rawStatus as GroupFinalProductStatus)
      : "rascunho";

    if (title.length < 3) {
      redirect(`/groups/${id}/project?final_product_status=invalid`);
    }

    try {
      await upsertGroupFinalProduct({
        group_id: id,
        title,
        description,
        product_format: productFormat,
        final_link: finalLink,
        presentation_notes: presentationNotes,
        status,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?final_product_status=error`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?final_product_status=success`);
  }

  async function handleAddProcessPhoto(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireSharedProjectAccess(id);

    const photoUrl = String(formData.get("photo_url") ?? "").trim();
    const captionRaw = String(formData.get("caption") ?? "").trim();
    const caption = captionRaw.length > 0 ? captionRaw : null;
    const takenAtRaw = String(formData.get("taken_at") ?? "").trim();
    const takenAt = takenAtRaw.length > 0 ? takenAtRaw : null;
    const sectionIdRaw = String(formData.get("section_id") ?? "").trim();
    const sectionId = sectionIdRaw ? sectionIdRaw : null;

    const isDateValid = !takenAt || /^\d{4}-\d{2}-\d{2}$/.test(takenAt);
    if (!photoUrl || !isDateValid) {
      redirect(`/groups/${id}/project?photo_status=invalid&photo_action=add`);
    }

    try {
      await createGroupProcessPhoto({
        group_id: id,
        section_id: sectionId,
        photo_url: photoUrl,
        caption,
        taken_at: takenAt,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?photo_status=error&photo_action=add`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?photo_status=success&photo_action=add`);
  }

  async function handleAddRepertoryItem(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireSharedProjectAccess(id);

    const title = String(formData.get("title") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "").trim();
    const description = descriptionRaw.length > 0 ? descriptionRaw : null;
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const sectionIdRaw = String(formData.get("section_id") ?? "").trim();
    const sectionId = sectionIdRaw ? sectionIdRaw : null;
    const resourceLinkRaw = String(formData.get("resource_link") ?? "").trim();
    const resourceLink = resourceLinkRaw.length > 0 ? resourceLinkRaw : null;
    const rawType = String(formData.get("resource_type") ?? "outro").trim();
    const allowedTypes: GroupRepertoryResourceType[] = ["artigo", "livro", "site", "video", "podcast", "outro"];
    const resourceType = allowedTypes.includes(rawType as GroupRepertoryResourceType)
      ? (rawType as GroupRepertoryResourceType)
      : "outro";

    if (title.length < 3) {
      redirect(`/groups/${id}/project?repertory_status=invalid&repertory_action=add`);
    }

    try {
      await createGroupRepertoryItem({
        group_id: id,
        section_id: sectionId,
        title,
        description,
        resource_type: resourceType,
        resource_link: resourceLink,
        notes,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?repertory_status=error&repertory_action=add`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?repertory_status=success&repertory_action=add`);
  }

  async function handleAddInteractiveGuide(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireSharedProjectAccess(id);

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const suggestedActivityRaw = String(formData.get("suggested_activity") ?? "").trim();
    const suggestedActivity = suggestedActivityRaw.length > 0 ? suggestedActivityRaw : null;
    const sectionIdRaw = String(formData.get("section_id") ?? "").trim();
    const sectionId = sectionIdRaw ? sectionIdRaw : null;

    const rawGuideType = String(formData.get("guide_type") ?? "outro").trim();
    const allowedGuideTypes: GroupInteractiveGuideType[] = [
      "escrita",
      "metodologia",
      "estrutura",
      "referencias",
      "apresentacao",
      "outro",
    ];
    const guideType = allowedGuideTypes.includes(rawGuideType as GroupInteractiveGuideType)
      ? (rawGuideType as GroupInteractiveGuideType)
      : "outro";

    const rawAudience = String(formData.get("audience") ?? "todos").trim();
    const allowedAudience: GroupInteractiveGuideAudience[] = ["students", "advisors", "todos"];
    const audience = allowedAudience.includes(rawAudience as GroupInteractiveGuideAudience)
      ? (rawAudience as GroupInteractiveGuideAudience)
      : "todos";

    if (title.length < 3 || content.length < 3) {
      redirect(`/groups/${id}/project?guide_status=invalid&guide_action=add`);
    }

    try {
      await createGroupInteractiveGuide({
        group_id: id,
        section_id: sectionId,
        title,
        guide_type: guideType,
        content,
        suggested_activity: suggestedActivity,
        audience,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?guide_status=error&guide_action=add`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?guide_status=success&guide_action=add`);
  }

  async function handleSeedDefaultInteractiveGuides() {
    "use server";

    const authenticatedProfile = await requireSharedProjectAccess(id);

    try {
      const currentSections = await ensureGroupProjectSectionsStructure(id);
      const existingGuides = await fetchGroupInteractiveGuides(id);
      const existingTitles = new Set(existingGuides.map((guide) => guide.title.trim().toLowerCase()));

      const defaults = buildDefaultTCAInteractiveGuides(
        currentSections.map((section) => ({
          id: section.id,
          section_title: section.section_title,
        }))
      );

      const guidesToCreate = defaults.filter((guide) => !existingTitles.has(guide.title.trim().toLowerCase()));

      if (guidesToCreate.length === 0) {
        redirect(`/groups/${id}/project?guide_status=noop&guide_action=seed`);
      }

      for (const guide of guidesToCreate) {
        await createGroupInteractiveGuide({
          group_id: id,
          section_id: guide.section_id,
          title: guide.title,
          guide_type: guide.guide_type,
          content: guide.content,
          suggested_activity: guide.suggested_activity,
          audience: guide.audience,
          author_profile_id: authenticatedProfile.id,
          author_role: authenticatedProfile.role,
          author_name: authenticatedProfile.name,
        });
      }

      revalidatePath(`/groups/${id}/project`);
      redirect(`/groups/${id}/project?guide_status=success&guide_action=seed&guide_seeded=${guidesToCreate.length}`);
    } catch {
      redirect(`/groups/${id}/project?guide_status=error&guide_action=seed`);
    }
  }

  async function handleUpsertInteractiveGuideProgress(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireStudentProjectAccess(id, "guide_status=forbidden&guide_action=progress");

    const guideId = String(formData.get("guide_id") ?? "").trim();
    const responseTextRaw = String(formData.get("response_text") ?? "").trim();
    const responseText = responseTextRaw.length > 0 ? responseTextRaw : null;
    const rawStatus = String(formData.get("status") ?? "pendente").trim();
    const allowedStatus: GroupInteractiveGuideProgressStatus[] = ["pendente", "concluido"];
    const status = allowedStatus.includes(rawStatus as GroupInteractiveGuideProgressStatus)
      ? (rawStatus as GroupInteractiveGuideProgressStatus)
      : null;

    if (!guideId || !status || (status === "concluido" && (!responseText || responseText.length < 3))) {
      redirect(`/groups/${id}/project?guide_status=invalid&guide_action=progress&guide_item=${guideId}`);
    }

    try {
      await upsertGroupInteractiveGuideProgress({
        group_id: id,
        guide_id: guideId,
        student_profile_id: authenticatedProfile.id,
        student_name: authenticatedProfile.name,
        response_text: responseText,
        status,
      });
    } catch {
      redirect(`/groups/${id}/project?guide_status=error&guide_action=progress&guide_item=${guideId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?guide_status=success&guide_action=progress&guide_item=${guideId}`);
  }

  async function handleGenerateAIFeedback(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "ai_feedback_status=forbidden&ai_feedback_action=generate");

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const focusPromptRaw = String(formData.get("focus_prompt") ?? "").trim();
    const focusPrompt = focusPromptRaw.length > 0 ? focusPromptRaw : null;

    if (!sectionId) {
      redirect(`/groups/${id}/project?ai_feedback_status=invalid&ai_feedback_action=generate`);
    }

    const currentSections = await ensureGroupProjectSectionsStructure(id);
    const targetSection = currentSections.find((section) => String(section.id) === sectionId);

    if (!targetSection || !targetSection.content || targetSection.content.trim().length < 10) {
      redirect(`/groups/${id}/project?ai_feedback_status=invalid&ai_feedback_action=generate&ai_feedback_section=${sectionId}`);
    }

    try {
      const result = await generatePedagogicalFeedbackWithAI({
        sectionTitle: targetSection.section_title,
        sectionContent: targetSection.content,
        focusPrompt,
      });

      await createGroupAIFeedback({
        group_id: id,
        section_id: sectionId,
        focus_prompt: focusPrompt,
        feedback_text: result.feedback_text,
        strengths: result.strengths,
        improvements: result.improvements,
        suggested_next_steps: result.suggested_next_steps,
        model_name: result.model_name,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role,
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?ai_feedback_status=error&ai_feedback_action=generate&ai_feedback_section=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?ai_feedback_status=success&ai_feedback_action=generate&ai_feedback_section=${sectionId}`);
  }

  async function handleAddAuthorshipIndicator(formData: FormData) {
    "use server";

    const authenticatedProfile = await requireAdvisorProjectAccess(id, "authorship_status=forbidden&authorship_action=add");

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const studentPercent = Number(String(formData.get("student_percent") ?? "").trim());
    const advisorPercent = Number(String(formData.get("advisor_percent") ?? "").trim());
    const coordinatorPercent = Number(String(formData.get("coordinator_percent") ?? "").trim());
    const analysisBasis = String(formData.get("analysis_basis") ?? "").trim();
    const recommendationRaw = String(formData.get("recommendation") ?? "").trim();
    const recommendation = recommendationRaw.length > 0 ? recommendationRaw : null;

    const total = studentPercent + advisorPercent + coordinatorPercent;
    const isPercentValid =
      [studentPercent, advisorPercent, coordinatorPercent].every((v) => Number.isFinite(v) && v >= 0 && v <= 100) &&
      total === 100;

    if (!sectionId || analysisBasis.length < 3 || !isPercentValid) {
      redirect(`/groups/${id}/project?authorship_status=invalid&authorship_action=add&authorship_section=${sectionId}`);
    }

    try {
      await createProjectSectionAuthorshipIndicator({
        group_id: id,
        section_id: sectionId,
        student_percent: studentPercent,
        advisor_percent: advisorPercent,
        coordinator_percent: coordinatorPercent,
        analysis_basis: analysisBasis,
        recommendation,
        author_profile_id: authenticatedProfile.id,
        author_role: authenticatedProfile.role === "coordinator" ? "coordinator" : "advisor",
        author_name: authenticatedProfile.name,
      });
    } catch {
      redirect(`/groups/${id}/project?authorship_status=error&authorship_action=add&authorship_section=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    redirect(`/groups/${id}/project?authorship_status=success&authorship_action=add&authorship_section=${sectionId}`);
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
  let stageSchedule = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionStageSchedule>>;
  let stageScheduleError: string | null = null;
  let inPersonMeetings = [] as Awaited<ReturnType<typeof fetchGroupInPersonMeetings>>;
  let inPersonMeetingsError: string | null = null;
  let internalNotifications = [] as Awaited<ReturnType<typeof fetchGroupInternalNotifications>>;
  let internalNotificationsError: string | null = null;
  let finalProduct = null as Awaited<ReturnType<typeof fetchGroupFinalProduct>>;
  let finalProductError: string | null = null;
  let processPhotos = [] as Awaited<ReturnType<typeof fetchGroupProcessPhotos>>;
  let processPhotosError: string | null = null;
  let repertoryItems = [] as Awaited<ReturnType<typeof fetchGroupRepertoryItems>>;
  let repertoryError: string | null = null;
  let interactiveGuides = [] as Awaited<ReturnType<typeof fetchGroupInteractiveGuides>>;
  let interactiveGuidesError: string | null = null;
  let interactiveGuidesProgress = [] as Awaited<ReturnType<typeof fetchGroupInteractiveGuideProgress>>;
  let interactiveGuidesProgressError: string | null = null;
  let aiFeedbackItems = [] as Awaited<ReturnType<typeof fetchGroupAIFeedback>>;
  let aiFeedbackError: string | null = null;
  let sectionVersions = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionVersions>>;
  let sectionVersionsError: string | null = null;
  let authorshipIndicators = [] as Awaited<ReturnType<typeof fetchProjectSectionAuthorshipIndicators>>;
  let authorshipIndicatorsError: string | null = null;

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

  try {
    stageSchedule = await fetchGroupProjectSectionStageSchedule(id);
  } catch (error) {
    stageScheduleError = error instanceof Error ? error.message : "Erro ao carregar cronograma por etapa.";
  }

  try {
    inPersonMeetings = await fetchGroupInPersonMeetings(id);
  } catch (error) {
    inPersonMeetingsError = error instanceof Error ? error.message : "Erro ao carregar agenda de encontros presenciais.";
  }

  try {
    internalNotifications = await fetchGroupInternalNotifications(id);
  } catch (error) {
    internalNotificationsError = error instanceof Error ? error.message : "Erro ao carregar notificações internas.";
  }

  try {
    finalProduct = await fetchGroupFinalProduct(id);
  } catch (error) {
    finalProductError = error instanceof Error ? error.message : "Erro ao carregar módulo de produto final.";
  }

  try {
    processPhotos = await fetchGroupProcessPhotos(id);
  } catch (error) {
    processPhotosError = error instanceof Error ? error.message : "Erro ao carregar fotos do processo.";
  }

  try {
    repertoryItems = await fetchGroupRepertoryItems(id);
  } catch (error) {
    repertoryError = error instanceof Error ? error.message : "Erro ao carregar exploração de repertório.";
  }

  try {
    interactiveGuides = await fetchGroupInteractiveGuides(id);
  } catch (error) {
    interactiveGuidesError = error instanceof Error ? error.message : "Erro ao carregar guias interativos.";
  }

  try {
    interactiveGuidesProgress = await fetchGroupInteractiveGuideProgress(id);
  } catch (error) {
    interactiveGuidesProgressError =
      error instanceof Error ? error.message : "Erro ao carregar progresso dos guias interativos.";
  }

  try {
    aiFeedbackItems = await fetchGroupAIFeedback(id);
  } catch (error) {
    aiFeedbackError = error instanceof Error ? error.message : "Erro ao carregar feedback pedagógico com IA.";
  }

  try {
    sectionVersions = await fetchGroupProjectSectionVersions(id);
  } catch (error) {
    sectionVersionsError = error instanceof Error ? error.message : "Erro ao carregar histórico de versões.";
  }

  try {
    authorshipIndicators = await fetchProjectSectionAuthorshipIndicators(id);
  } catch (error) {
    authorshipIndicatorsError = error instanceof Error ? error.message : "Erro ao carregar indicador de autoria.";
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

  const stageScheduleBySection = new Map<string, (typeof stageSchedule)[number]>();
  for (const item of stageSchedule) {
    stageScheduleBySection.set(String(item.section_id), item);
  }

  const versionsBySection = new Map<string, typeof sectionVersions>();
  for (const version of sectionVersions) {
    const key = String(version.section_id);
    const list = versionsBySection.get(key) ?? [];
    list.push(version);
    versionsBySection.set(key, list);
  }

  const latestAuthorshipBySection = new Map<string, ProjectSectionAuthorshipIndicator>();
  for (const indicator of authorshipIndicators) {
    const key = String(indicator.section_id);
    if (!latestAuthorshipBySection.has(key)) {
      latestAuthorshipBySection.set(key, indicator);
    }
  }

  function getSuggestedAuthorshipPercentages(sectionId: string) {
    const versions = versionsBySection.get(sectionId) || [];

    const totals = {
      student: 0,
      advisor: 0,
      coordinator: 0,
    };

    for (const version of versions) {
      if (version.author_role === "student") totals.student += 1;
      if (version.author_role === "advisor") totals.advisor += 1;
      if (version.author_role === "coordinator") totals.coordinator += 1;
    }

    const count = totals.student + totals.advisor + totals.coordinator;
    if (count === 0) {
      return { student: 0, advisor: 0, coordinator: 0 };
    }

    const student = Math.round((totals.student * 100) / count);
    const advisor = Math.round((totals.advisor * 100) / count);
    const coordinator = Math.round((totals.coordinator * 100) / count);
    const diff = 100 - (student + advisor + coordinator);

    return {
      student,
      advisor: advisor + diff,
      coordinator,
    };
  }

  const totalSections = sections.length;
  const completedSectionsCount = sections.filter((section) => section.status === "concluido").length;
  const inProgressSectionsCount = sections.filter((section) => section.status === "em_andamento").length;
  const notStartedSectionsCount = sections.filter((section) => section.status === "nao_iniciado").length;
  const completionPercentage = totalSections > 0
    ? Math.round((completedSectionsCount / totalSections) * 100)
    : 0;
  const safeCompletionPercentage = Math.min(100, Math.max(0, completionPercentage));
  const previewTitle = finalProduct?.title || group.theme || "Projeto do grupo";
  const previewSummary =
    finalProduct?.description ||
    group.description ||
    buildPreviewExcerpt(sections.find((section) => !!section.content?.trim())?.content, 280) ||
    "Esta prévia será enriquecida automaticamente conforme o grupo preencher as seções do projeto.";
  const previewSections = sections
    .filter((section) => !!section.content?.trim())
    .map((section) => ({
      id: String(section.id),
      title: `${section.section_order}. ${section.section_title}`,
      status: section.status,
      excerpt: buildPreviewExcerpt(section.content, 180),
    }));
  const previewRepertoryItems = repertoryItems.slice(0, 3);
  const previewProcessPhotos = processPhotos.slice(0, 3);
  const hasPreviewContent =
    previewSections.length > 0 ||
    !!finalProduct ||
    previewRepertoryItems.length > 0 ||
    previewProcessPhotos.length > 0;
  const simulatedChecklistSuggestions = generateProjectDevelopmentChecklistSimulated({
    sections,
    existingItems: checklistItems,
  });

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          <Link href={`/groups/${id}`} className="text-lime-700 hover:underline text-sm">
            ← Voltar para detalhe do grupo
          </Link>
          <h1 className="text-3xl font-bold tca-title-guide mt-3">
            Projeto: {group.theme || group.member_1_name}
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhe o progresso do TCA e abra cada seção em cards clicáveis.
          </p>
        </header>

        <div className="mb-6">
          <ProjectProgress
            completed={completedSectionsCount}
            inProgress={inProgressSectionsCount}
            notStarted={notStartedSectionsCount}
            total={totalSections}
          />

          {totalSections === 0 && (
            <p className="text-sm text-amber-800 mt-4">
              A estrutura de seções ainda não está disponível para calcular o progresso geral deste projeto.
            </p>
          )}
        </div>

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

        {stageScheduleError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do cronograma por etapa</p>
            <p className="text-amber-800 text-sm mt-1">{stageScheduleError}</p>
          </div>
        )}

        {inPersonMeetingsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente da agenda de encontros presenciais</p>
            <p className="text-amber-800 text-sm mt-1">{inPersonMeetingsError}</p>
          </div>
        )}

        {internalNotificationsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente das notificações internas</p>
            <p className="text-amber-800 text-sm mt-1">{internalNotificationsError}</p>
          </div>
        )}

        {finalProductError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do módulo de produto final</p>
            <p className="text-amber-800 text-sm mt-1">{finalProductError}</p>
          </div>
        )}

        {processPhotosError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do módulo de fotos do processo</p>
            <p className="text-amber-800 text-sm mt-1">{processPhotosError}</p>
          </div>
        )}

        {repertoryError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do módulo de exploração de repertório</p>
            <p className="text-amber-800 text-sm mt-1">{repertoryError}</p>
          </div>
        )}

        {interactiveGuidesError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do módulo de guias interativos</p>
            <p className="text-amber-800 text-sm mt-1">{interactiveGuidesError}</p>
          </div>
        )}

        {interactiveGuidesProgressError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do progresso dos guias interativos</p>
            <p className="text-amber-800 text-sm mt-1">{interactiveGuidesProgressError}</p>
          </div>
        )}

        {aiFeedbackError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do módulo de feedback pedagógico com IA</p>
            <p className="text-amber-800 text-sm mt-1">{aiFeedbackError}</p>
          </div>
        )}

        {sectionVersionsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do histórico de versões das seções</p>
            <p className="text-amber-800 text-sm mt-1">{sectionVersionsError}</p>
          </div>
        )}

        {authorshipIndicatorsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente do indicador de autoria</p>
            <p className="text-amber-800 text-sm mt-1">{authorshipIndicatorsError}</p>
          </div>
        )}

        <details className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6" open={Boolean(query.final_product_status)}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Módulo de produto final</h2>
              <p className="text-sm text-gray-600 mt-1">
                {finalProduct?.title
                  ? `Título atual: ${finalProduct.title}`
                  : "Clique para expandir e registrar o produto final do grupo."}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-lime-800 border border-lime-100">
              {getFinalProductStatusLabel(finalProduct?.status)}
            </span>
          </summary>

          <div className="mt-4">
            {query.final_product_status === "success" && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                Produto final salvo com sucesso.
              </p>
            )}
            {query.final_product_status === "invalid" && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                Título inválido. Informe ao menos 3 caracteres.
              </p>
            )}
            {query.final_product_status === "error" && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                Não foi possível salvar o produto final. Tente novamente.
              </p>
            )}
            {query.final_product_status === "forbidden" && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                É necessário estar autenticado para registrar o produto final.
              </p>
            )}

            <div className="mb-4 p-3 border border-gray-100 rounded-md bg-gray-50">
              <p className="text-sm text-gray-900 font-medium">
                Título atual: {finalProduct?.title || "Não definido"}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Status: {getFinalProductStatusLabel(finalProduct?.status)}
              </p>
              {finalProduct?.description && (
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">{finalProduct.description}</p>
              )}
              {finalProduct?.final_link && (
                <p className="text-xs text-blue-700 mt-1 break-all">Link final: {finalProduct.final_link}</p>
              )}
            </div>

            {canManageFinalProduct && (
              <form action={handleUpsertFinalProduct} className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <label htmlFor="final-product-title" className="block text-sm text-gray-700 mb-1">Título do produto final</label>
                  <input
                    id="final-product-title"
                    name="title"
                    type="text"
                    defaultValue={finalProduct?.title || ""}
                    placeholder="Ex.: Protótipo funcional de monitoramento ambiental"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="final-product-description" className="block text-sm text-gray-700 mb-1">Descrição</label>
                  <textarea
                    id="final-product-description"
                    name="description"
                    rows={3}
                    defaultValue={finalProduct?.description || ""}
                    placeholder="Descreva o produto final e seus principais resultados..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="final-product-format" className="block text-sm text-gray-700 mb-1">Formato</label>
                    <input
                      id="final-product-format"
                      name="product_format"
                      type="text"
                      defaultValue={finalProduct?.product_format || ""}
                      placeholder="Ex.: App, relatório, vídeo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="final-product-link" className="block text-sm text-gray-700 mb-1">Link final (opcional)</label>
                    <input
                      id="final-product-link"
                      name="final_link"
                      type="url"
                      defaultValue={finalProduct?.final_link || ""}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="final-product-status" className="block text-sm text-gray-700 mb-1">Status</label>
                    <select
                      id="final-product-status"
                      name="status"
                      defaultValue={finalProduct?.status || "rascunho"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="rascunho">Rascunho</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="final-product-presentation-notes" className="block text-sm text-gray-700 mb-1">Observações de apresentação (opcional)</label>
                  <textarea
                    id="final-product-presentation-notes"
                    name="presentation_notes"
                    rows={2}
                    defaultValue={finalProduct?.presentation_notes || ""}
                    placeholder="Ex.: Levar equipamento de demonstração e roteiro de apresentação."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                >
                  Salvar produto final
                </button>
              </form>
            )}
          </div>
        </details>

        <details className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6" open={Boolean(query.photo_status)}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fotos do processo</h2>
              <p className="text-sm text-gray-600 mt-1">
                {processPhotos.length > 0
                  ? `${processPhotos.length} registro(s) do processo disponíveis.`
                  : "Clique para expandir e registrar fotos do processo do grupo."}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-lime-800 border border-lime-100">
              {processPhotos.length} foto(s)
            </span>
          </summary>

          <div className="mt-4">
          {query.photo_status === "success" && query.photo_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Foto do processo registrada com sucesso.
            </p>
          )}
          {query.photo_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos para foto do processo. Informe uma URL e, se houver data, use formato válido.
            </p>
          )}
          {query.photo_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível registrar a foto do processo. Tente novamente.
            </p>
          )}
          {query.photo_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              É necessário estar autenticado para registrar fotos do processo.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {processPhotos.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há fotos do processo registradas para este grupo.</p>
            ) : (
              processPhotos.map((photo) => (
                <div key={String(photo.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                  <a
                    href={photo.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-700 hover:underline break-all"
                  >
                    {photo.photo_url}
                  </a>
                  {photo.caption && (
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{photo.caption}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {photo.author_name} ({photo.author_role === "advisor" ? "orientador" : photo.author_role === "coordinator" ? "coordenação" : "estudante"})
                    {photo.section_id ? ` • ${sectionTitleById.get(String(photo.section_id)) || "Seção"}` : " • Geral"}
                    {photo.taken_at
                      ? ` • Registro da foto: ${new Date(`${photo.taken_at}T00:00:00`).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}`
                      : ""}
                    {photo.created_at
                      ? ` • Publicada em ${new Date(photo.created_at).toLocaleString("pt-BR", {
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

          {canManageProcessPhotos && (
            <form action={handleAddProcessPhoto} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="process-photo-url" className="block text-sm text-gray-700 mb-1">URL da foto</label>
                  <input
                    id="process-photo-url"
                    name="photo_url"
                    type="url"
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="process-photo-date" className="block text-sm text-gray-700 mb-1">Data da foto (opcional)</label>
                  <input
                    id="process-photo-date"
                    name="taken_at"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="process-photo-section" className="block text-sm text-gray-700 mb-1">Seção relacionada (opcional)</label>
                <select
                  id="process-photo-section"
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

              <div>
                <label htmlFor="process-photo-caption" className="block text-sm text-gray-700 mb-1">Legenda/observações (opcional)</label>
                <textarea
                  id="process-photo-caption"
                  name="caption"
                  rows={2}
                  placeholder="Ex.: Registro do experimento em bancada durante validação da seção 4."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Registrar foto do processo
              </button>
            </form>
          )}
          </div>
        </details>

        <details className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6" open={Boolean(query.repertory_status)}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Exploração de repertório</h2>
              <p className="text-sm text-gray-600 mt-1">
                {repertoryItems.length > 0
                  ? `${repertoryItems.length} item(ns) de repertório registrados.`
                  : "Clique para expandir e registrar referências e repertórios do grupo."}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-lime-800 border border-lime-100">
              {repertoryItems.length} item(ns)
            </span>
          </summary>

          <div className="mt-4">
          {query.repertory_status === "success" && query.repertory_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Item de repertório registrado com sucesso.
            </p>
          )}
          {query.repertory_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos. Informe um título com pelo menos 3 caracteres.
            </p>
          )}
          {query.repertory_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível registrar o item de repertório. Tente novamente.
            </p>
          )}
          {query.repertory_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              É necessário estar autenticado para registrar repertório.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {repertoryItems.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há itens de repertório registrados para este grupo.</p>
            ) : (
              repertoryItems.map((item) => (
                <div key={String(item.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                      {item.resource_type === "artigo"
                        ? "Artigo"
                        : item.resource_type === "livro"
                          ? "Livro"
                          : item.resource_type === "site"
                            ? "Site"
                            : item.resource_type === "video"
                              ? "Vídeo"
                              : item.resource_type === "podcast"
                                ? "Podcast"
                                : "Outro"}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{item.description}</p>
                  )}

                  {item.resource_link && (
                    <a
                      href={item.resource_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-700 hover:underline break-all mt-1 inline-block"
                    >
                      {item.resource_link}
                    </a>
                  )}

                  {item.notes && (
                    <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">Observações: {item.notes}</p>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    {item.author_name} ({item.author_role === "advisor" ? "orientador" : item.author_role === "coordinator" ? "coordenação" : "estudante"})
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
              ))
            )}
          </div>

          {canManageRepertory && (
            <form action={handleAddRepertoryItem} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="repertory-title" className="block text-sm text-gray-700 mb-1">Título da referência</label>
                  <input
                    id="repertory-title"
                    name="title"
                    type="text"
                    placeholder="Ex.: Artigo sobre metodologia científica no ensino médio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="repertory-type" className="block text-sm text-gray-700 mb-1">Tipo</label>
                  <select
                    id="repertory-type"
                    name="resource_type"
                    defaultValue="outro"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="artigo">Artigo</option>
                    <option value="livro">Livro</option>
                    <option value="site">Site</option>
                    <option value="video">Vídeo</option>
                    <option value="podcast">Podcast</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="repertory-link" className="block text-sm text-gray-700 mb-1">Link da referência (opcional)</label>
                  <input
                    id="repertory-link"
                    name="resource_link"
                    type="url"
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="repertory-section" className="block text-sm text-gray-700 mb-1">Seção relacionada (opcional)</label>
                  <select
                    id="repertory-section"
                    name="section_id"
                    defaultValue=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Geral (sem seção específica)</option>
                    {sections.map((section) => (
                      <option key={String(section.id)} value={String(section.id)}>
                        {section.section_order}. {section.section_title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="repertory-description" className="block text-sm text-gray-700 mb-1">Descrição/síntese (opcional)</label>
                <textarea
                  id="repertory-description"
                  name="description"
                  rows={2}
                  placeholder="Resumo da contribuição da referência para o projeto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="repertory-notes" className="block text-sm text-gray-700 mb-1">Observações pedagógicas (opcional)</label>
                <textarea
                  id="repertory-notes"
                  name="notes"
                  rows={2}
                  placeholder="Ex.: usar este material como base para fundamentação teórica da seção 2."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Registrar item de repertório
              </button>
            </form>
          )}
          </div>
        </details>

        <div className="mb-6">
          <ProjectPreview
            groupId={id}
            title={previewTitle}
            summary={previewSummary}
            sections={previewSections}
            repertoryItems={previewRepertoryItems}
            photosCount={previewProcessPhotos.length}
            hasContent={hasPreviewContent}
          />
        </div>

        <details className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6" open={Boolean(query.guide_status)}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Guias interativos</h2>
              <p className="text-sm text-gray-600 mt-1">
                {interactiveGuides.length > 0
                  ? `${interactiveGuides.length} guia(s) disponível(is) para apoio pedagógico do grupo.`
                  : "Clique para expandir e cadastrar ou acompanhar guias interativos."}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-100">
              {interactiveGuides.length} guia(s)
            </span>
          </summary>

          <div className="mt-4">
          {query.guide_status === "success" && query.guide_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Guia interativo registrado com sucesso.
            </p>
          )}
          {query.guide_status === "success" && query.guide_action === "seed" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Microguias iniciais criados com sucesso ({query.guide_seeded || "0"} novo(s)).
            </p>
          )}
          {query.guide_status === "success" && query.guide_action === "progress" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Progresso do guia salvo com sucesso.
            </p>
          )}
          {query.guide_status === "noop" && query.guide_action === "seed" && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-3">
              Os microguias sugeridos já foram cadastrados para este grupo.
            </p>
          )}
          {query.guide_status === "invalid" && query.guide_action === "progress" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Para marcar como concluído, informe uma resposta com pelo menos 3 caracteres.
            </p>
          )}
          {query.guide_status === "invalid" && query.guide_action === "add" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos. Título e conteúdo devem ter pelo menos 3 caracteres.
            </p>
          )}
          {query.guide_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível registrar o guia interativo. Tente novamente.
            </p>
          )}
          {query.guide_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              É necessário estar autenticado para registrar guias interativos.
            </p>
          )}

          {canManageInteractiveGuides && (
            <form action={handleSeedDefaultInteractiveGuides} className="mb-4">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Popular microguias sugeridos (Fase 1)
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Cria automaticamente um conjunto inicial de microguias alinhados ao TCA sem duplicar títulos já existentes.
              </p>
            </form>
          )}

          <div className="space-y-2 mb-4">
            {interactiveGuides.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há guias interativos registrados para este grupo.</p>
            ) : (
              interactiveGuides.map((guide) => (
                (() => {
                  const guideProgress = interactiveGuidesProgress.filter(
                    (progress) => String(progress.guide_id) === String(guide.id)
                  );
                  const completedCount = guideProgress.filter((progress) => progress.status === "concluido").length;
                  const studentsWithResponse = guideProgress.filter((progress) => !!progress.response_text).length;
                  const currentStudentProgress = profile
                    ? guideProgress.find(
                        (progress) =>
                          progress.student_profile_id === profile.id && profile.role === "student"
                      )
                    : null;

                  return (
                    <div key={String(guide.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{guide.title}</p>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                          {guide.guide_type === "escrita"
                            ? "Escrita"
                            : guide.guide_type === "metodologia"
                              ? "Metodologia"
                              : guide.guide_type === "estrutura"
                                ? "Estrutura"
                                : guide.guide_type === "referencias"
                                  ? "Referências"
                                  : guide.guide_type === "apresentacao"
                                    ? "Apresentação"
                                    : "Outro"}
                        </span>
                      </div>

                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{guide.content}</p>

                      {guide.suggested_activity && (
                        <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">
                          Atividade sugerida: {guide.suggested_activity}
                        </p>
                      )}

                      <div className="mt-2 text-xs text-gray-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1">
                        Progresso do guia: {completedCount} conclusão(ões) • {studentsWithResponse} resposta(s) registrada(s)
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        Público: {guide.audience === "students" ? "Estudantes" : guide.audience === "advisors" ? "Orientadores" : "Todos"}
                        {guide.section_id ? ` • ${sectionTitleById.get(String(guide.section_id)) || "Seção"}` : " • Geral"}
                        {guide.author_name
                          ? ` • ${guide.author_name} (${guide.author_role === "advisor" ? "orientador" : guide.author_role === "coordinator" ? "coordenação" : "estudante"})`
                          : ""}
                        {guide.created_at
                          ? ` • ${new Date(guide.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>

                      {canRespondInteractiveGuides && (
                        <form action={handleUpsertInteractiveGuideProgress} className="mt-3 border-t border-gray-200 pt-3 space-y-2">
                          <input type="hidden" name="guide_id" value={String(guide.id)} />

                          <div>
                            <label
                              htmlFor={`guide-progress-status-${String(guide.id)}`}
                              className="block text-xs text-gray-700 mb-1"
                            >
                              Seu status neste guia
                            </label>
                            <select
                              id={`guide-progress-status-${String(guide.id)}`}
                              name="status"
                              defaultValue={currentStudentProgress?.status || "pendente"}
                              className="w-full md:w-60 px-3 py-2 border border-gray-300 rounded-md text-black bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pendente">Pendente</option>
                              <option value="concluido">Concluído</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`guide-progress-response-${String(guide.id)}`}
                              className="block text-xs text-gray-700 mb-1"
                            >
                              Sua resposta/produção (obrigatória ao concluir)
                            </label>
                            <textarea
                              id={`guide-progress-response-${String(guide.id)}`}
                              name="response_text"
                              rows={2}
                              defaultValue={currentStudentProgress?.response_text || ""}
                              placeholder="Ex.: Escrevemos a pergunta investigativa final e validamos com o grupo."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-2 rounded-md text-xs"
                          >
                            Salvar progresso deste guia
                          </button>
                        </form>
                      )}

                      {guideProgress.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                            Ver registros de progresso ({guideProgress.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                            {guideProgress.map((progress) => (
                              <div
                                key={`${String(guide.id)}-${String(progress.student_profile_id)}`}
                                className="text-xs text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white"
                              >
                                <p>
                                  <span className="font-medium">{progress.student_name}</span> — {progress.status === "concluido" ? "Concluído" : "Pendente"}
                                  {progress.completed_at
                                    ? ` • ${new Date(progress.completed_at).toLocaleString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}`
                                    : ""}
                                </p>
                                {progress.response_text && (
                                  <p className="text-gray-600 whitespace-pre-line mt-1">{progress.response_text}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })()
              ))
            )}
          </div>

          {canManageInteractiveGuides && (
            <form action={handleAddInteractiveGuide} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="interactive-guide-title" className="block text-sm text-gray-700 mb-1">Título do guia</label>
                  <input
                    id="interactive-guide-title"
                    name="title"
                    type="text"
                    placeholder="Ex.: Como estruturar a introdução com problema, objetivo e justificativa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="interactive-guide-type" className="block text-sm text-gray-700 mb-1">Tipo</label>
                  <select
                    id="interactive-guide-type"
                    name="guide_type"
                    defaultValue="outro"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="escrita">Escrita</option>
                    <option value="metodologia">Metodologia</option>
                    <option value="estrutura">Estrutura</option>
                    <option value="referencias">Referências</option>
                    <option value="apresentacao">Apresentação</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="interactive-guide-audience" className="block text-sm text-gray-700 mb-1">Público</label>
                  <select
                    id="interactive-guide-audience"
                    name="audience"
                    defaultValue="todos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="students">Estudantes</option>
                    <option value="advisors">Orientadores</option>
                    <option value="todos">Todos</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="interactive-guide-section" className="block text-sm text-gray-700 mb-1">Seção relacionada (opcional)</label>
                  <select
                    id="interactive-guide-section"
                    name="section_id"
                    defaultValue=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Geral (sem seção específica)</option>
                    {sections.map((section) => (
                      <option key={String(section.id)} value={String(section.id)}>
                        {section.section_order}. {section.section_title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="interactive-guide-content" className="block text-sm text-gray-700 mb-1">Conteúdo do guia</label>
                <textarea
                  id="interactive-guide-content"
                  name="content"
                  rows={3}
                  placeholder="Escreva orientações práticas que possam ser usadas diretamente pelo grupo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="interactive-guide-activity" className="block text-sm text-gray-700 mb-1">Atividade sugerida (opcional)</label>
                <textarea
                  id="interactive-guide-activity"
                  name="suggested_activity"
                  rows={2}
                  placeholder="Ex.: Produzir um parágrafo de justificativa e revisar em dupla seguindo os critérios do guia."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Registrar guia interativo
              </button>
            </form>
          )}
          </div>
        </details>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Feedback pedagógico com IA</h2>

          {query.ai_feedback_status === "success" && query.ai_feedback_action === "generate" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Feedback pedagógico gerado e registrado com sucesso.
            </p>
          )}
          {query.ai_feedback_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos. Escolha uma seção com conteúdo mínimo para gerar o feedback.
            </p>
          )}
          {query.ai_feedback_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível gerar o feedback com IA. Verifique a configuração das variáveis de ambiente e tente novamente.
            </p>
          )}
          {query.ai_feedback_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Apenas orientadores (ou coordenação) podem gerar feedback pedagógico com IA.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {aiFeedbackItems.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há feedback pedagógico com IA registrado para este grupo.</p>
            ) : (
              aiFeedbackItems.map((item) => (
                <div key={String(item.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                  <p className="text-sm text-gray-900 whitespace-pre-line">{item.feedback_text}</p>

                  {item.strengths && (
                    <p className="text-xs text-green-700 mt-2 whitespace-pre-line">
                      <span className="font-semibold">Pontos fortes:</span> {item.strengths}
                    </p>
                  )}

                  {item.improvements && (
                    <p className="text-xs text-amber-700 mt-1 whitespace-pre-line">
                      <span className="font-semibold">Melhorias sugeridas:</span> {item.improvements}
                    </p>
                  )}

                  {item.suggested_next_steps && (
                    <p className="text-xs text-blue-700 mt-1 whitespace-pre-line">
                      <span className="font-semibold">Próximos passos:</span> {item.suggested_next_steps}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    {item.section_id ? `Seção: ${sectionTitleById.get(String(item.section_id)) || "Seção"}` : "Seção: Geral"}
                    {item.model_name ? ` • Modelo: ${item.model_name}` : ""}
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
              ))
            )}
          </div>

          {canManageAIFeedback && (
            <form action={handleGenerateAIFeedback} className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label htmlFor="ai-feedback-section" className="block text-sm text-gray-700 mb-1">Seção para análise</label>
                <select
                  id="ai-feedback-section"
                  name="section_id"
                  defaultValue=""
                  className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma seção...</option>
                  {sections.map((section) => (
                    <option key={String(section.id)} value={String(section.id)}>
                      {section.section_order}. {section.section_title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ai-feedback-focus" className="block text-sm text-gray-700 mb-1">Foco do feedback (opcional)</label>
                <textarea
                  id="ai-feedback-focus"
                  name="focus_prompt"
                  rows={2}
                  placeholder="Ex.: avaliar clareza da justificativa e coerência dos objetivos específicos."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Gerar feedback com IA
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Indicador de autoria</h2>

          {query.authorship_status === "success" && query.authorship_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Indicador de autoria registrado com sucesso.
            </p>
          )}
          {query.authorship_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos. Os percentuais devem totalizar 100 e a base da análise deve ter pelo menos 3 caracteres.
            </p>
          )}
          {query.authorship_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível registrar o indicador de autoria. Tente novamente.
            </p>
          )}
          {query.authorship_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Apenas orientadores (ou coordenação) podem registrar indicador de autoria.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {sections.length === 0 ? (
              <p className="text-sm text-gray-500">Não há seções disponíveis para calcular autoria.</p>
            ) : (
              sections.map((section) => {
                const latest = latestAuthorshipBySection.get(String(section.id));
                const suggestion = getSuggestedAuthorshipPercentages(String(section.id));

                return (
                  <div key={`authorship-${String(section.id)}`} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">
                      {section.section_order}. {section.section_title}
                    </p>

                    {latest ? (
                      <>
                        <p className="text-xs text-gray-700 mt-1">
                          Último indicador: Estudantes {latest.student_percent}% • Orientador {latest.advisor_percent}% • Coordenação {latest.coordinator_percent}%
                        </p>
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">Base: {latest.analysis_basis}</p>
                        {latest.recommendation && (
                          <p className="text-xs text-blue-700 mt-1 whitespace-pre-line">Recomendação: {latest.recommendation}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Nenhum indicador manual registrado ainda para esta seção.</p>
                    )}

                    <p className="text-xs text-indigo-700 mt-1">
                      Sugestão automática (pelo histórico de versões): Estudantes {suggestion.student}% • Orientador {suggestion.advisor}% • Coordenação {suggestion.coordinator}%
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {canManageAuthorshipIndicator && (
            <form action={handleAddAuthorshipIndicator} className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label htmlFor="authorship-section" className="block text-sm text-gray-700 mb-1">Seção para análise</label>
                <select
                  id="authorship-section"
                  name="section_id"
                  defaultValue={query.authorship_section || ""}
                  className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma seção...</option>
                  {sections.map((section) => (
                    <option key={String(section.id)} value={String(section.id)}>
                      {section.section_order}. {section.section_title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="authorship-student" className="block text-sm text-gray-700 mb-1">Estudantes (%)</label>
                  <input
                    id="authorship-student"
                    name="student_percent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="authorship-advisor" className="block text-sm text-gray-700 mb-1">Orientador (%)</label>
                  <input
                    id="authorship-advisor"
                    name="advisor_percent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="authorship-coordinator" className="block text-sm text-gray-700 mb-1">Coordenação (%)</label>
                  <input
                    id="authorship-coordinator"
                    name="coordinator_percent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="authorship-basis" className="block text-sm text-gray-700 mb-1">Base da análise</label>
                <textarea
                  id="authorship-basis"
                  name="analysis_basis"
                  rows={2}
                  placeholder="Ex.: análise baseada no histórico de versões, participação em encontros e qualidade da produção escrita."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                />
              </div>

              <div>
                <label htmlFor="authorship-recommendation" className="block text-sm text-gray-700 mb-1">Recomendação pedagógica (opcional)</label>
                <textarea
                  id="authorship-recommendation"
                  name="recommendation"
                  rows={2}
                  placeholder="Ex.: reforçar registro individual de contribuição em cada entrega parcial."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Registrar indicador de autoria
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notificações internas do sistema</h2>

          {query.notification_status === "success" && query.notification_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Notificação interna registrada com sucesso.
            </p>
          )}
          {query.notification_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos para notificação. Revise título e mensagem.
            </p>
          )}
          {query.notification_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível registrar a notificação interna. Tente novamente.
            </p>
          )}
          {query.notification_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Apenas orientadores (ou coordenação) podem registrar notificações internas nesta etapa.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {internalNotifications.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há notificações internas para este grupo.</p>
            ) : (
              internalNotifications.map((notification) => (
                <div key={String(notification.id)} className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.author_name} ({notification.author_role === "advisor" ? "orientador" : "coordenação"})
                        {notification.section_id
                          ? ` • ${sectionTitleById.get(String(notification.section_id)) || "Seção"}`
                          : " • Geral"}
                        {notification.created_at
                          ? ` • ${new Date(notification.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        notification.notification_type === "prazo"
                          ? "bg-amber-100 text-amber-700"
                          : notification.notification_type === "encontro"
                            ? "bg-blue-100 text-blue-700"
                            : notification.notification_type === "orientacao"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {notification.notification_type === "prazo"
                        ? "Prazo"
                        : notification.notification_type === "encontro"
                          ? "Encontro"
                          : notification.notification_type === "orientacao"
                            ? "Orientação"
                            : "Aviso"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {canManageInternalNotifications && (
            <form action={handleAddInternalNotification} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="notification-type" className="block text-sm text-gray-700 mb-1">Tipo</label>
                  <select
                    id="notification-type"
                    name="notification_type"
                    defaultValue="aviso"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="aviso">Aviso</option>
                    <option value="prazo">Prazo</option>
                    <option value="encontro">Encontro</option>
                    <option value="orientacao">Orientação</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notification-section" className="block text-sm text-gray-700 mb-1">Seção (opcional)</label>
                  <select
                    id="notification-section"
                    name="section_id"
                    defaultValue=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Geral (sem seção específica)</option>
                    {sections.map((section) => (
                      <option key={String(section.id)} value={String(section.id)}>
                        {section.section_order}. {section.section_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="notification-title" className="block text-sm text-gray-700 mb-1">Título</label>
                  <input
                    id="notification-title"
                    name="title"
                    type="text"
                    placeholder="Ex.: Atualização do cronograma"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notification-message" className="block text-sm text-gray-700 mb-1">Mensagem</label>
                <textarea
                  id="notification-message"
                  name="message"
                  rows={3}
                  placeholder="Descreva a notificação para o grupo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Publicar notificação interna
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Agenda de encontros presenciais</h2>

          {query.meeting_status === "success" && query.meeting_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Encontro presencial cadastrado com sucesso.
            </p>
          )}
          {query.meeting_status === "success" && query.meeting_action === "status" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Status do encontro atualizado com sucesso.
            </p>
          )}
          {query.meeting_status === "invalid" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Dados inválidos para agenda de encontros. Revise e tente novamente.
            </p>
          )}
          {query.meeting_status === "error" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Não foi possível salvar a agenda de encontros. Tente novamente.
            </p>
          )}
          {query.meeting_status === "forbidden" && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              Apenas orientadores (ou coordenação) podem alterar a agenda de encontros nesta etapa.
            </p>
          )}

          <div className="space-y-2 mb-4">
            {inPersonMeetings.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há encontros presenciais registrados para este grupo.</p>
            ) : (
              inPersonMeetings.map((meeting) => (
                <div key={String(meeting.id)} className="border border-gray-100 rounded-md px-3 py-3 bg-gray-50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{meeting.agenda}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(`${meeting.meeting_date}T00:00:00`).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {meeting.meeting_time ? ` • ${meeting.meeting_time.slice(0, 5)}` : ""}
                        {meeting.location ? ` • ${meeting.location}` : ""}
                      </p>
                      {meeting.notes && (
                        <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">{meeting.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {meeting.author_name} ({meeting.author_role === "advisor" ? "orientador" : "coordenação"})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          meeting.status === "realizado"
                            ? "bg-green-100 text-green-700"
                            : meeting.status === "cancelado"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {meeting.status === "realizado"
                          ? "Realizado"
                          : meeting.status === "cancelado"
                            ? "Cancelado"
                            : "Agendado"}
                      </span>

                      {canManageMeetings && (
                        <form action={handleUpdateMeetingStatus} className="flex items-center gap-1">
                          <input type="hidden" name="meeting_id" value={String(meeting.id)} />
                          <select
                            name="next_status"
                            defaultValue={meeting.status}
                            className="px-2 py-1 border border-gray-300 rounded-md text-xs text-black bg-white"
                          >
                            <option value="agendado">Agendado</option>
                            <option value="realizado">Realizado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                          <button
                            type="submit"
                            className="text-xs font-medium px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                          >
                            Atualizar
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {canManageMeetings && (
            <form action={handleAddInPersonMeeting} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="meeting-date" className="block text-sm text-gray-700 mb-1">Data</label>
                  <input
                    id="meeting-date"
                    name="meeting_date"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="meeting-time" className="block text-sm text-gray-700 mb-1">Horário (opcional)</label>
                  <input
                    id="meeting-time"
                    name="meeting_time"
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="meeting-location" className="block text-sm text-gray-700 mb-1">Local (opcional)</label>
                  <input
                    id="meeting-location"
                    name="location"
                    type="text"
                    placeholder="Ex.: Sala 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="meeting-agenda" className="block text-sm text-gray-700 mb-1">Objetivo/Pauta</label>
                <textarea
                  id="meeting-agenda"
                  name="agenda"
                  rows={2}
                  placeholder="Ex.: Revisar andamento da seção 3 e definir tarefas da semana."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="meeting-notes" className="block text-sm text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  id="meeting-notes"
                  name="notes"
                  rows={2}
                  placeholder="Ex.: Levar versão impressa do roteiro para discussão."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Agendar encontro presencial
              </button>
            </form>
          )}
        </div>

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
          {query.checklist_status === "success" && query.checklist_action === "generate_ai" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              IA simulada gerou {query.checklist_generated || "novos"} item(ns) para o checklist com sucesso.
            </p>
          )}
          {query.checklist_status === "noop" && query.checklist_action === "generate_ai" && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-3">
              A IA simulada não encontrou novos itens agora. O checklist já cobre os próximos passos mais prováveis.
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
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="rounded-md border border-violet-200 bg-violet-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-violet-900">IA simulada para gerar checklist</p>
                    <p className="text-sm text-violet-800 mt-1 max-w-3xl">
                      A sugestão usa o status das seções e o volume de conteúdo já registrado para propor próximos passos pedagógicos.
                    </p>
                  </div>

                  <form action={handleGenerateSimulatedChecklist}>
                    <button
                      type="submit"
                      className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                    >
                      Gerar checklist com IA simulada
                    </button>
                  </form>
                </div>

                <div className="mt-4">
                  {simulatedChecklistSuggestions.length === 0 ? (
                    <p className="text-sm text-violet-900/90">
                      No momento, a IA simulada não identificou novos itens além dos que já estão registrados no checklist.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-2">
                        Prévia das próximas sugestões
                      </p>
                      <ul className="space-y-2">
                        {simulatedChecklistSuggestions.slice(0, 4).map((suggestion) => (
                          <li
                            key={`${String(suggestion.section_id ?? "geral")}-${suggestion.item_text}`}
                            className="text-sm text-gray-800 bg-white/80 border border-violet-100 rounded-md px-3 py-2"
                          >
                            <span className="font-medium text-violet-900 mr-2">
                              {suggestion.priority === "alta"
                                ? "Prioridade alta"
                                : suggestion.priority === "media"
                                  ? "Prioridade média"
                                  : "Prioridade baixa"}
                              :
                            </span>
                            {suggestion.item_text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <form action={handleAddChecklistItem} className="space-y-3">
                <div>
                  <label htmlFor="checklist-item-text" className="block text-sm text-gray-700 mb-1">
                    Novo item manual
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
            </div>
          )}
        </div>

      </section>
    </main>
  );
}
