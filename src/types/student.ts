/**
 * Representa um estudante cadastrado no sistema.
 */
export interface Student {
  id: string;
  profile_id: string | null;
  name: string;
  email: string;
  registration_code?: string | null;
  school?: string | null;
  grade?: string | null;
  active?: boolean;
  created_at?: string;
}
