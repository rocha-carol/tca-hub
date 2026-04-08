import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile, getAuthenticatedUser, hasMinimumProfile } from "@/lib/auth/session-service";

/**
 * Etapa 5 — Fluxo inicial de profile após autenticação.
 *
 * Objetivo: garantir profile mínimo (nome) antes de acessar o dashboard.
 */
export default async function ProfileSetupPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();

  // Se profile já estiver completo, seguir para o dashboard
  if (hasMinimumProfile(profile)) {
    redirect("/dashboard");
  }

  async function handleSaveProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect("/auth/login");
    }

    const rawName = formData.get("name");
    const name = typeof rawName === "string" ? rawName.trim() : "";

    if (!name || name.length < 3) {
      redirect("/profile/setup");
    }

    // Garante profile com vínculo 1:1 ao auth.users.id
    await supabase
      .from("profiles")
      .upsert(
        {
          id: currentUser.id,
          name,
          email: currentUser.email || "",
          role: "student",
          active: true,
        },
        { onConflict: "id" }
      );

    // Mantém metadata em auth.users sincronizada
    await supabase.auth.updateUser({
      data: {
        name,
      },
    });

    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completar perfil</h1>
        <p className="text-sm text-gray-600 mb-6">
          Antes de continuar, é necessário informar um nome para identificação no sistema.
        </p>

        <form action={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={profile?.name || user.user_metadata?.name || ""}
              placeholder="Informe o nome"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Salvar e continuar
          </button>
        </form>
      </section>
    </main>
  );
}
