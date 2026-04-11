/**
 * Representa uma preferência de orientador para um grupo.
 */
export interface GroupAdvisorPreference {
  id: string | number;
  group_id: string;
  advisor_id: string | number;
  preference_order: number;
  indication_status?: "pendente" | "aceita" | "recusada" | null;
  indication_updated_at?: string | null;
  created_at?: string;
}
