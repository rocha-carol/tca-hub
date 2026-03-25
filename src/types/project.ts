// Representa uma seção do projeto.
// Cada grupo possui várias seções (tema, problema, etc).
export interface ProjectSection {
  id: string;
  group_id: string;
  section_key: string;
  title: string;
  content: string | null;
  updated_at?: string;
}