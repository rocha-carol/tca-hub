export interface ProjectSectionQuestion {
  id: string | number;
  group_id: string;
  section_id: string | number;
  author_profile_id: string | null;
  author_role: "student";
  author_name: string;
  question: string;
  created_at?: string;
}

export interface CreateProjectSectionQuestionData {
  group_id: string;
  section_id: string | number;
  author_profile_id: string | null;
  author_role: "student";
  author_name: string;
  question: string;
}
