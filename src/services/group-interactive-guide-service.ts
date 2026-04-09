import { createClient } from "@/lib/supabase/server";
import type {
  CreateGroupInteractiveGuideData,
  GroupInteractiveGuide,
} from "@/types/group-interactive-guide";

function isInteractiveGuidesTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_interactive_guides'");
}

function isInteractiveGuidesPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapInteractiveGuidesError(message: string, code?: string) {
  if (isInteractiveGuidesTableMissing(message)) {
    return "Tabela group_interactive_guides ainda não existe no Supabase. Execute o arquivo local database/022_create_group_interactive_guides.sql no SQL Editor.";
  }

  if (isInteractiveGuidesPermissionDenied(message, code)) {
    return "Acesso aos guias interativos bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupInteractiveGuides(groupId: string): Promise<GroupInteractiveGuide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_interactive_guides")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapInteractiveGuidesError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar guias interativos: ${error.message}`);
  }

  return (data || []) as GroupInteractiveGuide[];
}

export async function createGroupInteractiveGuide(data: CreateGroupInteractiveGuideData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_interactive_guides")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      title: data.title,
      guide_type: data.guide_type,
      content: data.content,
      suggested_activity: data.suggested_activity,
      audience: data.audience,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapInteractiveGuidesError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao registrar guia interativo: ${error.message}`);
  }
}
