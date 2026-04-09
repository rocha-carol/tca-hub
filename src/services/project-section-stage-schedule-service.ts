import { createClient } from "@/lib/supabase/server";
import type {
  ProjectSectionStageSchedule,
  UpsertProjectSectionStageScheduleData,
} from "@/types/project-section-stage-schedule";

function isStageScheduleTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_section_stage_schedule'");
}

function isStageSchedulePermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapStageScheduleError(message: string, code?: string) {
  if (isStageScheduleTableMissing(message)) {
    return "Tabela group_project_section_stage_schedule ainda não existe no Supabase. Execute o arquivo local database/016_create_project_section_stage_schedule.sql no SQL Editor.";
  }

  if (isStageSchedulePermissionDenied(message, code)) {
    return "Acesso ao cronograma por etapa bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSectionStageSchedule(
  groupId: string
): Promise<ProjectSectionStageSchedule[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_section_stage_schedule")
    .select("*")
    .eq("group_id", groupId)
    .order("due_date", { ascending: true });

  if (error) {
    const mapped = mapStageScheduleError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar cronograma por etapa: ${error.message}`);
  }

  return (data || []) as ProjectSectionStageSchedule[];
}

export async function upsertProjectSectionStageSchedule(
  data: UpsertProjectSectionStageScheduleData
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_section_stage_schedule")
    .upsert({
      group_id: data.group_id,
      section_id: data.section_id,
      due_date: data.due_date,
      notes: data.notes,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
      updated_at: new Date().toISOString(),
    }, { onConflict: "group_id,section_id" });

  if (error) {
    const mapped = mapStageScheduleError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar cronograma por etapa: ${error.message}`);
  }
}
