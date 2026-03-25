import type { UserRole } from "./auth";

// Representa um usuário do sistema.
// Inclui estudantes, orientadores e coordenadores.
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at?: string;
}