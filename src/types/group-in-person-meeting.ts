export type GroupInPersonMeetingStatus = "agendado" | "realizado" | "cancelado";

export interface GroupInPersonMeeting {
  id: string | number;
  group_id: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  agenda: string;
  notes: string | null;
  status: GroupInPersonMeetingStatus;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  updated_at?: string;
  created_at?: string;
}

export interface CreateGroupInPersonMeetingData {
  group_id: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  agenda: string;
  notes: string | null;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
}
