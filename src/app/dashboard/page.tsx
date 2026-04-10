import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";

/**
 * Rota legada de compatibilidade (/dashboard).
 *
 * Etapa G da reorganização: esta rota NÃO renderiza mais conteúdo.
 * Redireciona para o dashboard correto conforme o perfil do usuário.
 *
 * - estudante   → /student/meu-projeto
 * - orientador  → /advisor/dashboard
 * - coordenador → /coordinator/dashboard
 *
 * Preserva modo provisório repassando os query params necessários.
 */
interface LegacyDashboardPageProps {
  searchParams?: Promise<{ modo?: string; perfil?: string }>;
}

export default async function LegacyDashboardPage({ searchParams }: LegacyDashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const isProvisionalMode = params.modo === "provisorio";
  const provisionalRole =
    params.perfil === "student" || params.perfil === "advisor" || params.perfil === "coordinator"
      ? params.perfil
      : null;

  // Modo provisório: redireciona usando o parâmetro de perfil
  if (isProvisionalMode && provisionalRole) {
    if (provisionalRole === "student") {
      redirect("/student/meu-projeto?modo=provisorio");
    }
    if (provisionalRole === "advisor") {
      redirect("/advisor/dashboard?modo=provisorio&perfil=advisor");
    }
    if (provisionalRole === "coordinator") {
      redirect("/coordinator/dashboard?modo=provisorio&perfil=coordinator");
    }
  }

  // Modo autenticado: redireciona pela role real do usuário
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();
  const role = profile?.role;

  if (role === "student") {
    redirect("/student/meu-projeto");
  }

  if (role === "coordinator") {
    redirect("/coordinator/dashboard");
  }

  // Orientador ou role desconhecida → dashboard do orientador como fallback
  redirect("/advisor/dashboard");
}


