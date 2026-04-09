import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectSectionAuthorshipIndicatorData,
  ProjectSectionAuthorshipIndicator,
} from "@/types/project-section-authorship-indicator";

function isAuthorshipTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_authorship_indicators'");
}

function isAuthorshipPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapAuthorshipError(message: string, code?: string) {
  if (isAuthorshipTableMissing(message)) {
    return "Tabela group_project_section_authorship_indicators ainda não existe no Supabase. Execute o arquivo local database/025_create_group_project_section_authorship_indicators.sql no SQL Editor.";
  }

  if (isAuthorshipPermissionDenied(message, code)) {
    return "Acesso ao indicador de autoria bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchProjectSectionAuthorshipIndicators(
  groupId: string
): Promise<ProjectSectionAuthorshipIndicator[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_authorship_indicators")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapAuthorshipError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar indicador de autoria: ${error.message}`);
  }

  return (data || []) as ProjectSectionAuthorshipIndicator[];
}

export async function createProjectSectionAuthorshipIndicator(
  data: CreateProjectSectionAuthorshipIndicatorData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_authorship_indicators")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      student_percent: data.student_percent,
      advisor_percent: data.advisor_percent,
      coordinator_percent: data.coordinator_percent,
      analysis_basis: data.analysis_basis,
      recommendation: data.recommendation,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapAuthorshipError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao registrar indicador de autoria: ${error.message}`);
  }
}
