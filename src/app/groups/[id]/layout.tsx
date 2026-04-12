import type { ReactNode } from "react";
import GroupContextPanel from "@/components/layout/GroupContextPanel";
import GroupWorkspaceTopNav, { type WorkspaceNavLink } from "@/components/layout/GroupWorkspaceTopNav";
import { RouteVisibility } from "@/components/layout/RouteVisibility";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { loadStudentPortalData } from "@/app/student/_lib/student-portal-data";
import { fetchGroupById } from "@/services/group-service";
import { STUDENT_JOURNEY_SECTION_IDS, STUDENT_ROUTES } from "@/lib/utils/constants";

interface GroupLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function GroupLayout({ children, params }: GroupLayoutProps) {
  const { id } = await params;
  const profile = await getAuthenticatedProfile();
  const previewRoutePrefix = `/groups/${id}/project/preview`;
  const currentGroup = await fetchGroupById(id).catch(() => null);

  let title = currentGroup?.theme?.trim() || `Grupo ${String(id).slice(0, 8)}`;
  let subtitle = "Acompanhe o projeto, os registros e as intervenções pedagógicas do grupo em um workspace mais limpo e contextual.";
  let roleLabel = profile?.role === "advisor" ? "Orientador" : profile?.role === "coordinator" ? "Coordenação" : "Estudante";
  let backHref = profile?.role === "advisor" ? "/advisor/dashboard" : profile?.role === "coordinator" ? "/groups" : STUDENT_ROUTES.GROUP_STATUS;
  let backLabel = profile?.role === "advisor" ? "Voltar ao dashboard" : profile?.role === "coordinator" ? "Voltar aos grupos" : "Voltar ao grupo";
  let primaryLinks: WorkspaceNavLink[] = [];
  let secondaryLinks: WorkspaceNavLink[] = [];

