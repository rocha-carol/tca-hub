import { createClient } from "@/lib/supabase/server";
import type {
  CreateGroupInternalNotificationData,
  GroupInternalNotification,
} from "@/types/group-internal-notification";

function isNotificationsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_internal_notifications'");
}

function isNotificationsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapNotificationsError(message: string, code?: string) {
  if (isNotificationsTableMissing(message)) {
    return "Tabela group_internal_notifications ainda não existe no Supabase. Execute o arquivo local database/018_create_group_internal_notifications.sql no SQL Editor.";
  }

  if (isNotificationsPermissionDenied(message, code)) {
    return "Acesso às notificações internas bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupInternalNotifications(groupId: string): Promise<GroupInternalNotification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_internal_notifications")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapNotificationsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar notificações internas: ${error.message}`);
  }

  return (data || []) as GroupInternalNotification[];
}

export async function fetchGroupInternalNotificationsByGroupIds(
  groupIds: string[]
): Promise<GroupInternalNotification[]> {
  if (groupIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_internal_notifications")
    .select("*")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapNotificationsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar notificações internas por grupos: ${error.message}`);
  }

  return (data || []) as GroupInternalNotification[];
}

export async function createGroupInternalNotification(
  data: CreateGroupInternalNotificationData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_internal_notifications")
    .insert({
      group_id: data.group_id,
      section_id: data.section_id,
      title: data.title,
      message: data.message,
      notification_type: data.notification_type,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapNotificationsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao criar notificação interna: ${error.message}`);
  }
}
