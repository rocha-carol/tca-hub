import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <header className="bg-[#f8f8f2] border-b border-lime-200 sticky top-0 z-40 shadow-sm">
      <div className="tca-stripes h-1 w-full" />
      <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-lime-700">
          <span className="h-6 w-1.5 rounded-sm tca-stripes" aria-hidden="true" />
          TCA Hub
        </Link>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-slate-700 hover:text-lime-700"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold bg-yellow-300 hover:bg-yellow-200 text-lime-900 px-3 py-1.5 rounded-md"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-700 hover:text-lime-700"
              >
                Dashboard
              </Link>
              <Link
                href="/groups"
                className="text-sm font-medium text-slate-700 hover:text-lime-700"
              >
                Grupos
              </Link>
              <Link
                href="/advisors"
                className="text-sm font-medium text-slate-700 hover:text-lime-700"
              >
                Orientadores
              </Link>
              <Link
                href="/students"
                className="text-sm font-medium text-slate-700 hover:text-lime-700"
              >
                Estudantes
              </Link>
              <span className="hidden sm:inline text-sm text-slate-500">
                {user.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm font-semibold bg-rose-500 hover:bg-rose-400 text-white px-3 py-1.5 rounded-md"
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
