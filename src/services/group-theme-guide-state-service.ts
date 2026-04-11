import { createClient } from "@/lib/supabase/server";
import type {
  GroupThemeGuideState,
  UpsertGroupThemeGuideStateData,
} from "@/types/group-theme-guide-state";

function isThemeGuideStateTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_theme_guide_state'");
}

function isThemeGuideStatePermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapThemeGuideStateError(message: string, code?: string) {
  if (isThemeGuideStateTableMissing(message)) {
    return "Tabela group_theme_guide_state ainda não existe no Supabase. Execute o arquivo local database/030_create_group_theme_guide_state.sql no SQL Editor.";
  }

  if (isThemeGuideStatePermissionDenied(message, code)) {
    return "Acesso ao estado compartilhado do guia de tema bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupThemeGuideState(groupId: string): Promise<GroupThemeGuideState | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_theme_guide_state")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  if (error) {
    const mapped = mapThemeGuideStateError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar estado compartilhado do guia de tema: ${error.message}`);
  }

  return (data || null) as GroupThemeGuideState | null;
}

export async function upsertGroupThemeGuideState(
  data: UpsertGroupThemeGuideStateData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_theme_guide_state")
    .upsert(
      {
        group_id: data.group_id,
        checks: data.checks,
        selected_category: data.selected_category,
        selected_interest_tags: data.selected_interest_tags,
        draft_notes: data.draft_notes,
        ai_suggestions: data.ai_suggestions,
        updated_by_profile_id: data.updated_by_profile_id,
        updated_by_name: data.updated_by_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" }
    );

  if (error) {
    const mapped = mapThemeGuideStateError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar estado compartilhado do guia de tema: ${error.message}`);
  }
}
