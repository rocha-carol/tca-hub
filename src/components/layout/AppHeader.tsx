import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import type { UserRole } from "@/types/auth";
import HeaderMainNav from "@/components/layout/HeaderMainNav";

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

  // Etapa 1 (mudança pequena e segura): navegação principal por perfil.
  // Não remove rotas existentes; apenas reorganiza os atalhos exibidos no topo.
  const mainNavItems = (() => {
    if (!user) return [] as Array<{ href: string; label: string }>;

    if (role === "student") {
      return [
        { href: "/student", label: "Meu Projeto" },
        { href: "/groups", label: "Grupos" },
        { href: "/profile/setup", label: "Perfil" },
      ];
    }

    if (role === "advisor") {
      return [
         { href: "/advisor/dashboard", label: "Dashboard" },
        { href: "/groups", label: "Meus grupos" },
        { href: "/profile/setup", label: "Perfil" },
      ];
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

  return (
    <header className="sticky top-0 z-50 border-b border-[#d9e7d4] bg-white/95 backdrop-blur shadow-sm">
      <div className="tca-stripes h-1 w-full" />
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 font-bold text-lg tracking-tight text-[#4CAF50] shrink-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef8ea] text-sm text-[#4CAF50] shadow-sm">
            T
          </span>
          <div className="flex flex-col leading-none">
            <span>TCA HUB</span>
            <span className="text-[11px] font-medium text-[#6B7280] mt-1">plataforma de projeto autoral</span>
          </div>
        </Link>

        {user && <HeaderMainNav items={mainNavItems} />}

        <div className="flex items-center gap-3 shrink-0">
          {groupName && (
            <div className="hidden xl:flex flex-col rounded-2xl bg-[#f8fbf6] border border-[#e2ecdd] px-4 py-2 max-w-xs">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Grupo atual</span>
              <span className="text-sm font-medium text-[#1F2937] truncate">{groupName}</span>
            </div>
          )}

          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-[#4CAF50]"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold bg-[#F2C94C] hover:bg-yellow-300 text-gray-900 px-3 py-1.5 rounded-xl"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/profile/setup"
                className="hidden sm:flex items-center gap-3 rounded-2xl border border-[#e2ecdd] bg-[#f8fbf6] px-3 py-2 hover:bg-white transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4CAF50] text-sm font-bold text-white">
                  {(profile?.name || user.email || "U").charAt(0).toUpperCase()}
                </span>
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-sm font-medium text-[#1F2937] max-w-36 truncate">
                    {profile?.name || "Perfil"}
                  </span>
                  <span className="text-xs text-[#6B7280] max-w-40 truncate">{user.email}</span>
                </span>
              </Link>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm font-semibold bg-[#EB5757] hover:bg-red-400 text-white px-3 py-1.5 rounded-xl transition-colors"
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
