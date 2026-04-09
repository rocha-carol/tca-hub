import { createClient } from "@/lib/supabase/server";
import type {
  GroupInteractiveGuideProgress,
  UpsertGroupInteractiveGuideProgressData,
} from "@/types/group-interactive-guide-progress";

function isInteractiveGuideProgressTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_interactive_guide_progress'");
}

function isInteractiveGuideProgressPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapInteractiveGuideProgressError(message: string, code?: string) {
  if (isInteractiveGuideProgressTableMissing(message)) {
    return "Tabela group_interactive_guide_progress ainda não existe no Supabase. Execute o arquivo local database/026_create_group_interactive_guide_progress.sql no SQL Editor.";
  }

  if (isInteractiveGuideProgressPermissionDenied(message, code)) {
    return "Acesso ao progresso dos guias interativos bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupInteractiveGuideProgress(
  groupId: string
): Promise<GroupInteractiveGuideProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_interactive_guide_progress")
    .select("*")
    .eq("group_id", groupId)
    .order("updated_at", { ascending: false });

  if (error) {
    const mapped = mapInteractiveGuideProgressError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar progresso dos guias interativos: ${error.message}`);
  }

  return (data || []) as GroupInteractiveGuideProgress[];
}

export async function upsertGroupInteractiveGuideProgress(
  data: UpsertGroupInteractiveGuideProgressData
): Promise<void> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { error } = await supabase.from("group_interactive_guide_progress").upsert(
    {
      group_id: data.group_id,
      guide_id: data.guide_id,
      student_profile_id: data.student_profile_id,
      student_name: data.student_name,
      response_text: data.response_text,
      status: data.status,
      completed_at: data.status === "concluido" ? now : null,
      updated_at: now,
    },
    {
      onConflict: "guide_id,student_profile_id",
    }
  );

  if (error) {
    const mapped = mapInteractiveGuideProgressError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar progresso do guia interativo: ${error.message}`);
  }
}
