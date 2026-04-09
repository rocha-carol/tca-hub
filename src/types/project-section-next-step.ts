export interface ProjectSectionNextStep {
  id: string | number;
  group_id: string;
  section_id: string | number;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  next_steps: string;
  created_at?: string;
}

export interface CreateProjectSectionNextStepData {
  group_id: string;
  section_id: string | number;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  next_steps: string;
}
