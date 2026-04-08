import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createGroup, fetchAllGroups } from "@/services/group-service";
import type { Group } from "@/types/group";

/**
 * Página inicial de Grupos (MVP).
 *
 * Esta etapa entrega uma base navegável do módulo,
 * com estado vazio e CTA para criação futura de grupo.
 */
export default async function GroupsPage() {
  let groups: Group[] = [];
  let groupsError: string | null = null;

  async function handleCreateGroup(formData: FormData) {
    "use server";

    const member1Name = String(formData.get("member_1_name") ?? "").trim();
    const member1Series = String(formData.get("member_1_series") ?? "").trim();
    const member2Name = String(formData.get("member_2_name") ?? "").trim();
    const member2Series = String(formData.get("member_2_series") ?? "").trim();
    const member3Name = String(formData.get("member_3_name") ?? "").trim();
    const member3Series = String(formData.get("member_3_series") ?? "").trim();
    const theme = String(formData.get("theme") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!member1Name || member1Name.length < 3 || !member1Series) {
      redirect("/groups");
    }

    await createGroup({
      member_1_name: member1Name,
      member_1_series: member1Series,
      member_2_name: member2Name || null,
      member_2_series: member2Series || null,
      member_3_name: member3Name || null,
      member_3_series: member3Series || null,
      theme: theme || null,
      description: description || null,
    });

    revalidatePath("/groups");
    redirect("/groups");
  }

  try {
    groups = await fetchAllGroups();
  } catch (error) {
    groupsError = error instanceof Error ? error.message : "Erro desconhecido ao carregar grupos.";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-600 mt-2">
            Organize os membros e acompanhe os grupos de TCA.
          </p>
        </header>

        {groupsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium mb-1">Configuração pendente do módulo de grupos</p>
            <p className="text-amber-800 text-sm">{groupsError}</p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrantes do grupo e série</h2>

          <form action={handleCreateGroup} className="space-y-3">
            <div>
              <label htmlFor="member_1_name" className="block text-sm font-medium text-gray-700 mb-1">
                Integrante 1 *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="member_1_name"
                  name="member_1_name"
                  type="text"
                  placeholder="Nome do integrante 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  id="member_1_series"
                  name="member_1_series"
                  type="text"
                  placeholder="Série do integrante 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="member_2_name" className="block text-sm font-medium text-gray-700 mb-1">
                Integrante 2
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="member_2_name"
                  name="member_2_name"
                  type="text"
                  placeholder="Nome do integrante 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  id="member_2_series"
                  name="member_2_series"
                  type="text"
                  placeholder="Série do integrante 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="member_3_name" className="block text-sm font-medium text-gray-700 mb-1">
                Integrante 3
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="member_3_name"
                  name="member_3_name"
                  type="text"
                  placeholder="Nome do integrante 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  id="member_3_series"
                  name="member_3_series"
                  type="text"
                  placeholder="Série do integrante 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
                Tema do projeto
              </label>
              <input
                id="theme"
                name="theme"
                type="text"
                placeholder="Ex.: Sustentabilidade na escola"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do projeto
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Descreva brevemente o projeto do grupo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={Boolean(groupsError)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
              >
                Criar grupo
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

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Grupos cadastrados</h2>

          {groups.length === 0 ? (
            <p className="text-gray-700">Nenhum grupo encontrado. Crie o primeiro acima.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <article key={group.id} className="border border-gray-200 rounded-md p-4">
                  <h3 className="font-semibold text-gray-900">Grupo criado</h3>
                  <ul className="text-sm text-gray-700 mt-2 space-y-1">
                    <li>
                      <strong>Integrante 1:</strong> {group.member_1_name} — {group.member_1_series}
                    </li>
                    {group.member_2_name && (
                      <li>
                        <strong>Integrante 2:</strong> {group.member_2_name} — {group.member_2_series || "Sem série"}
                      </li>
                    )}
                    {group.member_3_name && (
                      <li>
                        <strong>Integrante 3:</strong> {group.member_3_name} — {group.member_3_series || "Sem série"}
                      </li>
                    )}
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    <strong>Tema:</strong> {group.theme || "Não informado"}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Descrição:</strong> {group.description || "Sem descrição"}
                  </p>
                  <div className="mt-3">
                    <Link
                      href={`/groups/${group.id}`}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
