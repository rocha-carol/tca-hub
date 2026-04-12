import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import { buildStableGroupNumberMap, parseGeneratedGroupNumber } from "@/lib/utils/group-number";
import { resolveDisplayedGroupTheme } from "@/lib/utils/group-theme-label";
import { fetchGroupsVisibleToProfile, respondAdvisorIndication } from "@/services/group-service";
import { fetchGroupInternalNotificationsByGroupIds } from "@/services/group-internal-notification-service";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import { fetchGroupProjectSectionStageSchedule } from "@/services/project-section-stage-schedule-service";
import { fetchGroupProjectDevelopmentChecklistItems } from "@/services/project-development-checklist-service";
import { fetchGroupProjectSectionNextSteps } from "@/services/project-section-next-step-service";
import { fetchGroupProjectSectionVersions } from "@/services/project-section-version-service";
import { fetchGroupProjectSectionComments } from "@/services/project-section-comment-service";
import { Card } from "@/components/ui/Card";
import { ProgressCard } from "@/components/cards/ProgressCard";
import { ActionCard } from "@/components/cards/ActionCard";
import type { GroupStatus } from "@/types/group";
import type { GroupInternalNotification } from "@/types/group-internal-notification";

/**
 * Dashboard do orientador.
 *
 * Extraído do dashboard geral — contém apenas a visão do orientador:
 * grupos, projeto em destaque, atividade recente, perfil.
 *
 * Não inclui painel do coordenador nem ações exclusivas de coordenação.
 */

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function getGroupRecencyValue(group: {
  indication_updated_at?: string | null;
  created_at?: string | null;
}) {
  return Date.parse(group.indication_updated_at || group.created_at || "1970-01-01T00:00:00.000Z");
}

function resolveGroupDisplayNumber(
  group: { id: string | number; theme?: string | null },
  groupNumberMap: Map<string, number>
) {
  const parsedThemeNumber = parseGeneratedGroupNumber(group.theme);

  if (parsedThemeNumber !== null) {
    return parsedThemeNumber;
  }

  return groupNumberMap.get(String(group.id)) ?? "—";
}

function getGroupMembers(group: {
  member_1_name: string;
  member_1_series: string;
  member_2_name?: string | null;
  member_2_series?: string | null;
  member_3_name?: string | null;
  member_3_series?: string | null;
  member_4_name?: string | null;
  member_4_series?: string | null;
  member_5_name?: string | null;
  member_5_series?: string | null;
}) {
  return [
    { name: group.member_1_name, series: group.member_1_series },
    { name: group.member_2_name ?? null, series: group.member_2_series ?? null },
    { name: group.member_3_name ?? null, series: group.member_3_series ?? null },
    { name: group.member_4_name ?? null, series: group.member_4_series ?? null },
    { name: group.member_5_name ?? null, series: group.member_5_series ?? null },
  ].filter((member): member is { name: string; series: string | null } => Boolean(member.name));
}

interface AdvisorDashboardPageProps {
  searchParams?: Promise<{
    modo?: string;
    perfil?: string;
    indication_response?: string;
    indication_group?: string;
    indication_error?: string;
  }>;
}

type AdvisorPriorityItem = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  accentClassName: string;
  badgeLabel: string;
};

