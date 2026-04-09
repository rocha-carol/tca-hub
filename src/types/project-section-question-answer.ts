export interface ProjectSectionQuestionAnswer {
  id: string | number;
  group_id: string;
  section_id: string | number;
  question_id: string | number;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  answer: string;
  created_at?: string;
}

export interface CreateProjectSectionQuestionAnswerData {
  group_id: string;
  section_id: string | number;
  question_id: string | number;
  author_profile_id: string | null;
  author_role: "advisor" | "coordinator";
  author_name: string;
  answer: string;
}
