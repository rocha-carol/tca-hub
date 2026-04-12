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
    <header className="sticky top-0 z-50 border-b border-[var(--tca-border)] bg-white/80 backdrop-blur-xl shadow-[0_14px_36px_-28px_rgba(15,23,42,0.4)]">
      <div className="tca-stripes h-1 w-full" />
      <div className="flex min-h-[4.5rem] items-center justify-between gap-4 px-4 lg:px-6">
        <Link
          href={homeHref}
          className="group flex shrink-0 items-center gap-3 rounded-2xl px-1 py-1 text-lg font-bold tracking-tight text-[var(--tca-primary)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)] text-sm font-black text-white shadow-[0_16px_28px_-18px_rgba(47,143,83,0.9)] transition-transform duration-200 group-hover:scale-105">
            T
          </span>
          <div className="flex flex-col leading-none">
            <span className="bg-[linear-gradient(135deg,var(--tca-primary-strong)_0%,var(--tca-secondary)_100%)] bg-clip-text text-transparent">
              TCA HUB
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tca-text-muted)]">
              plataforma de projeto autoral
            </span>
          </div>
        </Link>

        {user && <HeaderMainNav items={mainNavItems} quickItems={quickNavItems} />}

        <div className="flex items-center gap-3 shrink-0">
          {groupName && (
            <div className="hidden max-w-xs flex-col rounded-2xl border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.98)_100%)] px-4 py-2 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.5)] xl:flex">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tca-text-muted)]">Grupo atual</span>
              <span className="truncate text-sm font-semibold text-[var(--foreground)]">{groupName}</span>
            </div>
          )}

          {!user ? null : (
            <>
              {role !== "advisor" ? (
                <Link
                  href="/profile/setup"
                  className="hidden items-center gap-3 rounded-2xl border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(242,246,242,0.92)_100%)] px-3 py-2 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--tca-border-strong)] hover:bg-white sm:flex"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)] text-sm font-bold text-white shadow-[0_12px_24px_-16px_rgba(91,110,225,0.75)]">
                    {userInitial}
                  </span>
                  <span className="flex flex-col text-left leading-tight">
                    <span className="max-w-36 truncate text-sm font-semibold text-[var(--foreground)]">
                      {userDisplayName}
                    </span>
                    <span className="max-w-40 truncate text-xs text-[var(--tca-text-muted)]">{user.email}</span>
                  </span>
                </Link>
              ) : (
                <div className="hidden items-center gap-3 rounded-2xl border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(242,246,242,0.92)_100%)] px-3 py-2 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.8)] sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)] text-sm font-bold text-white shadow-[0_12px_24px_-16px_rgba(91,110,225,0.75)]">
                    {userInitial}
                  </span>
                  <span className="flex flex-col text-left leading-tight">
                    <span className="max-w-36 truncate text-sm font-semibold text-[var(--foreground)]">
                      {userDisplayName}
                    </span>
                    <span className="max-w-40 truncate text-xs text-[var(--tca-text-muted)]">{user.email}</span>
                  </span>
                </div>
              )}
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,var(--tca-highlight)_0%,#c93f61_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_26px_-18px_rgba(226,85,116,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
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
