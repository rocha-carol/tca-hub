// Representa um grupo de TCA.
// Um grupo pode ter orientador principal e coorientador.
export interface Group {
  id: string;
  name: string;
  theme: string | null;
  description: string | null;
  primary_advisor_id: string | null;
  co_advisor_id: string | null;
  created_at?: string;
}