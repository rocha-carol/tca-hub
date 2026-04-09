import { createClient } from "@/lib/supabase/server";
import type {
  CreateGroupRepertoryItemData,
  GroupRepertoryItem,
} from "@/types/group-repertory-item";

function isRepertoryTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_repertory_items'");
}

function isRepertoryPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapRepertoryError(message: string, code?: string) {
  if (isRepertoryTableMissing(message)) {
    return "Tabela group_repertory_items ainda não existe no Supabase. Execute o arquivo local database/021_create_group_repertory_items.sql no SQL Editor.";
  }

  if (isRepertoryPermissionDenied(message, code)) {
    return "Acesso ao repertório bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupRepertoryItems(groupId: string): Promise<GroupRepertoryItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_repertory_items")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapRepertoryError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar repertório: ${error.message}`);
  }

  return (data || []) as GroupRepertoryItem[];
}

export async function createGroupRepertoryItem(data: CreateGroupRepertoryItemData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_repertory_items")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      title: data.title,
      description: data.description,
      resource_type: data.resource_type,
      resource_link: data.resource_link,
      notes: data.notes,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapRepertoryError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao registrar item de repertório: ${error.message}`);
  }
}
