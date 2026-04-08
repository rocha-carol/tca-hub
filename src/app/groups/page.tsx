import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createGroup, fetchAllGroups } from "@/services/group-service";
import type { Group, GroupStatus } from "@/types/group";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

interface GroupsPageProps {
  searchParams?: Promise<{ status?: string }>;
}

/**
 * Página inicial de Grupos (MVP).
 *
 * Esta etapa entrega uma base navegável do módulo,
 * com estado vazio e CTA para criação futura de grupo.
 */
export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  let groups: Group[] = [];
  let groupsError: string | null = null;

  const params = searchParams ? await searchParams : {};
  const rawStatus = params.status ?? "all";
  const currentFilter: "all" | GroupStatus =
    rawStatus === "planejamento" || rawStatus === "em_andamento" || rawStatus === "concluido"
      ? rawStatus
      : "all";

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

  const filteredGroups =
    currentFilter === "all"
      ? groups
      : groups.filter((group) => (group.status || "planejamento") === currentFilter);

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

          <div className="flex flex-wrap gap-2 mb-4">
            <Link
              href="/groups"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Todos
            </Link>
            <Link
              href="/groups?status=planejamento"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "planejamento"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Planejamento
            </Link>
            <Link
              href="/groups?status=em_andamento"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "em_andamento"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Em andamento
            </Link>
            <Link
              href="/groups?status=concluido"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "concluido"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Concluído
            </Link>
          </div>

          {filteredGroups.length === 0 ? (
            <p className="text-gray-700">Nenhum grupo encontrado para este filtro.</p>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group, index) => (
                <article key={group.id} className="border border-gray-200 rounded-md p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Grupo {filteredGroups.length - index}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Status: {getStatusLabel((group.status as GroupStatus) || "planejamento")}
                  </p>
                  <ul className="text-sm text-gray-800 space-y-0.5">
                    <li>{group.member_1_name} — {group.member_1_series}</li>
                    {group.member_2_name && (
                      <li>{group.member_2_name} — {group.member_2_series || "Sem série"}</li>
                    )}
                    {group.member_3_name && (
                      <li>{group.member_3_name} — {group.member_3_series || "Sem série"}</li>
                    )}
                  </ul>
                  {group.theme && (
                    <p className="text-sm text-gray-500 mt-2">Tema: {group.theme}</p>
                  )}
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
