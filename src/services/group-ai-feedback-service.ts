import { createClient } from "@/lib/supabase/server";
import type {
  CreateGroupAIFeedbackData,
  GroupAIFeedback,
} from "@/types/group-ai-feedback";

function isAIFeedbackTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_ai_feedback'");
}

function isAIFeedbackPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapAIFeedbackError(message: string, code?: string) {
  if (isAIFeedbackTableMissing(message)) {
    return "Tabela group_ai_feedback ainda não existe no Supabase. Execute o arquivo local database/023_create_group_ai_feedback.sql no SQL Editor.";
  }

  if (isAIFeedbackPermissionDenied(message, code)) {
    return "Acesso ao feedback pedagógico com IA bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupAIFeedback(groupId: string): Promise<GroupAIFeedback[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_ai_feedback")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapAIFeedbackError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar feedback pedagógico com IA: ${error.message}`);
  }

  return (data || []) as GroupAIFeedback[];
}

export async function createGroupAIFeedback(data: CreateGroupAIFeedbackData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_ai_feedback")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      focus_prompt: data.focus_prompt,
      feedback_text: data.feedback_text,
      strengths: data.strengths,
      improvements: data.improvements,
      suggested_next_steps: data.suggested_next_steps,
      model_name: data.model_name,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapAIFeedbackError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao registrar feedback pedagógico com IA: ${error.message}`);
  }
}
