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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold text-gray-900">
          TCA Hub
        </Link>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/groups"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Grupos
              </Link>
              <Link
                href="/advisors"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Orientadores
              </Link>
              <span className="hidden sm:inline text-sm text-gray-500">
                {user.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm font-medium bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md"
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
