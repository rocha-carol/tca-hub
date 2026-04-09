import { createClient } from "@/lib/supabase/server";
import type {
  CreateGroupInPersonMeetingData,
  GroupInPersonMeeting,
  GroupInPersonMeetingStatus,
} from "@/types/group-in-person-meeting";

function isMeetingsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_in_person_meetings'");
}

function isMeetingsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapMeetingsError(message: string, code?: string) {
  if (isMeetingsTableMissing(message)) {
    return "Tabela group_in_person_meetings ainda não existe no Supabase. Execute o arquivo local database/017_create_group_in_person_meetings.sql no SQL Editor.";
  }

  if (isMeetingsPermissionDenied(message, code)) {
    return "Acesso à agenda de encontros bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupInPersonMeetings(groupId: string): Promise<GroupInPersonMeeting[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_in_person_meetings")
    .select("*")
    .eq("group_id", groupId)
    .order("meeting_date", { ascending: true })
    .order("meeting_time", { ascending: true });

  if (error) {
    const mapped = mapMeetingsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar agenda de encontros: ${error.message}`);
  }

  return (data || []) as GroupInPersonMeeting[];
}

export async function createGroupInPersonMeeting(data: CreateGroupInPersonMeetingData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_in_person_meetings")
    .insert({
      group_id: data.group_id,
      meeting_date: data.meeting_date,
      meeting_time: data.meeting_time,
      location: data.location,
      agenda: data.agenda,
      notes: data.notes,
      status: "agendado",
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
    });

  if (error) {
    const mapped = mapMeetingsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao criar encontro presencial: ${error.message}`);
  }
}

export async function updateGroupInPersonMeetingStatus(
  meetingId: string | number,
  status: GroupInPersonMeetingStatus
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_in_person_meetings")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  if (error) {
    const mapped = mapMeetingsError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao atualizar status do encontro presencial: ${error.message}`);
  }
}
