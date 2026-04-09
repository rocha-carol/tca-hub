export type ProjectSectionStatus = "nao_iniciado" | "em_andamento" | "concluido";

export interface GroupProjectSection {
  id: string | number;
  group_id: string;
  section_key: string;
  section_title: string;
  section_description: string | null;
  section_order: number;
  content: string | null;
  status: ProjectSectionStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectSectionTemplate {
  section_key: string;
  section_title: string;
  section_description: string;
  section_order: number;
}
