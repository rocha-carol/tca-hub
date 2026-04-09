import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectSectionNextStepData,
  ProjectSectionNextStep,
} from "@/types/project-section-next-step";

function isProjectSectionNextStepsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_next_steps'");
}

function isProjectSectionNextStepsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapProjectSectionNextStepsError(message: string, code?: string) {
  if (isProjectSectionNextStepsTableMissing(message)) {
    return "Tabela group_project_section_next_steps ainda não existe no Supabase. Execute o arquivo local database/014_create_project_section_next_steps.sql no SQL Editor.";
  }

  if (isProjectSectionNextStepsPermissionDenied(message, code)) {
    return "Acesso aos próximos passos bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSectionNextSteps(
  groupId: string
): Promise<ProjectSectionNextStep[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_next_steps")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    const mapped = mapProjectSectionNextStepsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar próximos passos: ${error.message}`);
  }

  return (data || []) as ProjectSectionNextStep[];
}

export async function createProjectSectionNextStep(
  data: CreateProjectSectionNextStepData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_next_steps")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
      next_steps: data.next_steps,
    });

  if (error) {
    const mapped = mapProjectSectionNextStepsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar próximos passos: ${error.message}`);
  }
}
