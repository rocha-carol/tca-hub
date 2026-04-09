import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectSectionQuestionData,
  ProjectSectionQuestion,
} from "@/types/project-section-question";

function isProjectSectionQuestionsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_questions'");
}

function isProjectSectionQuestionsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapProjectSectionQuestionsError(message: string, code?: string) {
  if (isProjectSectionQuestionsTableMissing(message)) {
    return "Tabela group_project_section_questions ainda não existe no Supabase. Execute o arquivo local database/012_create_project_section_questions.sql no SQL Editor.";
  }

  if (isProjectSectionQuestionsPermissionDenied(message, code)) {
    return "Acesso às dúvidas das seções bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSectionQuestions(
  groupId: string
): Promise<ProjectSectionQuestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_questions")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    const mapped = mapProjectSectionQuestionsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar dúvidas das seções: ${error.message}`);
  }

  return (data || []) as ProjectSectionQuestion[];
}

export async function createProjectSectionQuestion(
  data: CreateProjectSectionQuestionData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_questions")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
      question: data.question,
    });

  if (error) {
    const mapped = mapProjectSectionQuestionsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar dúvida da seção: ${error.message}`);
  }
}
