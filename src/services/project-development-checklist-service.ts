import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectDevelopmentChecklistItemData,
  ProjectDevelopmentChecklistItem,
  ProjectDevelopmentChecklistStatus,
} from "@/types/project-development-checklist-item";

function isChecklistTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_development_checklist_items'");
}

function isChecklistPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapChecklistError(message: string, code?: string) {
  if (isChecklistTableMissing(message)) {
    return "Tabela group_project_development_checklist_items ainda não existe no Supabase. Execute o arquivo local database/015_create_project_development_checklist_items.sql no SQL Editor.";
  }

  if (isChecklistPermissionDenied(message, code)) {
    return "Acesso ao checklist de desenvolvimento bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectDevelopmentChecklistItems(
  groupId: string
): Promise<ProjectDevelopmentChecklistItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_development_checklist_items")
    .select("*")
    .eq("group_id", groupId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    const mapped = mapChecklistError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar checklist de desenvolvimento: ${error.message}`);
  }

  return (data || []) as ProjectDevelopmentChecklistItem[];
}

export async function createProjectDevelopmentChecklistItem(
  data: CreateProjectDevelopmentChecklistItemData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_development_checklist_items")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      item_text: data.item_text,
      status: "pendente",
      created_by_profile_id: data.created_by_profile_id,
      created_by_role: data.created_by_role,
      created_by_name: data.created_by_name,
    });

  if (error) {
    const mapped = mapChecklistError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao criar item do checklist: ${error.message}`);
  }
}

export async function updateProjectDevelopmentChecklistItemStatus(
  itemId: string | number,
  status: ProjectDevelopmentChecklistStatus
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_development_checklist_items")
    .update({
      status,
      completed_at: status === "concluido" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    const mapped = mapChecklistError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao atualizar item do checklist: ${error.message}`);
  }
}
