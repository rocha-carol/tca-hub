import { createClient } from "@/lib/supabase/server";
import type { GroupAdvisorPreference } from "@/types/group-advisor-preference";

function isPreferencesTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_advisor_preferences'");
}

function isPreferencesPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

export async function fetchGroupAdvisorPreferences(groupId: string): Promise<GroupAdvisorPreference[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_advisor_preferences")
    .select("*")
    .eq("group_id", groupId)
    .order("preference_order", { ascending: true });

  if (error) {
    if (isPreferencesTableMissing(error.message)) {
      throw new Error(
        "Tabela group_advisor_preferences ainda não existe no Supabase. Execute o arquivo local database/007_create_group_advisor_preferences.sql no SQL Editor."
      );
    }

    if (isPreferencesPermissionDenied(error.message, error.code)) {
      throw new Error(
        "Leitura de preferências de orientadores bloqueada por policy/RLS no Supabase. Garanta policy SELECT para usuários autenticados."
      );
    }

    throw new Error(`Erro ao buscar preferências de orientadores: ${error.message}`);
  }

  return (data || []) as GroupAdvisorPreference[];
}

export async function replaceGroupAdvisorPreferences(
  groupId: string,
  advisorIdsInOrder: Array<string | number>
): Promise<void> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("group_advisor_preferences")
    .delete()
    .eq("group_id", groupId);

  if (deleteError) {
    if (isPreferencesTableMissing(deleteError.message)) {
      throw new Error(
        "Tabela group_advisor_preferences ainda não existe no Supabase. Execute o arquivo local database/007_create_group_advisor_preferences.sql no SQL Editor."
      );
    }

    if (isPreferencesPermissionDenied(deleteError.message, deleteError.code)) {
      throw new Error(
        "Edição de preferências bloqueada por policy/RLS no Supabase. Garanta policy DELETE para usuários autenticados."
      );
    }

    throw new Error(`Erro ao limpar preferências anteriores: ${deleteError.message}`);
  }

  if (advisorIdsInOrder.length === 0) {
    return;
  }

  const payload = advisorIdsInOrder.map((advisorId, index) => ({
    group_id: groupId,
    advisor_id: advisorId,
    preference_order: index + 1,
  }));

  const { error: insertError } = await supabase
    .from("group_advisor_preferences")
    .insert(payload);

  if (insertError) {
    if (isPreferencesTableMissing(insertError.message)) {
      throw new Error(
        "Tabela group_advisor_preferences ainda não existe no Supabase. Execute o arquivo local database/007_create_group_advisor_preferences.sql no SQL Editor."
      );
    }

    if (isPreferencesPermissionDenied(insertError.message, insertError.code)) {
      throw new Error(
        "Edição de preferências bloqueada por policy/RLS no Supabase. Garanta policy INSERT para usuários autenticados."
      );
    }

    throw new Error(`Erro ao salvar preferências de orientadores: ${insertError.message}`);
  }
}
