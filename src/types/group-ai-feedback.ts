export interface GroupAIFeedback {
  id: string | number;
  group_id: string;
  section_id: string | number | null;
  focus_prompt: string | null;
  feedback_text: string;
  strengths: string | null;
  improvements: string | null;
  suggested_next_steps: string | null;
  model_name: string | null;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateGroupAIFeedbackData {
  group_id: string;
  section_id: string | number | null;
  focus_prompt: string | null;
  feedback_text: string;
  strengths: string | null;
  improvements: string | null;
  suggested_next_steps: string | null;
  model_name: string | null;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
}

export interface PedagogicalAIFeedbackResult {
  feedback_text: string;
  strengths: string | null;
  improvements: string | null;
  suggested_next_steps: string | null;
  model_name: string;
}
