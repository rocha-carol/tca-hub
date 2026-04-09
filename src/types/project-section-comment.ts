export interface ProjectSectionComment {
  id: string | number;
  group_id: string;
  section_id: string | number;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  comment: string;
  created_at?: string;
}

export interface CreateProjectSectionCommentData {
  group_id: string;
  section_id: string | number;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  comment: string;
}
