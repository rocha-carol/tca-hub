import { createClient } from "@/lib/supabase/server";
import type {
  CreateGroupProcessPhotoData,
  GroupProcessPhoto,
} from "@/types/group-process-photo";

function isProcessPhotosTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_process_photos'");
}

function isProcessPhotosPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapProcessPhotosError(message: string, code?: string) {
  if (isProcessPhotosTableMissing(message)) {
    return "Tabela group_process_photos ainda não existe no Supabase. Execute o arquivo local database/020_create_group_process_photos.sql no SQL Editor.";
  }

  if (isProcessPhotosPermissionDenied(message, code)) {
    return "Acesso às fotos do processo bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProcessPhotos(groupId: string): Promise<GroupProcessPhoto[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_process_photos")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapProcessPhotosError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar fotos do processo: ${error.message}`);
  }

  return (data || []) as GroupProcessPhoto[];
}

export async function createGroupProcessPhoto(data: CreateGroupProcessPhotoData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_process_photos")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      photo_url: data.photo_url,
      caption: data.caption,
      taken_at: data.taken_at,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapProcessPhotosError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao registrar foto do processo: ${error.message}`);
  }
}
