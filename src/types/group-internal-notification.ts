export type GroupInternalNotificationType = "aviso" | "prazo" | "encontro" | "orientacao";

export interface GroupInternalNotification {
  id: string | number;
  group_id: string;
  section_id: string | number | null;
  title: string;
  message: string;
  notification_type: GroupInternalNotificationType;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateGroupInternalNotificationData {
  group_id: string;
  section_id: string | number | null;
  title: string;
  message: string;
  notification_type: GroupInternalNotificationType;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
}
