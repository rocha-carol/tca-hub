import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectSectionQuestionAnswerData,
  ProjectSectionQuestionAnswer,
} from "@/types/project-section-question-answer";

function isProjectSectionQuestionAnswersTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_question_answers'");
}

function isProjectSectionQuestionAnswersPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapProjectSectionQuestionAnswersError(message: string, code?: string) {
  if (isProjectSectionQuestionAnswersTableMissing(message)) {
    return "Tabela group_project_section_question_answers ainda não existe no Supabase. Execute o arquivo local database/013_create_project_section_question_answers.sql no SQL Editor.";
  }

  if (isProjectSectionQuestionAnswersPermissionDenied(message, code)) {
    return "Acesso às respostas das dúvidas bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSectionQuestionAnswers(
  groupId: string
): Promise<ProjectSectionQuestionAnswer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_question_answers")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    const mapped = mapProjectSectionQuestionAnswersError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar respostas das dúvidas: ${error.message}`);
  }

  return (data || []) as ProjectSectionQuestionAnswer[];
}

export async function createProjectSectionQuestionAnswer(
  data: CreateProjectSectionQuestionAnswerData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_question_answers")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      question_id: data.question_id,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
      answer: data.answer,
    });

  if (error) {
    const mapped = mapProjectSectionQuestionAnswersError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar resposta da dúvida: ${error.message}`);
  }
}
