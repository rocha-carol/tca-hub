import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import { fetchAllGroups } from "@/services/group-service";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchCoordinatorSummary } from "@/services/coordinator-summary-service";
import { Card } from "@/components/ui/Card";
import { InfoCard } from "@/components/cards/InfoCard";
import { ProgressCard } from "@/components/cards/ProgressCard";
import CoordinatorManagementPanel from "@/components/coordinator/CoordinatorManagementPanel";
import type { GroupStatus } from "@/types/group";

/**
 * Dashboard do coordenador.
 *
 * Extraído do dashboard geral — contém a visão completa do coordenador:
 * painel de gestão de grupos, carga dos orientadores, vinculação manual e
 * estudantes sem grupo. Inclui tudo que o orientador vê mais as ferramentas
 * exclusivas de coordenação.
 */

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

interface CoordinatorDashboardPageProps {
  searchParams?: Promise<{
    bind_status?: string;
    bind_group?: string;
    modo?: string;
    perfil?: string;
  }>;
}

type CoordinatorPriorityItem = {
  title: string;
  description: string;
  accentClassName: string;
  badgeLabel: string;
};

export default async function CoordinatorDashboardPage({ searchParams }: CoordinatorDashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const isProvisionalMode = params.modo === "provisorio";

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
  const effectiveRole = profile?.role ?? "coordinator";

  // Apenas coordenadores acessam esta rota
  if (!isProvisionalMode && effectiveRole !== "coordinator") {
    if (effectiveRole === "student") redirect(STUDENT_ROUTES.HOME);
    else redirect("/advisor/dashboard");
  }

  const displayName = isProvisionalMode
    ? "Coordenador (modo provisório)"
    : (profile?.name || user?.email || "Usuário");

  // Busca de dados — falhas silenciosas para não travar o dashboard
  let groups: Awaited<ReturnType<typeof fetchAllGroups>> = [];
  let advisors: Awaited<ReturnType<typeof fetchAllAdvisors>> = [];
  let advisorCount = 0;
  let coordinatorSummary: Awaited<ReturnType<typeof fetchCoordinatorSummary>> | null = null;

  try {
    groups = await fetchAllGroups();
  } catch {
    // tabela ainda não existe
  }

  try {
    advisors = await fetchAllAdvisors();
    advisorCount = advisors.length;
  } catch {
    // tabela ainda não existe
  }

  const activeAdvisors = advisors.filter((advisor) => advisor.active !== false);

  try {
    coordinatorSummary = await fetchCoordinatorSummary();
  } catch {
    // falha silenciosa
  }

  const recentGroups = groups.slice(0, 5);
  const statusCount = {
    planejamento: groups.filter((g) => !g.status || g.status === "planejamento").length,
    em_andamento: groups.filter((g) => g.status === "em_andamento").length,
    concluido: groups.filter((g) => g.status === "concluido").length,
  };
  const dashboardCompletedCount = statusCount.concluido;
  const dashboardTotalCount = Math.max(groups.length, 1);

  const priorityItems: CoordinatorPriorityItem[] = [];

  if (coordinatorSummary?.groupsWithoutAdvisor && coordinatorSummary.groupsWithoutAdvisor > 0) {
    priorityItems.push({
      title: "Vincular grupos sem orientação",
      description: `${coordinatorSummary.groupsWithoutAdvisor} grupo(s) ainda estão sem orientador principal definido.`,
      accentClassName: "border-amber-200 bg-amber-50/80",
      badgeLabel: `${coordinatorSummary.groupsWithoutAdvisor} pendência(s)`,
    });
  }

  if (coordinatorSummary?.studentsWithoutGroup.length && coordinatorSummary.studentsWithoutGroup.length > 0) {
    priorityItems.push({
      title: "Organizar estudantes sem grupo",
      description: `${coordinatorSummary.studentsWithoutGroup.length} estudante(s) seguem fora de um grupo ativo e pedem composição manual.`,
      accentClassName: "border-blue-200 bg-blue-50/70",
      badgeLabel: `${coordinatorSummary.studentsWithoutGroup.length} sem grupo`,
    });
  }

  if (coordinatorSummary?.groupsPendingIndication && coordinatorSummary.groupsPendingIndication > 0) {
    priorityItems.push({
      title: "Aproveitar preferências já registradas",
      description: `${coordinatorSummary.groupsPendingIndication} grupo(s) já têm preferências definidas e podem avançar na distribuição de orientação.`,
      accentClassName: "border-lime-200 bg-lime-50/80",
      badgeLabel: "Indicação pronta",
    });
  }

  if (coordinatorSummary?.advisorsFullCount && coordinatorSummary.advisorsFullCount > 0) {
    priorityItems.push({
      title: "Revisar carga de orientação",
      description: `${coordinatorSummary.advisorsFullCount} orientador(es) atingiram o limite atual e podem gerar gargalos no fluxo.`,
      accentClassName: "border-red-200 bg-red-50/75",
      badgeLabel: "Carga no limite",
    });
  }

  if (activeAdvisors.length === 0) {
    priorityItems.push({
      title: "Cadastrar orientadores ativos",
      description: "Ainda não há orientadores ativos disponíveis para distribuição dos grupos.",
      accentClassName: "border-[#D9E7D4] bg-[#F8FBF6]",
      badgeLabel: "Base mínima",
    });
  }

  const visiblePriorityItems = priorityItems.slice(0, 3);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

        <header className="mb-8 rounded-2xl border border-[#E3EDE0] bg-white/90 px-5 py-5 shadow-[0_8px_24px_rgba(31,41,55,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">Área da coordenação</p>
          <h1 className="mt-2 text-3xl font-bold tca-title-guide">Dashboard — Coordenador</h1>
          <p className="text-gray-600 mt-1.5 max-w-3xl">
            Olá, {displayName}. Esta visão reúne prioridades institucionais, gargalos do processo e os atalhos para organizar grupos, orientações e acompanhamento do ciclo.
          </p>
          {isProvisionalMode && (
            <p className="text-xs text-amber-700 mt-1 font-medium">
              Navegação provisória ativa (sem autenticação real)
            </p>
          )}
        </header>

        <Card className="mb-8 border border-[#DCEBD5] bg-[#FBFDF9]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#6B7280] font-semibold">Prioridades da coordenação</p>
              <h2 className="text-xl font-semibold text-[#1F2937] mt-1">O que precisa de decisão agora</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                Resumo das ações mais importantes para manter os grupos distribuídos, acompanhados e em andamento.
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

                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#D9E7D4] bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[#1F2937]">Nenhuma pendência institucional crítica no momento</p>
              <p className="text-sm text-[#6B7280] mt-1">
                A base atual está organizada. Este é um bom momento para revisar o panorama dos grupos e acompanhar a evolução pedagógica do ciclo.
              </p>
            </div>
          )}

        </Card>

        <div className="mb-8">
          <CoordinatorManagementPanel
            bindStatus={params.bind_status ?? null}
            bindGroup={params.bind_group ?? null}
          />
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <InfoCard
            title="Grupos cadastrados"
            value={groups.length}
            description="Visualize e acompanhe todos os grupos do hub."
            href="/groups"
            linkLabel="Ver todos os grupos →"
            accent="green"
          />

          <InfoCard
            title="Orientadores cadastrados"
            value={advisorCount}
            description="Profissionais disponíveis para acompanhar os projetos."
            href="/coordinator/advisors"
            linkLabel="Ver orientadores →"
            accent="blue"
          />
        </div>

        {/* Progresso geral + distribuição */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mb-8">
          <ProgressCard
            title="Progresso geral"
            description="Panorama geral dos projetos concluídos em relação ao total cadastrado."
            value={dashboardCompletedCount}
            max={dashboardTotalCount}
          />

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Distribuição dos grupos</h2>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <p className="text-gray-700">Planejamento: <strong>{statusCount.planejamento}</strong></p>
              <p className="text-gray-700">Em andamento: <strong>{statusCount.em_andamento}</strong></p>
              <p className="text-gray-700">Concluídos: <strong>{statusCount.concluido}</strong></p>
            </div>
          </Card>
        </div>

      </section>
    </main>
  );
}
