import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectSectionVersionData,
  ProjectSectionVersion,
} from "@/types/project-section-version";

function isSectionVersionsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_versions'");
}

function isSectionVersionsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapSectionVersionsError(message: string, code?: string) {
  if (isSectionVersionsTableMissing(message)) {
    return "Tabela group_project_section_versions ainda não existe no Supabase. Execute o arquivo local database/024_create_group_project_section_versions.sql no SQL Editor.";
  }

  if (isSectionVersionsPermissionDenied(message, code)) {
    return "Acesso ao histórico de versões bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSectionVersions(groupId: string): Promise<ProjectSectionVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_versions")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapSectionVersionsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar histórico de versões: ${error.message}`);
  }

  return (data || []) as ProjectSectionVersion[];
}

export async function createProjectSectionVersion(
  data: CreateProjectSectionVersionData
): Promise<void> {
  const supabase = await createClient();

  const { data: latestVersion, error: latestError } = await supabase
    .from("group_project_section_versions")
    .select("version_number")
    .eq("section_id", data.section_id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    const mapped = mapSectionVersionsError(latestError.message, latestError.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar última versão da seção: ${latestError.message}`);
  }

  const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

  const { error } = await supabase
    .from("group_project_section_versions")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      version_number: nextVersionNumber,
      content: data.content,
      status: data.status,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapSectionVersionsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao registrar versão da seção: ${error.message}`);
  }
}
