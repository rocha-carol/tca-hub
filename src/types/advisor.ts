/**
 * Representa um orientador cadastrado no sistema.
 */
export interface Advisor {
  id: string | number;
  profile_id: string | null;
  name: string;
  email: string;
  role_title?: string | null;
  employee_code?: string | null;
  school?: string | null;
  area_of_activity?: string | null;
  active?: boolean;
  created_at?: string;
}
