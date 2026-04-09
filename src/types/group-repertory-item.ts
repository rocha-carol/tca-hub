export type GroupRepertoryResourceType =
  | "artigo"
  | "livro"
  | "site"
  | "video"
  | "podcast"
  | "outro";

export interface GroupRepertoryItem {
  id: string | number;
  group_id: string;
  section_id: string | number | null;
  title: string;
  description: string | null;
  resource_type: GroupRepertoryResourceType;
  resource_link: string | null;
  notes: string | null;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateGroupRepertoryItemData {
  group_id: string;
  section_id: string | number | null;
  title: string;
  description: string | null;
  resource_type: GroupRepertoryResourceType;
  resource_link: string | null;
  notes: string | null;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
}
