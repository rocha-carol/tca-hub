/**
 * Representa uma preferência de orientador para um grupo.
 */
export interface GroupAdvisorPreference {
  id: string | number;
  group_id: string;
  advisor_id: string | number;
  preference_order: number;
  created_at?: string;
}
