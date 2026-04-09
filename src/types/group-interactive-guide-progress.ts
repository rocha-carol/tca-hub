export type GroupInteractiveGuideProgressStatus = "pendente" | "concluido";

export interface GroupInteractiveGuideProgress {
  id: string | number;
  group_id: string;
  guide_id: string | number;
  student_profile_id: string;
  student_name: string;
  response_text: string | null;
  status: GroupInteractiveGuideProgressStatus;
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertGroupInteractiveGuideProgressData {
  group_id: string;
  guide_id: string | number;
  student_profile_id: string;
  student_name: string;
  response_text: string | null;
  status: GroupInteractiveGuideProgressStatus;
}
