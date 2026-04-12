import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { fetchAllGroups, updateGroupAdvisors } from "@/services/group-service";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchCoordinatorSummary } from "@/services/coordinator-summary-service";
import type { GroupStatus } from "@/types/group";
import { Button } from "@/components/ui/Button";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

interface CoordinatorManagementPanelProps {
  bindStatus?: string | null;
  bindGroup?: string | null;
}

const COORDINATOR_DASHBOARD_PATH = "/coordinator/dashboard";

export default async function CoordinatorManagementPanel({
  bindStatus = null,
  bindGroup = null,
}: CoordinatorManagementPanelProps) {
  async function handleManualBindAdvisors(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (authenticatedProfile?.role !== "coordinator") {
      redirect(`${COORDINATOR_DASHBOARD_PATH}?bind_status=forbidden`);
    }

    const groupId = String(formData.get("group_id") ?? "").trim();
    const primaryAdvisorId = String(formData.get("primary_advisor_id") ?? "").trim() || null;
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    if (!groupId || !primaryAdvisorId) {
      redirect(`${COORDINATOR_DASHBOARD_PATH}?bind_status=invalid&bind_group=${groupId}`);
    }

    if (coAdvisorId && coAdvisorId === primaryAdvisorId) {
      redirect(`${COORDINATOR_DASHBOARD_PATH}?bind_status=duplicate&bind_group=${groupId}`);
    }

    try {
      await updateGroupAdvisors(groupId, primaryAdvisorId, coAdvisorId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("indisponível") || message.includes("limite")) {
        redirect(`${COORDINATOR_DASHBOARD_PATH}?bind_status=unavailable&bind_group=${groupId}`);
      }
      redirect(`${COORDINATOR_DASHBOARD_PATH}?bind_status=error&bind_group=${groupId}`);
    }

    revalidatePath(COORDINATOR_DASHBOARD_PATH);
    revalidatePath("/groups");
    redirect(`${COORDINATOR_DASHBOARD_PATH}?bind_status=success&bind_group=${groupId}`);
  }

  let groups: Awaited<ReturnType<typeof fetchAllGroups>> = [];
  let advisors: Awaited<ReturnType<typeof fetchAllAdvisors>> = [];
  let coordinatorSummary: Awaited<ReturnType<typeof fetchCoordinatorSummary>> | null = null;

  try {
    groups = await fetchAllGroups();
  } catch {
    groups = [];
  }

  try {
    advisors = await fetchAllAdvisors();
  } catch {
    advisors = [];
  }

  try {
    coordinatorSummary = await fetchCoordinatorSummary();
  } catch {
    coordinatorSummary = null;
  }

  const activeAdvisors = advisors.filter((advisor) => advisor.active !== false);
  const recentGroups = groups.slice(0, 5);

  if (!coordinatorSummary) {
    return (
      <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">Gerenciamento de grupos e orientadores</h2>
        <p className="text-sm text-[var(--tca-text-soft)]">
          Ainda não foi possível carregar os dados de gestão neste momento.
        </p>
      </div>
    );
  }

  return (
    <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
      <div className="mb-5">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Gerenciamento de grupos e orientadores</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--tca-text-soft)]">
            Todas as ações de distribuição, vínculo manual e acompanhamento operacional ficam centralizadas aqui.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <details id="carga-orientadores" className="group rounded-[22px] border border-[var(--tca-border)] bg-white/90 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.45)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Carga de orientações por orientador</p>
              <p className="mt-1 text-xs text-[var(--tca-text-muted)]">Distribuição atual da capacidade de acompanhamento.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coordinatorSummary.advisorsFullCount > 0 ? "bg-red-100 text-red-700" : "bg-lime-100 text-lime-700"}`}>
                {coordinatorSummary.advisorsFullCount > 0
                  ? `${coordinatorSummary.advisorsFullCount} no limite`
                  : `${activeAdvisors.length} disponível(is)`}
              </span>
              <span className="text-xs text-[var(--tca-text-muted)] transition group-open:rotate-180">⌄</span>
            </div>
          </summary>

          <div className="border-t border-[var(--tca-border)] px-4 py-4">
            {coordinatorSummary.advisorLoads.length > 0 ? (
              <div className="space-y-2">
                {coordinatorSummary.advisorLoads.map(({ advisor, currentCount, maxOrientacoes, available }) => {
                  const pct = Math.min(100, Math.round((currentCount / maxOrientacoes) * 100));
                  return (
                    <div key={String(advisor.id)} className="flex items-center gap-3 text-sm">
                      <div className="w-40 shrink-0 truncate font-semibold text-[var(--foreground)]" title={advisor.name}>
                        {advisor.name}
                      </div>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-[var(--tca-border)] bg-[linear-gradient(180deg,#eef2f7_0%,#e7edf4_100%)]">
                        <div
                          className={`h-full rounded-full transition-all ${available ? "bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)]" : "bg-[linear-gradient(135deg,var(--tca-highlight)_0%,#c93f61_100%)]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`w-28 text-right text-xs font-semibold ${available ? "text-green-700" : "text-red-700"}`}>
                        {currentCount}/{maxOrientacoes} {available ? "— disponível" : "— cheio"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--tca-text-muted)]">Nenhum orientador ativo cadastrado.</p>
            )}
          </div>
        </details>

        <details id="grupos-sem-orientador" className="group rounded-[22px] border border-[var(--tca-border)] bg-white/90 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.45)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Grupos sem orientador principal</p>
              <p className="mt-1 text-xs text-[var(--tca-text-muted)]">Vinculação manual e leitura das preferências já registradas.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coordinatorSummary.groupsWithoutAdvisor > 0 ? "bg-amber-100 text-amber-800" : "bg-lime-100 text-lime-700"}`}>
                {coordinatorSummary.groupsWithoutAdvisor > 0
                  ? `${coordinatorSummary.groupsWithoutAdvisor} sem orientação`
                  : "Sem pendências"}
              </span>
              <span className="text-xs text-[var(--tca-text-muted)] transition group-open:rotate-180">⌄</span>
            </div>
          </summary>

          <div className="border-t border-[var(--tca-border)] px-4 py-4">
            {coordinatorSummary.groupsWithoutAdvisorList.length > 0 ? (
              <div className="divide-y divide-[var(--tca-border)] overflow-hidden rounded-[22px] border border-[var(--tca-border)] bg-white">
                {coordinatorSummary.groupsWithoutAdvisorList.map((group) => (
                  <div key={group.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{group.theme || group.member_1_name}</p>
                      <p className="text-xs text-[var(--tca-text-muted)]">{group.member_1_name} — {group.member_1_series}</p>
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
                        <p className="text-xs text-green-700 mt-1 font-medium">Orientadores vinculados com sucesso.</p>
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
                        <p className="text-xs text-red-700 mt-1 font-medium">Não foi possível salvar o vínculo. Tente novamente.</p>
                      )}
                    </div>

                    <div className="w-full max-w-sm rounded-[20px] border border-[var(--tca-border)] bg-[var(--tca-surface-soft)] p-3">
                      {activeAdvisors.length > 0 ? (
                        <form action={handleManualBindAdvisors} className="space-y-3">
                          <input type="hidden" name="group_id" value={group.id} />

                          <div>
                            <label htmlFor={`manual-primary-${group.id}`} className="tca-form-label !mb-1 !text-xs">
                              Orientador principal
                            </label>
                            <select
                              id={`manual-primary-${group.id}`}
                              name="primary_advisor_id"
                              defaultValue=""
                              className="tca-select !py-2 !text-xs"
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
                            <label htmlFor={`manual-co-${group.id}`} className="tca-form-label !mb-1 !text-xs">
                              Coorientador (opcional)
                            </label>
                            <select
                              id={`manual-co-${group.id}`}
                              name="co_advisor_id"
                              defaultValue=""
                              className="tca-select !py-2 !text-xs"
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
                            <Button
                              type="submit"
                              size="sm"
                              className="text-xs"
                            >
                              Vincular manualmente
                            </Button>

                            <Link
                              href={`/groups/${group.id}`}
                              className="text-xs font-semibold text-[var(--tca-primary)] hover:underline"
                            >
                              Detalhes →
                            </Link>
                          </div>
                        </form>
                      ) : (
                        <div className="text-right">
                          <p className="mb-1 text-xs text-[var(--tca-text-muted)]">Sem orientadores ativos para vincular.</p>
                          <Link href="/coordinator/advisors" className="text-xs font-semibold text-[var(--tca-primary)] hover:underline">
                            Cadastrar orientador →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--tca-text-muted)]">Todos os grupos atuais já possuem orientação principal definida.</p>
            )}
          </div>
        </details>

        <details className="group rounded-xl border border-gray-200 bg-white/90">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Estudantes sem grupo</p>
              <p className="text-xs text-gray-500 mt-1">Base para composição manual e reorganização do ciclo.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coordinatorSummary.studentsWithoutGroup.length > 0 ? "bg-blue-100 text-blue-700" : "bg-lime-100 text-lime-700"}`}>
                {coordinatorSummary.studentsWithoutGroup.length > 0
                  ? `${coordinatorSummary.studentsWithoutGroup.length} sem grupo`
                  : "Todos vinculados"}
              </span>
              <span className="text-xs text-gray-400 transition group-open:rotate-180">⌄</span>
            </div>
          </summary>

          <div className="border-t border-gray-100 px-4 py-4">
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
                    <Link href="/groups?from=coordinator" className="shrink-0 text-xs text-lime-700 hover:underline font-medium">
                      Vincular em grupo →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="group rounded-xl border border-gray-200 bg-white/90">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Grupos recentes</p>
              <p className="text-xs text-gray-500 mt-1">Consulta rápida dos últimos grupos cadastrados no hub.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-semibold text-lime-700">
                {recentGroups.length} item(ns)
              </span>
              <span className="text-xs text-gray-400 transition group-open:rotate-180">⌄</span>
            </div>
          </summary>

          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">Abra um grupo para consultar detalhes ou continuar a gestão.</p>
              <Link href="/groups" className="text-sm text-lime-700 hover:underline">
                Ver todos
              </Link>
            </div>

            {recentGroups.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Nenhum grupo cadastrado.{" "}
                <Link href="/groups?from=coordinator" className="text-lime-700 hover:underline">
                  Criar primeiro grupo
                </Link>
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentGroups.map((group, index) => (
                  <div key={group.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">Grupo {groups.length - index}</p>
                      <p className="text-sm text-gray-700">
                        {group.member_1_name} — {group.member_1_series}
                      </p>
                      <p className="text-xs text-gray-500">
                        Status: {getStatusLabel((group.status as GroupStatus) || "planejamento")}
                      </p>
                      <p className="text-sm text-gray-500">{group.theme || "a definir"}</p>
                    </div>
                    <Link
                      href={`/groups/${group.id}`}
                      className="shrink-0 text-sm text-lime-700 hover:underline"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}