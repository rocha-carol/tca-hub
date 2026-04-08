import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAllAdvisors, createAdvisor } from "@/services/advisor-service";
import type { Advisor } from "@/types/advisor";

/**
 * Página de Orientadores (MVP).
 *
 * Permite cadastrar e listar orientadores.
 * Associação com grupos será feita em etapa futura.
 */
export default async function AdvisorsPage() {
  let advisors: Advisor[] = [];
  let advisorsError: string | null = null;

  async function handleCreateAdvisor(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name || name.length < 2 || !email) {
      redirect("/advisors");
    }

    await createAdvisor({ name, email });

    revalidatePath("/advisors");
    redirect("/advisors");
  }

  try {
    advisors = await fetchAllAdvisors();
  } catch (error) {
    advisorsError =
      error instanceof Error ? error.message : "Erro desconhecido ao carregar orientadores.";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orientadores</h1>
          <p className="text-gray-600 mt-2">
            Cadastre e gerencie os orientadores dos grupos de TCA.
          </p>
        </header>

        {advisorsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium mb-1">Configuração pendente do módulo de orientadores</p>
            <p className="text-amber-800 text-sm">{advisorsError}</p>
          </div>
        )}

        {/* Formulário de cadastro */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cadastrar orientador</h2>

          <form action={handleCreateAdvisor} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex.: Prof. João da Silva"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Ex.: joao.silva@escola.edu.br"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={Boolean(advisorsError)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cadastrar orientador
              </button>

              <Link
                href="/dashboard"
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
              >
                Voltar ao dashboard
              </Link>
            </div>
          </form>
        </div>

        {/* Listagem */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Orientadores cadastrados</h2>

          {advisors.length === 0 ? (
            <p className="text-gray-700">Nenhum orientador cadastrado ainda.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {advisors.map((advisor) => (
                <article key={advisor.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{advisor.name}</p>
                    <p className="text-sm text-gray-600">{advisor.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">ID: {advisor.id.slice(0, 8)}…</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
