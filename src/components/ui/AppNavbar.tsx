import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";

/**
 * Navbar global da aplicação (MVP).
 *
 * Comportamento:
 * - Exibe links públicos para usuário deslogado
 * - Exibe links do app + logout para usuário logado
 */
export default async function AppNavbar() {
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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--tca-border)] bg-white/80 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <div className="tca-stripes h-1 w-full" />
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3 text-xl font-extrabold tracking-tight text-[var(--tca-primary)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)] text-sm font-black text-white shadow-[0_16px_28px_-18px_rgba(47,143,83,0.9)] transition-transform duration-200 group-hover:scale-105">
            T
          </span>
          <span className="bg-[linear-gradient(135deg,var(--tca-primary-strong)_0%,var(--tca-secondary)_100%)] bg-clip-text text-transparent">
            TCA Hub
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white hover:text-[var(--tca-primary)]"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,var(--tca-accent)_0%,#ffd36e_100%)] px-4 py-2 text-sm font-bold text-[#5f3b00] shadow-[0_16px_28px_-20px_rgba(244,183,64,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white hover:text-[var(--tca-primary)]"
              >
                Dashboard
              </Link>
              {profile?.role === "coordinator" && (
                <Link
                  href="/groups"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white hover:text-[var(--tca-primary)]"
                >
                  Grupos
                </Link>
              )}
              <Link
                href="/advisors"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white hover:text-[var(--tca-primary)]"
              >
                Orientadores
              </Link>
              <Link
                href="/students"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white hover:text-[var(--tca-primary)]"
              >
                Estudantes
              </Link>
              <span className="hidden rounded-full border border-[var(--tca-border)] bg-white px-3 py-1.5 text-sm text-[var(--tca-text-muted)] shadow-[0_8px_18px_-18px_rgba(15,23,42,0.6)] sm:inline">
                {user.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,var(--tca-highlight)_0%,#c93f61_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_26px_-18px_rgba(226,85,116,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
                >
                  Logout
                </button>
              </form>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
