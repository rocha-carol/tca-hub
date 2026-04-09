import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { fetchAllGroups } from "@/services/group-service";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchCoordinatorSummary } from "@/services/coordinator-summary-service";
import type { GroupStatus } from "@/types/group";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

/**
 * Dashboard principal do TCA Hub.
 *
 * Exibe visão geral do sistema: contadores, grupos recentes e perfil do usuário.
 */
export default async function DashboardPage() {
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
      redirect("/dashboard");
    }

    await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id);

    await supabase.auth.updateUser({ data: { name } });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">Você precisa estar logado para acessar o dashboard.</p>
          <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md">
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  const profile = await getAuthenticatedProfile();
  const isCoordinator = profile?.role === "coordinator";

  // Busca dados de resumo — falhas silenciosas para não quebrar o dashboard
  let groups: Awaited<ReturnType<typeof fetchAllGroups>> = [];
  let advisorCount = 0;
  let coordinatorSummary: Awaited<ReturnType<typeof fetchCoordinatorSummary>> | null = null;

  try {
    groups = await fetchAllGroups();
  } catch {
    // tabela não existe ainda
  }

  try {
    const advisors = await fetchAllAdvisors();
    advisorCount = advisors.length;
  } catch {
    // tabela não existe ainda
  }

  try {
    coordinatorSummary = await fetchCoordinatorSummary();
  } catch {
    // falha silenciosa — painel pode não aparecer se banco não estiver pronto
  }

  const recentGroups = groups.slice(0, 5);
  const statusCount = {
    planejamento: groups.filter((g) => !g.status || g.status === "planejamento").length,
    em_andamento: groups.filter((g) => g.status === "em_andamento").length,
    concluido: groups.filter((g) => g.status === "concluido").length,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Olá, {profile?.name || user.email}
          </p>
        </header>

        {/* Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total de grupos</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{groups.length}</p>
            <Link href="/groups" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              Ver todos os grupos →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Orientadores cadastrados</p>
            <p className="text-4xl font-bold text-green-600 mt-1">{advisorCount}</p>
            <Link href="/advisors" className="text-sm text-green-600 hover:underline mt-2 inline-block">
              Ver orientadores →
            </Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Progresso dos grupos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <p className="text-gray-700">Planejamento: <strong>{statusCount.planejamento}</strong></p>
            <p className="text-gray-700">Em andamento: <strong>{statusCount.em_andamento}</strong></p>
            <p className="text-gray-700">Concluídos: <strong>{statusCount.concluido}</strong></p>
          </div>
        </div>

        {/* Painel do coordenador */}
        {isCoordinator && coordinatorSummary && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">Painel do coordenador</h2>

            <div className="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-sm font-medium text-indigo-900">Ação rápida do coordenador</p>
              <p className="text-xs text-indigo-800 mt-1">
                Criação manual de grupos para organizar estudantes sem vínculo ou ajustar composições.
              </p>
              <Link
                href="/groups?from=coordinator"
                className="inline-block mt-2 text-xs font-semibold text-indigo-700 hover:underline"
              >
                Criar grupo manualmente →
              </Link>
            </div>

            {/* Alertas */}
            {(coordinatorSummary.groupsWithoutAdvisor > 0 || coordinatorSummary.advisorsFullCount > 0) && (
              <div className="mb-5 space-y-2">
                {coordinatorSummary.groupsWithoutAdvisor > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                    <span className="font-bold mt-0.5">⚠</span>
                    <span>
                      <strong>{coordinatorSummary.groupsWithoutAdvisor}</strong>{" "}
                      {coordinatorSummary.groupsWithoutAdvisor === 1
                        ? "grupo sem orientador principal"
                        : "grupos sem orientador principal"}.
                      {coordinatorSummary.groupsPendingIndication > 0 && (
                        <> <strong>{coordinatorSummary.groupsPendingIndication}</strong>{" "}
                        {coordinatorSummary.groupsPendingIndication === 1
                          ? "deles tem lista de preferências e pode ser indicado automaticamente."
                          : "deles têm lista de preferências e podem ser indicados automaticamente."}</>
                      )}
                    </span>
                  </div>
                )}
                {coordinatorSummary.advisorsFullCount > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900">
                    <span className="font-bold mt-0.5">✕</span>
                    <span>
                      <strong>{coordinatorSummary.advisorsFullCount}</strong>{" "}
                      {coordinatorSummary.advisorsFullCount === 1
                        ? "orientador atingiu o limite de orientações."
                        : "orientadores atingiram o limite de orientações."}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Carga dos orientadores */}
            {coordinatorSummary.advisorLoads.length > 0 ? (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Carga de orientações por orientador</h3>
                <div className="space-y-2">
                  {coordinatorSummary.advisorLoads.map(({ advisor, currentCount, maxOrientacoes, available }) => {
                    const pct = Math.min(100, Math.round((currentCount / maxOrientacoes) * 100));
                    return (
                      <div key={String(advisor.id)} className="flex items-center gap-3 text-sm">
                        <div className="w-40 shrink-0 truncate text-gray-800 font-medium" title={advisor.name}>
                          {advisor.name}
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              available ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span
                          className={`w-28 text-right text-xs font-semibold ${
                            available ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {currentCount}/{maxOrientacoes} {available ? "— disponível" : "— cheio"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-5">Nenhum orientador ativo cadastrado.</p>
            )}

            {/* Grupos sem orientador */}
            {coordinatorSummary.groupsWithoutAdvisorList.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Grupos sem orientador principal</h3>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                  {coordinatorSummary.groupsWithoutAdvisorList.map((group) => (
                      <div key={group.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {group.theme || group.member_1_name}
                          </p>
                          <p className="text-xs text-gray-500">{group.member_1_name} — {group.member_1_series}</p>
                          {group.hasPreferences ? (
                            <span className="text-xs text-blue-700 font-medium">Lista de preferências definida</span>
                          ) : (
                            <span className="text-xs text-gray-400">Sem lista de preferências</span>
                          )}
                          <p className="text-xs mt-1">
                            {group.indicationStatus === "pendente" ? (
                              <span className="text-amber-700 font-medium">Indicação pendente</span>
                            ) : group.indicationStatus === "recusada" ? (
                              <span className="text-red-700 font-medium">Última indicação recusada</span>
                            ) : group.indicationStatus === "aceita" ? (
                              <span className="text-green-700 font-medium">Indicação aceita</span>
                            ) : (
                              <span className="text-gray-400">Sem indicação ativa</span>
                            )}
                          </p>
                        </div>
                        <Link
                          href={`/groups/${group.id}`}
                          className="shrink-0 text-xs text-blue-600 hover:underline font-medium"
                        >
                          Gerenciar →
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Estudantes sem grupo</h3>

              {coordinatorSummary.studentsWithoutGroup.length === 0 ? (
                <p className="text-sm text-gray-500">Todos os estudantes ativos já estão vinculados em grupos.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                  {coordinatorSummary.studentsWithoutGroup.map((student) => (
                    <div key={String(student.id)} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">
                          {student.grade || "Série não informada"}
                          {" • "}
                          {student.school || "Escola não informada"}
                        </p>
                      </div>
                      <Link href="/groups" className="shrink-0 text-xs text-blue-600 hover:underline font-medium">
                        Vincular em grupo →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grupos recentes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Grupos recentes</h2>
            <Link href="/groups" className="text-sm text-blue-600 hover:underline">
              Ver todos
            </Link>
          </div>

          {recentGroups.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Nenhum grupo cadastrado.{" "}
              <Link href="/groups" className="text-blue-600 hover:underline">
                Criar primeiro grupo
              </Link>
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentGroups.map((group, index) => (
                <div key={group.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Grupo {groups.length - index}</p>
                    <p className="text-sm text-gray-700">
                      {group.member_1_name} — {group.member_1_series}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {getStatusLabel((group.status as GroupStatus) || "planejamento")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {group.theme || "Sem tema"}
                    </p>
                  </div>
                  <Link
                    href={`/groups/${group.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perfil */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Meu perfil</h2>

          <ul className="space-y-1 text-sm text-gray-700 mb-5">
            <li><strong>Nome:</strong> {profile?.name || user.user_metadata?.name || "Não definido"}</li>
            <li><strong>E-mail:</strong> {user.email}</li>
            <li><strong>Perfil:</strong> {profile?.role || "student"}</li>
          </ul>

          <form action={handleUpdateProfile} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="name"
              defaultValue={profile?.name || user.user_metadata?.name || ""}
              placeholder="Editar nome"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Salvar nome
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}


