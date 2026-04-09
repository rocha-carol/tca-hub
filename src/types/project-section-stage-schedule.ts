export interface ProjectSectionStageSchedule {
  id: string | number;
  group_id: string;
  section_id: string | number;
  due_date: string;
  notes: string | null;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  updated_at?: string;
  created_at?: string;
}

export interface UpsertProjectSectionStageScheduleData {
  group_id: string;
  section_id: string | number;
  due_date: string;
  notes: string | null;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
}
