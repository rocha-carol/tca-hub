export interface GroupProcessPhoto {
  id: string | number;
  group_id: string;
  section_id: string | number | null;
  photo_url: string;
  caption: string | null;
  taken_at: string | null;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
  created_at?: string;
}

export interface CreateGroupProcessPhotoData {
  group_id: string;
  section_id: string | number | null;
  photo_url: string;
  caption: string | null;
  taken_at: string | null;
  author_profile_id: string | null;
  author_role: "student" | "advisor" | "coordinator";
  author_name: string;
}
