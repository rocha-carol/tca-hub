import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { fetchAllGroups, updateGroupAdvisors } from "@/services/group-service";
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
interface DashboardPageProps {
  searchParams?: Promise<{ bind_status?: string; bind_group?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const bindStatus = params.bind_status ?? null;
  const bindGroup = params.bind_group ?? null;

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

  async function handleManualBindAdvisors(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (authenticatedProfile?.role !== "coordinator") {
      redirect("/dashboard?bind_status=forbidden");
    }

    const groupId = String(formData.get("group_id") ?? "").trim();
    const primaryAdvisorId = String(formData.get("primary_advisor_id") ?? "").trim() || null;
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    if (!groupId || !primaryAdvisorId) {
      redirect(`/dashboard?bind_status=invalid&bind_group=${groupId}`);
    }

    if (coAdvisorId && coAdvisorId === primaryAdvisorId) {
      redirect(`/dashboard?bind_status=duplicate&bind_group=${groupId}`);
    }

    try {
      await updateGroupAdvisors(groupId, primaryAdvisorId, coAdvisorId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("indisponível") || message.includes("limite")) {
        redirect(`/dashboard?bind_status=unavailable&bind_group=${groupId}`);
      }
      redirect(`/dashboard?bind_status=error&bind_group=${groupId}`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/groups");
    redirect(`/dashboard?bind_status=success&bind_group=${groupId}`);
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="tca-soft-surface rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">Você precisa estar logado para acessar o dashboard.</p>
          <Link href="/auth/login" className="bg-lime-700 hover:bg-lime-800 text-white font-medium py-2 px-6 rounded-md">
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
  let advisors: Awaited<ReturnType<typeof fetchAllAdvisors>> = [];
  let advisorCount = 0;
  let coordinatorSummary: Awaited<ReturnType<typeof fetchCoordinatorSummary>> | null = null;

  try {
    groups = await fetchAllGroups();
  } catch {
    // tabela não existe ainda
  }

  try {
    advisors = await fetchAllAdvisors();
    advisorCount = advisors.length;
  } catch {
    // tabela não existe ainda
  }

  const activeAdvisors = advisors.filter((advisor) => advisor.active !== false);

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
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold tca-title-guide">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Olá, {profile?.name || user.email}
          </p>
          {isCoordinator && (
            <div className="mt-4">
              <Link
                href="/groups?from=coordinator"
                className="inline-flex items-center bg-lime-700 hover:bg-lime-800 text-white text-sm font-medium px-4 py-2 rounded-md"
              >
                Criar grupo manualmente
              </Link>
            </div>
          )}
        </header>

        {/* Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="tca-soft-surface rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total de grupos</p>
            <p className="text-4xl font-bold text-lime-700 mt-1">{groups.length}</p>
            <Link href="/groups" className="text-sm text-lime-700 hover:underline mt-2 inline-block">
              Ver todos os grupos →
            </Link>
          </div>

          <div className="tca-soft-surface rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Orientadores cadastrados</p>
            <p className="text-4xl font-bold text-green-600 mt-1">{advisorCount}</p>
            <Link href="/advisors" className="text-sm text-green-600 hover:underline mt-2 inline-block">
              Ver orientadores →
            </Link>
          </div>
        </div>

        <div className="tca-soft-surface rounded-lg p-5 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Progresso dos grupos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <p className="text-gray-700">Planejamento: <strong>{statusCount.planejamento}</strong></p>
            <p className="text-gray-700">Em andamento: <strong>{statusCount.em_andamento}</strong></p>
            <p className="text-gray-700">Concluídos: <strong>{statusCount.concluido}</strong></p>
          </div>
        </div>

        {/* Painel do coordenador */}
        {isCoordinator && coordinatorSummary && (
          <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">Painel do coordenador</h2>

            <div className="mb-5 rounded-md border border-lime-200 bg-lime-50 px-4 py-3">
              <p className="text-sm font-medium text-lime-900">Ação rápida do coordenador</p>
              <p className="text-xs text-lime-800 mt-1">
                Criação manual de grupos para organizar estudantes sem vínculo ou ajustar composições.
              </p>
              <Link
                href="/groups?from=coordinator"
                className="inline-block mt-2 text-xs font-semibold text-lime-700 hover:underline"
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

                          {bindGroup === group.id && bindStatus === "success" && (
                            <p className="text-xs text-green-700 mt-1 font-medium">Orientadores vinculados manualmente com sucesso.</p>
                          )}
                          {bindGroup === group.id && bindStatus === "unavailable" && (
                            <p className="text-xs text-red-700 mt-1 font-medium">Orientador principal indisponível (limite atingido).</p>
                          )}
                          {bindGroup === group.id && bindStatus === "duplicate" && (
                            <p className="text-xs text-red-700 mt-1 font-medium">Coorientador não pode ser igual ao orientador principal.</p>
                          )}
                          {bindGroup === group.id && bindStatus === "invalid" && (
                            <p className="text-xs text-red-700 mt-1 font-medium">Selecione ao menos um orientador principal.</p>
                          )}
                          {bindGroup === group.id && bindStatus === "error" && (
                            <p className="text-xs text-red-700 mt-1 font-medium">Não foi possível salvar o vínculo manual. Tente novamente.</p>
                          )}
                        </div>

                        <div className="w-full max-w-sm">
                          {activeAdvisors.length > 0 ? (
                            <form action={handleManualBindAdvisors} className="space-y-2">
                              <input type="hidden" name="group_id" value={group.id} />

                              <div>
                                <label htmlFor={`manual-primary-${group.id}`} className="block text-xs text-gray-600 mb-1">
                                  Orientador principal
                                </label>
                                <select
                                  id={`manual-primary-${group.id}`}
                                  name="primary_advisor_id"
                                  defaultValue=""
                                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-black bg-white text-xs focus:outline-none focus:ring-2 focus:ring-lime-500"
                                >
                                  <option value="">— Selecionar —</option>
                                  {activeAdvisors.map((advisor) => (
                                    <option key={advisor.id} value={String(advisor.id)}>
                                      {advisor.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label htmlFor={`manual-co-${group.id}`} className="block text-xs text-gray-600 mb-1">
                                  Coorientador (opcional)
                                </label>
                                <select
                                  id={`manual-co-${group.id}`}
                                  name="co_advisor_id"
                                  defaultValue=""
                                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-black bg-white text-xs focus:outline-none focus:ring-2 focus:ring-lime-500"
                                >
                                  <option value="">— Nenhum —</option>
                                  {activeAdvisors.map((advisor) => (
                                    <option key={advisor.id} value={String(advisor.id)}>
                                      {advisor.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="submit"
                                  className="bg-lime-700 hover:bg-lime-800 text-white text-xs font-medium px-3 py-1.5 rounded-md"
                                >
                                  Vincular manualmente
                                </button>

                                <Link
                                  href={`/groups/${group.id}`}
                                  className="text-xs text-lime-700 hover:underline font-medium"
                                >
                                  Detalhes →
                                </Link>
                              </div>
                            </form>
                          ) : (
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Sem orientadores ativos para vincular.</p>
                              <Link href="/advisors" className="text-xs text-lime-700 hover:underline font-medium">
                                Cadastrar orientador →
                              </Link>
                            </div>
                          )}
                        </div>
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
                      <Link href="/groups" className="shrink-0 text-xs text-lime-700 hover:underline font-medium">
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
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Grupos recentes</h2>
            <Link href="/groups" className="text-sm text-lime-700 hover:underline">
              Ver todos
            </Link>
          </div>

          {recentGroups.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Nenhum grupo cadastrado.{" "}
              <Link href="/groups" className="text-lime-700 hover:underline">
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
                    className="text-sm text-lime-700 hover:underline"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perfil */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
            <button
              type="submit"
              className="bg-lime-700 hover:bg-lime-800 text-white font-medium py-2 px-4 rounded-md"
            >
              Salvar nome
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}


