export type GroupFinalProductStatus = "rascunho" | "finalizado";

export interface GroupFinalProduct {
  id: string | number;
  group_id: string;
  title: string;
  description: string | null;
  product_format: string;
  final_link: string | null;
  presentation_notes: string | null;
  status: GroupFinalProductStatus;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
  updated_at?: string;
  created_at?: string;
}

export interface UpsertGroupFinalProductData {
  group_id: string;
  title: string;
  description: string | null;
  product_format: string;
  final_link: string | null;
  presentation_notes: string | null;
  status: GroupFinalProductStatus;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
}
