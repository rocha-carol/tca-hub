/**
 * Representa um orientador cadastrado no sistema.
 */
export interface Advisor {
  id: string;
  profile_id: string | null;
  name: string;
  email: string;
  created_at?: string;
}
