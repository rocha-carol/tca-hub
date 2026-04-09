export type ProjectDevelopmentChecklistStatus = "pendente" | "concluido";

export interface ProjectDevelopmentChecklistItem {
  id: string | number;
  group_id: string;
  section_id: string | number | null;
  item_text: string;
  status: ProjectDevelopmentChecklistStatus;
  created_by_profile_id: string | null;
  created_by_role: "advisor" | "coordinator";
  created_by_name: string;
  completed_at?: string | null;
  updated_at?: string;
  created_at?: string;
}

export interface CreateProjectDevelopmentChecklistItemData {
  group_id: string;
  section_id: string | number | null;
  item_text: string;
  created_by_profile_id: string | null;
  created_by_role: "advisor" | "coordinator";
  created_by_name: string;
}
