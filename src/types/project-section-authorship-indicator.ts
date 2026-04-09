export interface ProjectSectionAuthorshipIndicator {
  id: string | number;
  group_id: string;
  section_id: string | number;
  student_percent: number;
  advisor_percent: number;
  coordinator_percent: number;
  analysis_basis: string;
  recommendation: string | null;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateProjectSectionAuthorshipIndicatorData {
  group_id: string;
  section_id: string | number;
  student_percent: number;
  advisor_percent: number;
  coordinator_percent: number;
  analysis_basis: string;
  recommendation: string | null;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
}
