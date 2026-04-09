import type { ProjectSectionStatus } from "@/types/project-section";

export interface ProjectSectionVersion {
  id: string | number;
  group_id: string;
  section_id: string | number;
  version_number: number;
  content: string | null;
  status: ProjectSectionStatus;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateProjectSectionVersionData {
  group_id: string;
  section_id: string | number;
  content: string | null;
  status: ProjectSectionStatus;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
}