export default async function AdvisorDashboardPage({ searchParams }: AdvisorDashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const isProvisionalMode = params.modo === "provisorio";
  const indicationResponse = params.indication_response;
  const indicationGroup = params.indication_group;
  const indicationError = params.indication_error ? decodeURIComponent(params.indication_error) : null;

  async function handleRespondAdvisorIndication(formData: FormData) {
    "use server";

    const groupId = String(formData.get("group_id") ?? "").trim();
    const decision = String(formData.get("decision") ?? "").trim();

    if (!groupId || (decision !== "aceita" && decision !== "recusada")) {
      redirect("/advisor/dashboard?indication_response=invalid");
    }

    try {
      await respondAdvisorIndication(groupId, decision);
      revalidatePath("/advisor/dashboard");
      revalidatePath(`/groups/${groupId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível registrar a resposta agora. Tente novamente.";
      redirect(`/advisor/dashboard?indication_response=error&indication_group=${groupId}&indication_error=${encodeURIComponent(errorMessage)}`);
    }

    redirect(`/advisor/dashboard?indication_response=${decision}&indication_group=${groupId}`);
  }

  // Verificação de autenticação (ignorada no modo provisório)
  const user = isProvisionalMode ? null : await getAuthenticatedUser();

  if (!isProvisionalMode && !user) {
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

  const profile = isProvisionalMode ? null : await getAuthenticatedProfile();
  const effectiveRole = profile?.role ?? "advisor";

  // Orientadores não devem acessar esta página como coordenadores;
  // coordenadores têm rota própria em /coordinator/dashboard.
  if (!isProvisionalMode && effectiveRole === "student") {
    redirect(STUDENT_ROUTES.HOME);
  }
  if (!isProvisionalMode && effectiveRole === "coordinator") {
    redirect("/coordinator/dashboard");
  }

  const displayName = isProvisionalMode
    ? "Orientador (modo provisório)"
    : (profile?.name || user?.email || "Usuário");

  const displayEmail = isProvisionalMode ? "modo.provisorio@local" : (user?.email || "-");

  let authenticatedAdvisorId: string | number | null = null;
  let pendingIndicationNotifications: Array<{
    groupId: string;
    group: Awaited<ReturnType<typeof fetchGroupsVisibleToProfile>>[number];
    groupLabel: string;
    createdAt: string | null;
    title: string;
    message: string;
  }> = [];

  if (!isProvisionalMode && profile?.role === "advisor") {
    const supabase = await createClient();
    const { data: advisorRecord } = await supabase
      .from("advisors")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    authenticatedAdvisorId = advisorRecord?.id ?? null;
  }

  // Busca de dados — falhas silenciosas para não travar o dashboard
  let groups: Awaited<ReturnType<typeof fetchGroupsVisibleToProfile>> = [];

  try {
    groups = profile ? await fetchGroupsVisibleToProfile(profile) : [];
  } catch {
    // tabela ainda não existe
  }

  const recentGroups = groups.slice(0, 5);
  const groupNumberMap = buildStableGroupNumberMap(groups);
  const acceptedGroup = indicationResponse === "aceita" && indicationGroup
    ? groups.find((group) => String(group.id) === indicationGroup) ?? null
    : null;
  const persistedCelebrationGroup = authenticatedAdvisorId !== null
    ? [...groups]
        .filter((group) => idsAreEqual(group.primary_advisor_id, authenticatedAdvisorId))
        .sort((left, right) => getGroupRecencyValue(right) - getGroupRecencyValue(left))[0] ?? null
    : null;
  const highlightedAdvisorGroup = acceptedGroup || persistedCelebrationGroup;

  if (authenticatedAdvisorId !== null) {
    const pendingIndicationGroups = groups.filter(
      (group) =>
        group.indication_status === "pendente" &&
        idsAreEqual(group.indicated_advisor_id, authenticatedAdvisorId)
    );

    if (pendingIndicationGroups.length > 0) {
      let internalNotifications: GroupInternalNotification[] = [];
      try {
        internalNotifications = await fetchGroupInternalNotificationsByGroupIds(
          pendingIndicationGroups.map((group) => String(group.id))
        );
      } catch {
        internalNotifications = [];
      }

      pendingIndicationNotifications = pendingIndicationGroups.map((group) => {
        const latestNotification = internalNotifications.find(
          (notification) =>
            notification.group_id === String(group.id) &&
            notification.notification_type === "orientacao"
        );

        return {
          groupId: String(group.id),
          group,
          groupLabel: group.theme || `Grupo ${String(group.id).slice(0, 8)}`,
          createdAt: latestNotification?.created_at ?? null,
          title: latestNotification?.title || "Solicitação de orientação pendente",
          message:
            latestNotification?.message ||
            "Existe uma solicitação de orientação aguardando resposta neste grupo.",
        };
      });
    }
  }

  const statusCount = {
    planejamento: groups.filter((g) => !g.status || g.status === "planejamento").length,
    em_andamento: groups.filter((g) => g.status === "em_andamento").length,
    concluido: groups.filter((g) => g.status === "concluido").length,
  };
  const dashboardCompletedCount = statusCount.concluido;
  const dashboardTotalCount = Math.max(groups.length, 1);

  // Grupo em destaque: quando houve aceite recente, o dashboard deve permanecer
  // coerente com esse grupo para evitar mistura de contexto com outros grupos.
  const featuredGroup =
    acceptedGroup ||
    groups.find((group) => group.status === "em_andamento") ||
    groups.find((group) => group.status === "planejamento") ||
    recentGroups[0] ||
    null;

  let featuredSections: Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>> = [];
  let featuredSchedule: Awaited<ReturnType<typeof fetchGroupProjectSectionStageSchedule>> = [];
  let featuredChecklist: Awaited<ReturnType<typeof fetchGroupProjectDevelopmentChecklistItems>> = [];
  let featuredNextSteps: Awaited<ReturnType<typeof fetchGroupProjectSectionNextSteps>> = [];
  let featuredVersions: Awaited<ReturnType<typeof fetchGroupProjectSectionVersions>> = [];
  let featuredComments: Awaited<ReturnType<typeof fetchGroupProjectSectionComments>> = [];

  if (featuredGroup) {
    try { featuredSections = await ensureGroupProjectSectionsStructure(featuredGroup.id); } catch { featuredSections = []; }
    try { featuredSchedule = await fetchGroupProjectSectionStageSchedule(featuredGroup.id); } catch { featuredSchedule = []; }
    try { featuredChecklist = await fetchGroupProjectDevelopmentChecklistItems(featuredGroup.id); } catch { featuredChecklist = []; }
    try { featuredNextSteps = await fetchGroupProjectSectionNextSteps(featuredGroup.id); } catch { featuredNextSteps = []; }
    try { featuredVersions = await fetchGroupProjectSectionVersions(featuredGroup.id); } catch { featuredVersions = []; }
    try { featuredComments = await fetchGroupProjectSectionComments(featuredGroup.id); } catch { featuredComments = []; }
  }

  const featuredSectionTitleById = new Map(
    featuredSections.map((section) => [String(section.id), `${section.section_order}. ${section.section_title}`])
  );
  const featuredCompletedSections = featuredSections.filter((section) => section.status === "concluido").length;
  const featuredTotalSections = Math.max(featuredSections.length, 1);
  const pendingChecklistCount = featuredChecklist.filter((item) => item.status !== "concluido").length;
  const featuredRecentActivity = [
    ...featuredVersions.slice(0, 3).map((version) => ({
      id: `version-${version.id}`,
      created_at: version.created_at || "",
      title: `${version.author_name} adicionou conteúdo`,
      description: featuredSectionTitleById.get(String(version.section_id)) || "Seção do projeto",
    })),
    ...featuredComments.slice(-3).map((comment) => ({
      id: `comment-${comment.id}`,
      created_at: comment.created_at || "",
      title: `${comment.author_name} comentou seção`,
      description: featuredSectionTitleById.get(String(comment.section_id)) || "Seção do projeto",
    })),
  ].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 4);

  const priorityItems: AdvisorPriorityItem[] = [];

  if (pendingIndicationNotifications.length > 0) {
    priorityItems.push({
      title: "Responder orientações pendentes",
      description: `${pendingIndicationNotifications.length} grupo(s) aguardam resposta à solicitação de orientação.`,
      href: `/groups/${pendingIndicationNotifications[0].groupId}`,
      actionLabel: "Responder agora",
      accentClassName: "border-amber-200 bg-amber-50/80",
      badgeLabel: `${pendingIndicationNotifications.length} pendência(s)`,
    });
  }

  if (featuredGroup && pendingChecklistCount > 0) {
    priorityItems.push({
      title: "Retomar acompanhamento do projeto",
      description: `${pendingChecklistCount} item(ns) do checklist ainda pedem validação no grupo em destaque.`,
      href: `/groups/${featuredGroup.id}/checklist`,
      actionLabel: "Abrir checklist",
      accentClassName: "border-blue-200 bg-blue-50/70",
      badgeLabel: `${pendingChecklistCount} item(ns) pendente(s)`,
    });
  }

  if (featuredGroup && featuredNextSteps.length === 0) {
    priorityItems.push({
      title: "Registrar próximos passos",
      description: "O projeto em destaque ainda não possui orientação prática registrada para a próxima entrega.",
      href: `/groups/${featuredGroup.id}/project`,
      actionLabel: "Definir próximos passos",
      accentClassName: "border-lime-200 bg-lime-50/80",
      badgeLabel: "Ação pedagógica",
    });
  }

  if (featuredGroup && featuredComments.length === 0) {
    priorityItems.push({
      title: "Fazer primeira intervenção",
      description: "Ainda não há comentários pedagógicos registrados no projeto em destaque.",
      href: `/groups/${featuredGroup.id}/project`,
      actionLabel: "Abrir projeto",
      accentClassName: "border-[#D9E7D4] bg-[#F8FBF6]",
      badgeLabel: "Sem comentários",
    });
  }

  const visiblePriorityItems = priorityItems.slice(0, 3);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

        <header className="mb-8 rounded-2xl border border-[#E3EDE0] bg-white/90 px-5 py-5 shadow-[0_8px_24px_rgba(31,41,55,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">Área do orientador</p>
          <h1 className="mt-2 text-3xl font-bold tca-title-guide">Dashboard — Orientador</h1>
          <p className="text-gray-600 mt-1.5 max-w-2xl">
            Olá, {displayName}. Aqui ficam as prioridades do acompanhamento pedagógico, o panorama dos grupos vinculados e os acessos rápidos do ciclo atual.
          </p>
          {isProvisionalMode && (
            <p className="text-xs text-amber-700 mt-1 font-medium">
              Navegação provisória ativa (sem autenticação real)
            </p>
          )}
        </header>

        {highlightedAdvisorGroup && (
          <Card className="mb-8 border border-green-200 bg-green-50/80">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                  {acceptedGroup ? "Aceite confirmado" : "Orientação ativa"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-green-950">
                  Parabéns, você está orientando o Grupo {resolveGroupDisplayNumber(highlightedAdvisorGroup, groupNumberMap)}.
                </h2>
                <p className="mt-2 text-sm text-green-900 leading-relaxed">
                  {acceptedGroup ? "O acompanhamento foi confirmado" : "O acompanhamento segue ativo"} para o tema <strong>{resolveDisplayedGroupTheme({
                    storedTheme: highlightedAdvisorGroup.theme,
                    emptyLabel: "Tema em definição",
                  })}</strong>. Este é um ótimo momento para criar vínculo com o grupo e organizar os primeiros combinados pedagógicos.
                </p>
              </div>

              <Link
                href={`/groups/${highlightedAdvisorGroup.id}`}
                className="inline-flex rounded-lg bg-[#2F6F35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#275C2C]"
              >
                Abrir grupo
              </Link>
            </div>

            <div className="mt-5 rounded-2xl border border-green-200 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[#1F2937]">Dicas para ser um bom orientador</p>
              <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
                <li>• Comece ouvindo o que o grupo já construiu antes de propor ajustes.</li>
                <li>• Ajude a transformar ideias amplas em próximos passos claros e viáveis.</li>
                <li>• Registre comentários pedagógicos curtos, frequentes e acionáveis ao longo do percurso.</li>
                <li>• Valorize a autoria dos estudantes, orientando sem tomar o projeto para si.</li>
              </ul>
            </div>
          </Card>
        )}

        {pendingIndicationNotifications.length > 0 && (
          <Card className="mb-8 border border-amber-200 bg-amber-50/70">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-xl font-semibold text-amber-950">Solicitações de orientação aguardando resposta</h2>
                <p className="text-sm text-amber-900 mt-1">
                  Estas notificações foram registradas automaticamente quando um grupo indicou você como orientador atual.
                </p>
              </div>
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                {pendingIndicationNotifications.length} pendente(s)
              </span>
            </div>

            <div className="space-y-3">
              {pendingIndicationNotifications.map((notification) => (
                <div
                  key={notification.groupId}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{notification.title}</p>
                      <p className="text-sm text-[#4B5563] mt-1">{notification.message}</p>
                      <p className="text-xs text-[#6B7280] mt-2">
                        Grupo: {notification.groupLabel}
                        {notification.createdAt
                          ? ` • ${new Date(notification.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                    </div>

                    <details className="group mt-1 w-full lg:w-auto">
                      <summary className="list-none">
                        <span className="inline-flex cursor-pointer rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-50">
                          <span className="group-open:hidden">Ver detalhes do grupo</span>
                          <span className="hidden group-open:inline">Ocultar detalhes do grupo</span>
                        </span>
                      </summary>

                      <div className="mt-4 rounded-2xl border border-[#F3E2A3] bg-[#FFFDF7] px-4 py-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                              Grupo {resolveGroupDisplayNumber(notification.group, groupNumberMap)}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-[#1F2937]">
                              {resolveDisplayedGroupTheme({
                                storedTheme: notification.group.theme,
                                emptyLabel: "Tema em definição",
                              })}
                            </h3>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Estudantes</p>
                            <ul className="mt-2 space-y-2 text-sm text-[#374151]">
                              {getGroupMembers(notification.group).map((member) => (
                                <li key={`${notification.groupId}-${member.name}`} className="rounded-lg border border-[#F5E8BE] bg-white px-3 py-2">
                                  <span className="font-medium text-[#1F2937]">{member.name}</span>
                                  <span className="text-[#6B7280]"> — {member.series || "Ano não informado"}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Resposta da orientação</p>

                            <form action={handleRespondAdvisorIndication}>
                              <input type="hidden" name="group_id" value={notification.groupId} />
                              <input type="hidden" name="decision" value="aceita" />
                              <button
                                type="submit"
                                className="w-full rounded-lg bg-[#2F6F35] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#275C2C]"
                              >
                                Aceitar orientação
                              </button>
                            </form>

                            <form action={handleRespondAdvisorIndication}>
                              <input type="hidden" name="group_id" value={notification.groupId} />
                              <input type="hidden" name="decision" value="recusada" />
                              <button
                                type="submit"
                                className="w-full rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-50"
                              >
                                Passar a vez
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>

                  {indicationResponse === "aceita" && indicationGroup === notification.groupId && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                      Orientação aceita com sucesso.
                    </div>
                  )}

                  {indicationResponse === "recusada" && indicationGroup === notification.groupId && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Solicitação encaminhada para a próxima opção disponível.
                    </div>
                  )}

                  {indicationResponse === "error" && indicationGroup === notification.groupId && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      {indicationError || "Não foi possível registrar a resposta agora. Tente novamente."}
                    </div>
                  )}

                  {indicationResponse === "invalid" && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      A resposta da indicação não foi reconhecida.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="mb-8 border border-[#DCEBD5] bg-[#FBFDF9]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#6B7280] font-semibold">Prioridades do momento</p>
              <h2 className="text-xl font-semibold text-[#1F2937] mt-1">O que merece atenção primeiro</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                Resumo das ações mais importantes para manter o acompanhamento pedagógico em movimento.
              </p>
            </div>
          </div>

          {visiblePriorityItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {visiblePriorityItems.map((item) => (
                <div key={item.title} className={`rounded-2xl border px-4 py-4 shadow-sm ${item.accentClassName}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                      <p className="text-sm text-[#4B5563] mt-2 leading-relaxed">{item.description}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#355E3B]">
                      {item.badgeLabel}
                    </span>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={item.href}
                      className="inline-flex rounded-lg bg-[#2F6F35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#275C2C]"
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#D9E7D4] bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[#1F2937]">Nenhuma pendência crítica no momento</p>
              <p className="text-sm text-[#6B7280] mt-1">
                O acompanhamento atual está estável. Este é um bom momento para revisar os grupos e aprofundar intervenções pedagógicas.
              </p>
            </div>
          )}
        </Card>


        {/* Projeto em destaque */}
        <Card className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#6B7280] font-semibold">Projeto TCA</p>
              <h2 className="text-2xl font-bold text-[#1F2937] mt-1">
                {featuredGroup?.theme || featuredGroup?.member_1_name || "Selecione um grupo para começar"}
              </h2>
              <p className="text-sm text-[#6B7280] mt-2">
                Visão geral rápida do projeto com links para as áreas principais.
              </p>
            </div>
          </div>

          {featuredGroup ? (
            <>
              <div className="mb-6">
                <ProgressCard
                  title="Progresso do projeto"
                  description={`${featuredCompletedSections} de ${featuredSections.length} seções concluídas.`}
                  value={featuredCompletedSections}
                  max={featuredTotalSections}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <ActionCard
                  title="Seções do projeto"
                  value={featuredSections.length}
                  description="Acompanhe as etapas do texto autoral."
                  href={`/groups/${featuredGroup.id}/project`}
                  accent="green"
                />
                <ActionCard
                  title="Cronograma"
                  value={featuredSchedule.length}
                  description="Prazos e marcos do desenvolvimento."
                  href={`/groups/${featuredGroup.id}/timeline`}
                  accent="blue"
                />
                <ActionCard
                  title="Checklist"
                  value={featuredChecklist.length}
                  description="Itens de acompanhamento e validação."
                  href={`/groups/${featuredGroup.id}/checklist`}
                  accent="yellow"
                />
                <ActionCard
                  title="Próximos passos"
                  value={featuredNextSteps.length}
                  description="Orientações práticas para a próxima entrega."
                  href={`/groups/${featuredGroup.id}/project`}
                  accent="blue"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">Ainda não há grupos vinculados para exibir o projeto em destaque.</p>
          )}
        </Card>

        {/* Atividade recente */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Atividade recente</h2>
          {!featuredGroup || featuredRecentActivity.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Sem atividade recente registrada para o projeto em destaque.</p>
          ) : (
            <div className="space-y-3">
              {featuredRecentActivity.map((activity) => (
                <div key={activity.id} className="rounded-2xl bg-[#f8fbf6] border border-[#e6efe1] px-4 py-3 shadow-sm">
                  <p className="text-sm font-medium text-[#1F2937]">{activity.title}</p>
                  <p className="text-sm text-[#6B7280] mt-1">{activity.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

      </section>
    </main>
  );
}
