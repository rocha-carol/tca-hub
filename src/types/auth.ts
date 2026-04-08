// Define os papéis disponíveis no sistema.
// Esses valores serão usados nas permissões e validações.
export type UserRole = "student" | "advisor" | "coordinator";

/**
 * Dados necessários para efetuar cadastro no sistema.
 * Inclui validações básicas de email e senha.
 */
export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

/**
 * Dados necessários para efetuar login no sistema.
 * O usuário informa email e senha para autenticação.
 */
export interface SignInData {
  email: string;
  password: string;
}

/**
 * Resposta de sucesso após autenticação (signup ou login).
 * Retorna dados do usuário autenticado e seu perfil no sistema.
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  profile?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
    created_at?: string;
  };
}

/**
 * Resposta de erro durante autenticação.
 * Facilita tratamento consistente de erros no frontend.
 */
export interface AuthError {
  code: string;
  message: string;
}