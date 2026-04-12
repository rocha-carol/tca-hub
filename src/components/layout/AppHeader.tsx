import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import type { UserRole } from "@/types/auth";
import HeaderMainNav from "@/components/layout/HeaderMainNav";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface AppHeaderProps {
  groupName?: string;
}

export default async function AppHeader({ groupName }: AppHeaderProps) {
  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getAuthenticatedProfile() : null;
  const role = profile?.role as UserRole | undefined;
  let quickNavItems: Array<{ href: string; label: string }> = [];
  const userDisplayName = profile?.name || "Perfil";
  const userInitial = (profile?.name || user?.email || "U").charAt(0).toUpperCase();
  const homeHref = (() => {
    if (!user) {
      return "/";
    }

    if (role === "student") {
      return STUDENT_ROUTES.HOME;
    }

    if (role === "advisor") {
      return "/advisor/dashboard";
    }

    if (role === "coordinator") {
      return "/coordinator/dashboard";
    }

    return "/dashboard";
  })();

  // Etapa 1 (mudança pequena e segura): navegação principal por perfil.
  // Não remove rotas existentes; apenas reorganiza os atalhos exibidos no topo.
  const mainNavItems = (() => {
    if (!user) return [] as Array<{ href: string; label: string }>;

    if (role === "student") {
      return [];
    }

    if (role === "advisor") {
      return [];
    }

    if (role === "coordinator") {
      return [
         { href: "/coordinator/dashboard", label: "Dashboard" },
        { href: "/groups", label: "Grupos" },
        { href: "/coordinator/students", label: "Estudantes" },
        { href: "/coordinator/advisors", label: "Orientadores" },
        { href: "/profile/setup", label: "Perfil" },
      ];
    }

    return [
      { href: "/dashboard", label: "Projeto" },
      { href: "/groups", label: "Grupo" },
      { href: "/profile/setup", label: "Perfil" },
    ];
  })();

  if (user && role === "student" && profile) {
    try {
      const context = await resolveStudentGroupContext(profile.id);

      if (context.group) {
        const sections = await ensureGroupProjectSectionsStructure(context.group.id);
        const sectionByKey = new Map(sections.map((section) => [section.section_key, section]));

        quickNavItems = [
          { key: "tema_contexto", label: "Tema e contexto" },
          { key: "problema_justificativa", label: "Problema e justificativa" },
          { key: "objetivos", label: "Objetivos" },
          { key: "metodologia_plano", label: "Metodologia" },
          { key: "desenvolvimento_registros", label: "Desenvolvimento" },
          { key: "resultado_produto_final", label: "Resultado final" },
          { key: "resultado_produto_final", label: "Revisão geral" },
        ]
          .map((item) => {
            const section = sectionByKey.get(item.key);
            if (!section) return null;

            return {
              label: item.label,
              href: `/groups/${context.group?.id}/project/sections/${section.id}`,
            };
          })
          .filter((item): item is { href: string; label: string } => Boolean(item));
      }
    } catch {
      quickNavItems = [];
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#d9e7d4] bg-white/95 shadow-sm backdrop-blur" role="banner">
      <div className="tca-stripes h-1 w-full" />
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <Link
          href={homeHref}
          className="flex items-center gap-3 font-bold text-lg tracking-tight text-[#4CAF50] shrink-0"
          aria-label="Ir para a página inicial da área atual"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef8ea] text-sm text-[#4CAF50] shadow-sm" aria-hidden="true">
            T
          </span>
          <div className="flex flex-col leading-none">
            <span>TCA HUB</span>
            <span className="text-[11px] font-medium text-[#6B7280] mt-1">plataforma de projeto autoral</span>
          </div>
        </Link>

        {user && <HeaderMainNav items={mainNavItems} quickItems={quickNavItems} />}

        <div className="flex items-center gap-3 shrink-0">
          {groupName && (
            <div className="hidden xl:flex flex-col rounded-2xl bg-[#f8fbf6] border border-[#e2ecdd] px-4 py-2 max-w-xs">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Grupo atual</span>
              <span className="text-sm font-medium text-[#1F2937] truncate">{groupName}</span>
            </div>
          )}

          {!user ? null : (
            <>
              {role !== "advisor" ? (
                <Link
                  href="/profile/setup"
                  className="hidden sm:flex items-center gap-3 rounded-2xl border border-[#e2ecdd] bg-[#f8fbf6] px-3 py-2 hover:bg-white transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4CAF50] text-sm font-bold text-white">
                    {userInitial}
                  </span>
                  <span className="flex flex-col text-left leading-tight">
                    <span className="text-sm font-medium text-[#1F2937] max-w-36 truncate">
                      {userDisplayName}
                    </span>
                    <span className="text-xs text-[#6B7280] max-w-40 truncate">{user.email}</span>
                  </span>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-[#e2ecdd] bg-[#f8fbf6] px-3 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4CAF50] text-sm font-bold text-white">
                    {userInitial}
                  </span>
                  <span className="flex flex-col text-left leading-tight">
                    <span className="text-sm font-medium text-[#1F2937] max-w-36 truncate">
                      {userDisplayName}
                    </span>
                    <span className="text-xs text-[#6B7280] max-w-40 truncate">{user.email}</span>
                  </span>
                </div>
              )}
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm font-semibold bg-[#EB5757] hover:bg-red-400 text-white px-3 py-1.5 rounded-xl transition-colors"
                  aria-label="Encerrar sessão e sair da plataforma"
                >
                  Sair
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
