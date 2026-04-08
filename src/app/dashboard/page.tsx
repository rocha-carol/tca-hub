import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Página de Dashboard.
 *
 * Esta é uma server component que exibe dados do usuário autenticado.
 * Rota: /dashboard
 */
export default async function DashboardPage() {
  async function handleSignOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  async function handleUpdateProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/login");
    }

    const rawName = formData.get("name");
    const name = typeof rawName === "string" ? rawName.trim() : "";

    if (!name || name.length < 3) {
      // Para MVP: validação simples sem bloquear com erro complexo de UI.
      // Mantém consistência mínima de dados.
      redirect("/dashboard");
    }

    await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id);

    // Mantém metadata do auth sincronizada com o profile.
    await supabase.auth.updateUser({
      data: {
        name,
      },
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  // Buscar sessão do usuário logado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Se não há usuário logado, mostrar mensagem de não autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Não Autorizado</h1>
          <p className="text-gray-600 mb-6">Você precisa estar logado para acessar o dashboard.</p>
          <Link
            href="/auth/login"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md transition"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome, {user.email}</h1>
          <p className="text-gray-600">Você está logado no TCA Hub</p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Info Card 1 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">ID do Usuário</h3>
              <p className="text-blue-700 font-mono text-sm truncate">{user.id}</p>
            </div>

            {/* Info Card 2 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900 mb-2">Email</h3>
              <p className="text-green-700">{user.email}</p>
            </div>

            {/* Info Card 3 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900 mb-2">Status</h3>
              <p className="text-purple-700 font-semibold">✓ Autenticado</p>
            </div>

            {/* Info Card 4 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-900 mb-2">Última atualização</h3>
              <p className="text-yellow-700 text-sm">
                {new Date().toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Seção de informações do usuário */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Usuário</h3>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Nome de usuário:</strong> {profile?.name || user.user_metadata?.name || "Não definido"}
              </li>
              <li>
                <strong>Perfil:</strong> {profile?.role || "student"}
              </li>
              <li>
                <strong>Confirmado:</strong> {user.email_confirmed_at ? "Sim ✓" : "Não"}
              </li>
              <li>
                <strong>Data de criação:</strong> {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </li>
            </ul>

            {/* Edição mínima de perfil (MVP) */}
            <div className="mt-6 border-t pt-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Editar nome do perfil</h4>

              <form action={handleUpdateProfile} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  name="name"
                  defaultValue={profile?.name || user.user_metadata?.name || ""}
                  placeholder="Digite seu nome"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  Salvar nome
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-md transition"
          >
            Voltar para Home
          </Link>

          <form action={handleSignOut}>
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-md transition"
            >
              Logout
            </button>
          </form>
        </div>

        {/* Info box */}
        <div className="mt-8 bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded">
          <p className="text-sm">
            <strong>Nota:</strong> Este é um dashboard básico de teste para validar o fluxo de autenticação. As
            funcionalidades reais serão implementadas nas próximas etapas.
          </p>
        </div>
      </div>
    </div>
  );
}
