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
  createGroupAIFeedback,
  fetchGroupAIFeedback,
} from "@/services/group-ai-feedback-service";
import {
  createProjectSectionVersion,
  fetchGroupProjectSectionVersions,
} from "@/services/project-section-version-service";
import { fetchGroupById } from "@/services/group-service";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { generatePedagogicalFeedbackWithAI } from "@/lib/ai/pedagogical-feedback-service";
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
    ai_feedback_status?: string;
    ai_feedback_action?: string;
    ai_feedback_section?: string;
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
  const canManageSchedule = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageMeetings = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageInternalNotifications = profile?.role === "advisor" || profile?.role === "coordinator";
  const canManageFinalProduct = !!profile;
  const canManageProcessPhotos = !!profile;
  const canManageRepertory = !!profile;
  const canManageInteractiveGuides = !!profile;
  const canManageAIFeedback = profile?.role === "advisor" || profile?.role === "coordinator";
  const canAskAsStudent = profile?.role === "student";

  const group = await fetchGroupById(id);
  if (!group) {
    notFound();
  }

  async function handleUpdateSection(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile) {
      redirect(`/groups/${id}/project?section_status=forbidden`);
    }

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

  async function handleUpsertSectionSchedule(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?schedule_status=forbidden`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?meeting_status=forbidden&meeting_action=add`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?meeting_status=forbidden&meeting_action=status`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?notification_status=forbidden&notification_action=add`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile) {
      redirect(`/groups/${id}/project?final_product_status=forbidden`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile) {
      redirect(`/groups/${id}/project?photo_status=forbidden&photo_action=add`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile) {
      redirect(`/groups/${id}/project?repertory_status=forbidden&repertory_action=add`);
    }

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

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile) {
      redirect(`/groups/${id}/project?guide_status=forbidden&guide_action=add`);
    }

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

  async function handleGenerateAIFeedback(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}/project?ai_feedback_status=forbidden&ai_feedback_action=generate`);
    }

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
  let aiFeedbackItems = [] as Awaited<ReturnType<typeof fetchGroupAIFeedback>>;
  let aiFeedbackError: string | null = null;
  let sectionVersions = [] as Awaited<ReturnType<typeof fetchGroupProjectSectionVersions>>;
  let sectionVersionsError: string | null = null;

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
    aiFeedbackItems = await fetchGroupAIFeedback(id);
  } catch (error) {
    aiFeedbackError = error instanceof Error ? error.message : "Erro ao carregar feedback pedagógico com IA.";
  }

  try {
    sectionVersions = await fetchGroupProjectSectionVersions(id);
  } catch (error) {
    sectionVersionsError = error instanceof Error ? error.message : "Erro ao carregar histórico de versões.";
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

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Módulo de produto final</h2>

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
              Status: {finalProduct?.status === "finalizado" ? "Finalizado" : "Rascunho"}
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Salvar produto final
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Fotos do processo</h2>

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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Registrar foto do processo
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Exploração de repertório</h2>

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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Registrar item de repertório
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Guias interativos</h2>

          {query.guide_status === "success" && query.guide_action === "add" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
              Guia interativo registrado com sucesso.
            </p>
          )}
          {query.guide_status === "invalid" && (
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

          <div className="space-y-2 mb-4">
            {interactiveGuides.length === 0 ? (
              <p className="text-sm text-gray-500">Ainda não há guias interativos registrados para este grupo.</p>
            ) : (
              interactiveGuides.map((guide) => (
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
                </div>
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
                {(() => {
                  const schedule = stageScheduleBySection.get(String(section.id));
                  return (
                    <div className="mb-4 p-3 rounded-md border border-blue-100 bg-blue-50">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm font-semibold text-blue-900">Cronograma da etapa</p>
                        <p className="text-xs text-blue-700">
                          Prazo atual: {schedule?.due_date
                            ? new Date(`${schedule.due_date}T00:00:00`).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "Não definido"}
                        </p>
                      </div>

                      {schedule?.notes && (
                        <p className="text-xs text-blue-800 mt-1 whitespace-pre-line">{schedule.notes}</p>
                      )}

                      {query.schedule_status === "success" && query.schedule_section === String(section.id) && (
                        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mt-2">
                          Cronograma atualizado com sucesso.
                        </p>
                      )}
                      {query.schedule_status === "invalid" && query.schedule_section === String(section.id) && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
                          Data inválida. Informe um prazo no formato correto.
                        </p>
                      )}
                      {query.schedule_status === "error" && query.schedule_section === String(section.id) && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
                          Não foi possível salvar o cronograma desta etapa. Tente novamente.
                        </p>
                      )}
                      {query.schedule_status === "forbidden" && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
                          Apenas orientadores (ou coordenação) podem alterar o cronograma nesta etapa.
                        </p>
                      )}

                      {canManageSchedule && (
                        <form action={handleUpsertSectionSchedule} className="mt-3 grid gap-2">
                          <input type="hidden" name="section_id" value={String(section.id)} />

                          <div>
                            <label htmlFor={`due-date-${section.id}`} className="block text-xs text-blue-900 mb-1">
                              Prazo da etapa
                            </label>
                            <input
                              id={`due-date-${section.id}`}
                              name="due_date"
                              type="date"
                              defaultValue={schedule?.due_date || ""}
                              className="w-full md:w-64 px-3 py-2 border border-blue-200 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label htmlFor={`schedule-notes-${section.id}`} className="block text-xs text-blue-900 mb-1">
                              Observações do prazo (opcional)
                            </label>
                            <textarea
                              id={`schedule-notes-${section.id}`}
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
                      )}
                    </div>
                  );
                })()}

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
                {query.section_status === "forbidden" && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                    É necessário estar autenticado para salvar alterações na seção.
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

                <div className="mt-4 p-3 border border-gray-100 rounded-md bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Histórico de versões da seção</p>

                  {(versionsBySection.get(String(section.id)) || []).length === 0 ? (
                    <p className="text-xs text-gray-500">Nenhuma versão registrada ainda para esta seção.</p>
                  ) : (
                    <div className="space-y-2">
                      {(versionsBySection.get(String(section.id)) || []).slice(0, 5).map((version) => (
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
                            {` • Status: ${getStatusLabel(version.status)}`}
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
