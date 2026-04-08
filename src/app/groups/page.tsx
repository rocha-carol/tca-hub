import Link from "next/link";

/**
 * Página inicial de Grupos (MVP).
 *
 * Esta etapa entrega uma base navegável do módulo,
 * com estado vazio e CTA para criação futura de grupo.
 */
export default function GroupsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-600 mt-2">
            Organize os membros e acompanhe os grupos de TCA.
          </p>
        </header>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum grupo encontrado</h2>
          <p className="text-gray-700 mb-5">
            Você ainda não participa de nenhum grupo. Crie seu primeiro grupo para começar.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
            >
              Criar grupo (em breve)
            </button>

            <Link
              href="/dashboard"
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
