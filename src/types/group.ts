// Representa um grupo de TCA.
// Um grupo pode ter orientador principal e coorientador.
export type GroupStatus = "planejamento" | "em_andamento" | "concluido";

export interface Group {
  id: string;
  owner_id: string;
  student_1_id: string | number | null;
  member_1_name: string;
  member_1_series: string;
  student_2_id: string | number | null;
  member_2_name: string | null;
  member_2_series: string | null;
  student_3_id: string | number | null;
  member_3_name: string | null;
  member_3_series: string | null;
  theme: string | null;
  description: string | null;
  status?: GroupStatus | null;
  primary_advisor_id: string | null;
  co_advisor_id: string | null;
  created_at?: string;
}