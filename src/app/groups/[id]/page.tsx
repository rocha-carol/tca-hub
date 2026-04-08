import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchGroupById } from "@/services/group-service";

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Página de detalhe de um grupo (MVP).
 *
 * Mostra todos os dados do grupo: integrantes, série, tema e descrição.
 * Orientadores são exibidos como placeholder — associação real será feita em etapa futura.
 */
export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = await params;

  let group;
  try {
    group = await fetchGroupById(id);
  } catch {
    // Erro de banco — exibe mensagem amigável
    return (
      <main className="min-h-screen bg-gray-50">
        <section className="max-w-2xl mx-auto px-6 py-10">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Erro ao carregar o grupo.</p>
            <p className="text-amber-800 text-sm mt-1">
              Verifique se a tabela de grupos foi criada no Supabase.
            </p>
          </div>
          <Link href="/groups" className="text-blue-600 hover:underline text-sm">
            ← Voltar para grupos
          </Link>
        </section>
      </main>
    );
  }

  if (!group) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-8">
          <Link href="/groups" className="text-blue-600 hover:underline text-sm">
            ← Voltar para grupos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Detalhe do grupo</h1>
          <p className="text-gray-500 text-sm mt-1">ID: {group.id}</p>
        </header>

        {/* Integrantes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrantes</h2>

          <div className="space-y-3">
            {/* Integrante 1 — obrigatório */}
            <div className="flex items-center justify-between border border-gray-100 rounded-md px-4 py-3 bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{group.member_1_name}</p>
                <p className="text-sm text-gray-600">{group.member_1_series}</p>
              </div>
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                Integrante 1
              </span>
            </div>

            {/* Integrante 2 — opcional */}
            {group.member_2_name && (
              <div className="flex items-center justify-between border border-gray-100 rounded-md px-4 py-3 bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{group.member_2_name}</p>
                  <p className="text-sm text-gray-600">{group.member_2_series || "Série não informada"}</p>
                </div>
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Integrante 2
                </span>
              </div>
            )}

            {/* Integrante 3 — opcional */}
            {group.member_3_name && (
              <div className="flex items-center justify-between border border-gray-100 rounded-md px-4 py-3 bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{group.member_3_name}</p>
                  <p className="text-sm text-gray-600">{group.member_3_series || "Série não informada"}</p>
                </div>
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Integrante 3
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Projeto */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projeto</h2>

          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-700">Tema</dt>
              <dd className="text-gray-900 mt-1">{group.theme || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-700">Descrição</dt>
              <dd className="text-gray-900 mt-1 whitespace-pre-line">
                {group.description || "Sem descrição"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Orientação — placeholder para etapa futura */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Orientação</h2>

          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-700">Orientador principal</dt>
              <dd className="text-gray-400 mt-1 italic">
                {group.primary_advisor_id ?? "A definir"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-700">Coorientador</dt>
              <dd className="text-gray-400 mt-1 italic">
                {group.co_advisor_id ?? "A definir"}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="text-gray-500 text-xs mt-4">
          {group.created_at && (
            <p>
              Grupo criado em{" "}
              {new Date(group.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </footer>
      </section>
    </main>
  );
}
