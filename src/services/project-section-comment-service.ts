import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectSectionCommentData,
  ProjectSectionComment,
} from "@/types/project-section-comment";

function isProjectSectionCommentsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_comments'");
}

function isProjectSectionCommentsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapProjectSectionCommentsError(message: string, code?: string) {
  if (isProjectSectionCommentsTableMissing(message)) {
    return "Tabela group_project_section_comments ainda não existe no Supabase. Execute o arquivo local database/011_create_project_section_comments.sql no SQL Editor.";
  }

  if (isProjectSectionCommentsPermissionDenied(message, code)) {
    return "Acesso aos comentários das seções bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE/DELETE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSectionComments(
  groupId: string
): Promise<ProjectSectionComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_comments")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    const mapped = mapProjectSectionCommentsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar comentários das seções: ${error.message}`);
  }

  return (data || []) as ProjectSectionComment[];
}

export async function createProjectSectionComment(
  data: CreateProjectSectionCommentData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_comments")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
      comment: data.comment,
    });

  if (error) {
    const mapped = mapProjectSectionCommentsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar comentário da seção: ${error.message}`);
  }
}

export async function updateProjectSectionComment(
  commentId: string | number,
  comment: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_comments")
    .update({
      comment,
    })
    .eq("id", commentId);

  if (error) {
    const mapped = mapProjectSectionCommentsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao atualizar comentário da seção: ${error.message}`);
  }
}

export async function deleteProjectSectionComment(
  commentId: string | number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    const mapped = mapProjectSectionCommentsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao excluir comentário da seção: ${error.message}`);
  }
}