  if (profile?.role === "student") {
    const { context } = await loadStudentPortalData();
    const studentGroup = context.group;
    const shouldShowWaitingStudyLink = studentGroup?.indication_status === "pendente";

    title = studentGroup?.theme?.trim() || title;
    subtitle = "Organize a escrita, acompanhe o cronograma e consulte os apoios do projeto sem perder espaço de leitura do conteúdo.";
    roleLabel = "Estudante";
    backHref = STUDENT_ROUTES.GROUP_STATUS;
    backLabel = "Voltar ao grupo";

    secondaryLinks = [
      { href: STUDENT_ROUTES.HOME, label: "Início", icon: "⌂" },
      { href: STUDENT_ROUTES.GROUP_STATUS, label: studentGroup ? "Grupo" : "Criar grupo", icon: "◫" },
      { href: STUDENT_ROUTES.JOURNEY, label: "Jornada", icon: "↗" },
      {
        href: studentGroup ? `/estudante/groups/${studentGroup.id}/theme-guide` : STUDENT_ROUTES.GROUP_CREATE,
        label: "Tema",
        icon: "✦",
      },
      {
        href: studentGroup ? `/estudante/groups/${studentGroup.id}/advisor-indication` : STUDENT_ROUTES.GROUP_STATUS,
        label: "Orientadores",
        icon: "➜",
        enabled: Boolean(studentGroup),
      },
      ...(shouldShowWaitingStudyLink
        ? [
            {
              href: `${STUDENT_ROUTES.JOURNEY}#${STUDENT_JOURNEY_SECTION_IDS.WAITING_STUDY}`,
              label: "Apoio em espera",
              icon: "✎",
            },
          ]
        : []),
    ];

    primaryLinks = [
      { href: `/groups/${id}/project`, label: "Projeto", icon: "▣" },
      { href: `/groups/${id}/checklist`, label: "Checklist", icon: "✓" },
      { href: `/groups/${id}/timeline`, label: "Cronograma", icon: "◷" },
      { href: `/groups/${id}/questions`, label: "Dúvidas", icon: "?" },
      { href: `/groups/${id}/comments`, label: "Comentários", icon: "◌" },
      { href: `/groups/${id}/project/preview`, label: "Preview", icon: "◉" },
    ];

    return (
      <div className="min-h-[calc(100vh-57px)] bg-[#f3f8ef]">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <RouteVisibility hideWhenStartsWith={[previewRoutePrefix]}>
            <div className="mb-6">
              <GroupWorkspaceTopNav
                backHref={backHref}
                backLabel={backLabel}
                title={title}
                subtitle={subtitle}
                roleLabel={roleLabel}
                secondaryLinks={secondaryLinks}
                primaryLinks={primaryLinks}
              />
            </div>
          </RouteVisibility>

          <RouteVisibility hideWhenStartsWith={[previewRoutePrefix]}>
            <details className="group mb-6 overflow-hidden rounded-[24px] border border-[#DCE8D6] bg-white/90 shadow-[0_10px_30px_rgba(31,41,55,0.04)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 lg:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Panorama e apoio</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Abrir contexto pedagógico do grupo</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">Mantém à vista panorama, próximos passos, comentários e orientação pedagógica sem ocupar a lateral da tela.</p>
                </div>
                <span className="rounded-full bg-[#EEF7EA] px-3 py-1 text-xs font-semibold text-[#2F6F35] transition-transform group-open:rotate-180">⌄</span>
              </summary>

              <div className="border-t border-[#E7EFE4] px-5 py-5 lg:px-6">
                <GroupContextPanel groupId={id} mode="stacked" />
              </div>
            </details>
          </RouteVisibility>

          <div className="min-w-0 overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (profile?.role === "advisor") {
    title = currentGroup?.theme?.trim() || title;
    subtitle = "Acompanhe o andamento do grupo, faça intervenções pedagógicas e navegue entre os módulos do projeto sem competir visualmente com o conteúdo principal.";
    roleLabel = "Orientador";
    backHref = "/advisor/dashboard";
    backLabel = "Voltar ao dashboard";
    secondaryLinks = [
      { href: "/advisor/dashboard", label: "Dashboard", icon: "◫" },
      { href: `/groups/${id}/project`, label: "Próximos passos", icon: "➜" },
    ];
    primaryLinks = [
      { href: `/groups/${id}/project`, label: "Andamento do grupo", icon: "▣" },
      { href: `/groups/${id}/checklist`, label: "Checklist", icon: "✓" },
      { href: `/groups/${id}/timeline`, label: "Cronograma", icon: "◷" },
      { href: `/groups/${id}/questions`, label: "Dúvidas", icon: "?" },
      { href: `/groups/${id}/comments`, label: "Comentários", icon: "◌" },
      { href: `/groups/${id}/project/preview`, label: "Preview", icon: "◉" },
    ];
  } else if (profile?.role === "coordinator") {
    title = currentGroup?.theme?.trim() || title;
    subtitle = "Consulte a leitura institucional do grupo e navegue entre os módulos principais sem depender de uma barra lateral fixa.";
    roleLabel = "Coordenação";
    backHref = "/groups";
    backLabel = "Voltar aos grupos";
    secondaryLinks = [
      { href: "/dashboard", label: "Dashboard", icon: "◫" },
      { href: "/groups", label: "Grupos", icon: "▤" },
    ];
    primaryLinks = [
      { href: `/groups/${id}/project`, label: "Projeto", icon: "▣" },
      { href: `/groups/${id}/checklist`, label: "Checklist", icon: "✓" },
      { href: `/groups/${id}/timeline`, label: "Cronograma", icon: "◷" },
      { href: `/groups/${id}/questions`, label: "Dúvidas", icon: "?" },
      { href: `/groups/${id}/comments`, label: "Comentários", icon: "◌" },
      { href: `/groups/${id}/final-product`, label: "Produto final", icon: "◆" },
      { href: `/groups/${id}/project/preview`, label: "Preview", icon: "◉" },
    ];
  } else {
    secondaryLinks = [{ href: "/dashboard", label: "Dashboard", icon: "◫" }];
    primaryLinks = [
      { href: `/groups/${id}/project`, label: "Projeto", icon: "▣" },
      { href: `/groups/${id}/checklist`, label: "Checklist", icon: "✓" },
      { href: `/groups/${id}/timeline`, label: "Cronograma", icon: "◷" },
      { href: `/groups/${id}/diary`, label: "Diário", icon: "☰" },
      { href: `/groups/${id}/questions`, label: "Dúvidas", icon: "?" },
      { href: `/groups/${id}/comments`, label: "Comentários", icon: "◌" },
      { href: `/groups/${id}/final-product`, label: "Produto final", icon: "◆" },
      { href: `/groups/${id}/project/preview`, label: "Preview", icon: "◉" },
    ];
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#f3f8ef]">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <RouteVisibility hideWhenStartsWith={[previewRoutePrefix]}>
        <div className="mb-6">
          <GroupWorkspaceTopNav
            backHref={backHref}
            backLabel={backLabel}
            title={title}
            subtitle={subtitle}
            roleLabel={roleLabel}
            secondaryLinks={secondaryLinks}
            primaryLinks={primaryLinks}
          />
        </div>
      </RouteVisibility>

      <RouteVisibility hideWhenStartsWith={[previewRoutePrefix]}>
        <details className="group mb-6 overflow-hidden rounded-[24px] border border-[#DCE8D6] bg-white/90 shadow-[0_10px_30px_rgba(31,41,55,0.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Panorama e apoio</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Abrir contexto pedagógico do grupo</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Mantém à vista panorama, próximos passos, comentários e orientação pedagógica sem ocupar a lateral da tela.</p>
            </div>
            <span className="rounded-full bg-[#EEF7EA] px-3 py-1 text-xs font-semibold text-[#2F6F35] transition-transform group-open:rotate-180">⌄</span>
          </summary>

          <div className="border-t border-[#E7EFE4] px-5 py-5 lg:px-6">
            <GroupContextPanel groupId={id} mode="stacked" />
          </div>
        </details>
      </RouteVisibility>

      <div className="min-w-0 overflow-x-hidden">
        {children}
      </div>
        </div>
    </div>
  );
}
