export type GroupInteractiveGuideType =
  | "escrita"
  | "metodologia"
  | "estrutura"
  | "referencias"
  | "apresentacao"
  | "outro";

export type GroupInteractiveGuideAudience = "students" | "advisors" | "todos";

export interface GroupInteractiveGuide {
  id: string | number;
  group_id: string;
  section_id: string | number | null;
  title: string;
  guide_type: GroupInteractiveGuideType;
  content: string;
  suggested_activity: string | null;
  audience: GroupInteractiveGuideAudience;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateGroupInteractiveGuideData {
  group_id: string;
  section_id: string | number | null;
  title: string;
  guide_type: GroupInteractiveGuideType;
  content: string;
  suggested_activity: string | null;
  audience: GroupInteractiveGuideAudience;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
}
