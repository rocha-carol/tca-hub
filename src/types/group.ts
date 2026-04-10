// Representa um grupo de TCA.
// Um grupo pode ter orientador principal e coorientador.
export type GroupStatus = "planejamento" | "em_andamento" | "concluido";
export type AdvisorIndicationStatus = "pendente" | "aceita" | "recusada";

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
  student_4_id?: string | number | null;
  member_4_name?: string | null;
  member_4_series?: string | null;
  student_5_id?: string | number | null;
  member_5_name?: string | null;
  member_5_series?: string | null;
  theme: string | null;
  description: string | null;
  status?: GroupStatus | null;
  primary_advisor_id: string | null;
  co_advisor_id: string | null;
  indicated_advisor_id?: string | null;
  indication_status?: AdvisorIndicationStatus | null;
  indication_updated_at?: string | null;
  created_at?: string;
}