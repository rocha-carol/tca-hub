"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  buildRewardMetrics,
  buildRewardStates,
  formatRewardPoints,
  MAX_REWARD_POINTS,
} from "@/lib/student-rewards";
import {
  STUDENT_JOURNEY_EVENTS,
  STUDENT_JOURNEY_SECTION_IDS,
  STUDENT_JOURNEY_STORAGE_KEYS,
  STUDENT_ROUTES,
} from "@/lib/utils/constants";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";

interface StudentPortalSidebarProps {
  hasGroup: boolean;
  group: Group | null;
  projectSections: GroupProjectSection[];
  processPhotosCount: number;
  repertoryItemsCount: number;
  studentName: string;
}

function readStoredBoolean(storageKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(storageKey) === "true";
}

function readStoredActiveMinutes(storageKey: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return 0;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function getGroupLabel(group: Group | null) {
  if (!group) {
    return "Nenhum grupo vinculado";
  }

  return group.theme || `Grupo ${String(group.id).slice(0, 8)}`;
}

export function StudentPortalSidebar({
  hasGroup,
  group,
  projectSections,
  processPhotosCount,
  repertoryItemsCount,
  studentName,
}: StudentPortalSidebarProps) {
  const pathname = usePathname();
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [waitingStudyCompleted, setWaitingStudyCompleted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const groupStatusHref = STUDENT_ROUTES.GROUP_STATUS;
  const isJourneyPage = pathname === STUDENT_ROUTES.JOURNEY || pathname.startsWith(`${STUDENT_ROUTES.JOURNEY}/`);
  const isGroupWorkspacePage = Boolean(
    group?.id && (pathname === `/groups/${group.id}` || pathname.startsWith(`/groups/${group.id}/`))
  );
  const shouldShowWaitingStudyLink = group?.indication_status === "pendente";
  const activeMinutesStorageKey = useMemo(
    () => `${STUDENT_JOURNEY_STORAGE_KEYS.ACTIVE_MINUTES}:${group?.id ?? "sem-grupo"}`,
    [group?.id]
  );
  const waitingStudyCompletedStorageKey = useMemo(
    () => `${STUDENT_JOURNEY_STORAGE_KEYS.WAITING_STUDY_COMPLETED}:${group?.id ?? "sem-grupo"}`,
    [group?.id]
  );
  const links = [
    {
      href: STUDENT_ROUTES.HOME,
      label: "Início do estudante",
      icon: "⌂",
      enabled: true,
    },
    {
      href: groupStatusHref,
      label: hasGroup ? "Meu grupo" : "Criar grupo",
      icon: "◫",
      enabled: true,
    },
    {
      href: STUDENT_ROUTES.JOURNEY,
      label: "Jornada do projeto",
      icon: "↗",
      enabled: true,
    },
    {
      href: hasGroup && group ? `/estudante/groups/${group.id}/theme-guide` : STUDENT_ROUTES.GROUP_CREATE,
      label: isJourneyPage && hasGroup ? "Revisar escolha do tema" : "Escolha do tema",
      icon: "✦",
      enabled: true,
    },
    {
      href: hasGroup && group ? `/estudante/groups/${group.id}/advisor-indication` : groupStatusHref,
      label: "Indicação de orientadores",
      icon: "➜",
      enabled: hasGroup,
    },
    {
      href: `${STUDENT_ROUTES.JOURNEY}#minhas-recompensas`,
      label: "Minhas conquistas",
      icon: "★",
      enabled: true,
    },
    ...(shouldShowWaitingStudyLink
      ? [
          {
            href: `${STUDENT_ROUTES.JOURNEY}#${STUDENT_JOURNEY_SECTION_IDS.WAITING_STUDY}`,
            label: waitingStudyCompleted ? "Reabrir apoio em espera" : "Abrir apoio em espera",
            icon: "✎",
            enabled: true,
          },
        ]
      : []),
  ];

  const groupWorkspaceLinks = hasGroup && group
    ? [
        { href: `/groups/${group.id}/project`, label: "Projeto", icon: "▣" },
        { href: `/groups/${group.id}/checklist`, label: "Checklist", icon: "✓" },
        { href: `/groups/${group.id}/timeline`, label: "Cronograma", icon: "◷" },
        { href: `/groups/${group.id}/questions`, label: "Dúvidas", icon: "?" },
        { href: `/groups/${group.id}/project/preview`, label: "Preview do projeto", icon: "◉" },
        { href: `/groups/${group.id}/comments`, label: "Comentários", icon: "◌" },
      ]
    : [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedState = window.localStorage.getItem("tca:student-sidebar:open");
    if (storedState === "false") {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("tca:student-sidebar:open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    const syncSidebarRewardState = () => {
      setActiveMinutes(readStoredActiveMinutes(activeMinutesStorageKey));
      setWaitingStudyCompleted(readStoredBoolean(waitingStudyCompletedStorageKey));
    };

    syncSidebarRewardState();

    function handleCompletedEvent(event: Event) {
      const customEvent = event as CustomEvent<{ storageKey?: string }>;

      if (customEvent.detail?.storageKey && customEvent.detail.storageKey !== waitingStudyCompletedStorageKey) {
        return;
      }

      syncSidebarRewardState();
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key !== activeMinutesStorageKey &&
        event.key !== waitingStudyCompletedStorageKey
      ) {
        return;
      }

      syncSidebarRewardState();
    }

    const intervalId = window.setInterval(syncSidebarRewardState, 15000);

    window.addEventListener(STUDENT_JOURNEY_EVENTS.WAITING_STUDY_COMPLETED, handleCompletedEvent as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(STUDENT_JOURNEY_EVENTS.WAITING_STUDY_COMPLETED, handleCompletedEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [activeMinutesStorageKey, waitingStudyCompletedStorageKey]);

  const rewardMetrics = useMemo(
    () => buildRewardMetrics({
      group,
      projectSections,
      processPhotosCount,
      repertoryItemsCount,
      activeMinutes,
      waitingStudyCompleted,
    }),
    [activeMinutes, group, processPhotosCount, projectSections, repertoryItemsCount, waitingStudyCompleted]
  );

  const achievedRewards = useMemo(
    () => buildRewardStates(rewardMetrics).filter((reward) => reward.achieved),
    [rewardMetrics]
  );

  const unlockedRewardPoints = useMemo(
    () => Math.min(
      achievedRewards.reduce((total, reward) => total + reward.points, 0),
      MAX_REWARD_POINTS
    ),
    [achievedRewards]
  );

  function getMobileLinkClass(href: string) {
    return isActive(href)
      ? "border-[#2F6F35] bg-[#2F6F35] text-[#F8FFF6] shadow-sm"
      : "border-[#CFE0C8] bg-white text-[#17301C] hover:border-[#B8D1AF] hover:bg-[#F4FAF1]";
  }

  function getDesktopLinkClass(href: string) {
    return isActive(href)
      ? "border-[#2F6F35] bg-[#2F6F35] text-[#F8FFF6] shadow-sm"
      : "border-[#DCEBD5] bg-white text-[#17301C] hover:border-[#C7DEC0] hover:bg-[#F3FBF1]";
  }

  function getDesktopIconClass(href: string) {
    return isActive(href)
      ? "bg-[#F8FFF6]/20 text-[#F8FFF6]"
      : "bg-[#EAF5E4] text-[#24532A]";
  }

  function getDesktopIndicatorClass(href: string) {
    return isActive(href) ? "text-[#F8FFF6]" : "text-[#2F6F35]";
  }

  function isActive(href: string) {
    const [pathWithoutHash] = href.split("#");
    return pathname === pathWithoutHash || pathname.startsWith(`${pathWithoutHash}/`);
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => !current);
  }

  return (
    <>
      <div className="lg:hidden">
        <div className="space-y-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex items-center gap-2 rounded-xl border border-[#CFE0C8] bg-white px-4 py-2.5 text-sm font-semibold text-[#17301C] shadow-sm transition-colors hover:bg-[#F4FAF1]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF5E4] text-[#24532A]">
              {isSidebarOpen ? "×" : "☰"}
            </span>
            {isSidebarOpen ? "Ocultar menu" : "Mostrar menu"}
          </button>

          {isSidebarOpen ? (
            <Card className="border border-[#DCEBD5] bg-[#F8FBF6] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                    Navegação do estudante
                  </p>
                  <p className="text-sm text-[#374151] mt-1">{getGroupLabel(group)}</p>
                </div>

                <Badge variant={hasGroup ? "green" : "yellow"}>
                  {hasGroup ? "Em grupo" : "Sem grupo"}
                </Badge>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${getMobileLinkClass(link.href)}`}
                  >
                    {link.label}
                  </Link>
                ))}

                {isGroupWorkspacePage
                  ? groupWorkspaceLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${getMobileLinkClass(link.href)}`}
                      >
                        {link.label}
                      </Link>
                    ))
                  : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <aside className={`hidden lg:block lg:shrink-0 ${isSidebarOpen ? "lg:w-72" : "lg:w-20"}`}>
        <div className="sticky top-24 space-y-4">
          {isSidebarOpen ? (
            <Card className="border border-[#DCEBD5] bg-[#F8FBF6] p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                      Navegação do estudante
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-[#1F2937]">Portal do estudante</h2>
                    <p className="mt-1 text-sm text-[#6B7280] leading-relaxed">
                      O menu permanece disponível em todas as páginas do estudante para manter o contexto da navegação.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCEBD5] bg-white text-[#24532A] transition-colors hover:bg-[#F3FBF1]"
                    aria-label="Ocultar sidebar"
                  >
                    ←
                  </button>
                </div>

                <div className="rounded-xl border border-[#DCEBD5] bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">Situação do grupo</p>
                      <p className="text-sm text-[#374151] mt-1 leading-relaxed">{getGroupLabel(group)}</p>
                    </div>

                    <Badge variant={hasGroup ? "green" : "yellow"}>
                      {hasGroup ? "Em grupo" : "Sem grupo"}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCEBD5] bg-white px-4 py-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">Sua situação atual</p>
                      <p className="text-xs text-[#6B7280] mt-1">Estudante: {studentName}</p>
                    </div>

                    {!group ? (
                      <div className="space-y-2 text-sm text-[#374151]">
                        <p>Você ainda não participa de um grupo.</p>
                        <p>Para começar o projeto, é necessário formar um grupo com seus colegas.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-[#374151]">Você já está cadastrado no:</p>
                          <p className="mt-1 font-semibold text-[#1F2937]">
                            {group.theme || `Grupo ${String(group.id).slice(0, 8)}`}
                          </p>
                        </div>

                        <Link
                          href={`${STUDENT_ROUTES.GROUP}/${group.id}`}
                          className="inline-flex rounded-lg border border-lime-200 bg-[#F8FBF6] px-4 py-2 text-sm font-medium text-lime-800 transition-colors hover:border-lime-300 hover:bg-[#F3FBF1]"
                        >
                          Acessar meu grupo
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <nav className="space-y-2">
                  {links.map((link) => {
                    const active = isActive(link.href);

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${getDesktopLinkClass(link.href)}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-sm ${getDesktopIconClass(link.href)}`}>
                            {link.icon}
                          </span>
                          {link.label}
                        </span>

                        {!link.enabled && !active ? (
                          <span className="text-xs text-[#6B7280]">Em breve</span>
                        ) : (
                          <span className={getDesktopIndicatorClass(link.href)}>{active ? "•" : "→"}</span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {isGroupWorkspacePage ? (
                  <div className="rounded-xl border border-[#DCEBD5] bg-white px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                        Navegação do projeto
                      </p>
                      <p className="mt-1 text-sm text-[#374151] leading-relaxed">
                        Os mesmos atalhos do projeto agora ficam integrados ao portal do estudante.
                      </p>
                    </div>

                    <nav className="mt-4 space-y-2">
                      {groupWorkspaceLinks.map((link) => {
                        const active = isActive(link.href);

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${getDesktopLinkClass(link.href)}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-sm ${getDesktopIconClass(link.href)}`}>
                                {link.icon}
                              </span>
                              {link.label}
                            </span>

                            <span className={getDesktopIndicatorClass(link.href)}>{active ? "•" : "→"}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                ) : null}

                {isJourneyPage ? (
                  <div className="rounded-xl border border-[#DCEBD5] bg-white px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                        Desafios concluídos
                      </p>
                      <p className="mt-1 text-sm text-[#374151] leading-relaxed">
                        Resumo das recompensas já conquistadas na jornada atual.
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={achievedRewards.length > 0 ? "green" : "gray"}>
                        {achievedRewards.length} desafios
                      </Badge>
                      <Badge variant="blue">
                        Pontuação extra: {formatRewardPoints(unlockedRewardPoints)} / {formatRewardPoints(MAX_REWARD_POINTS)}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      {achievedRewards.length > 0 ? (
                        achievedRewards.map((reward) => (
                          <Link
                            key={reward.id}
                            href={`${STUDENT_ROUTES.JOURNEY}#minhas-recompensas`}
                            className="flex items-start justify-between gap-3 rounded-xl border border-[#E4EFE0] bg-[#F8FBF6] px-3 py-3 text-sm transition-colors hover:border-[#D0E3CA] hover:bg-[#F3FBF1]"
                          >
                            <span className="flex min-w-0 items-start gap-3">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm">
                                {reward.icon}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-semibold text-[#1F2937]">{reward.title}</span>
                              </span>
                            </span>

                            <span className="shrink-0 text-xs font-semibold text-[#2F6F35]">
                              +{formatRewardPoints(reward.points)}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#D7E7D0] bg-[#F8FBF6] px-3 py-3 text-sm text-[#6B7280]">
                          Nenhuma recompensa conquistada ainda nesta jornada.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={toggleSidebar}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#DCEBD5] bg-white px-4 py-3 text-sm font-semibold text-[#17301C] shadow-sm transition-colors hover:bg-[#F4FAF1]"
                aria-label="Mostrar sidebar"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF5E4] text-[#24532A]">
                  ☰
                </span>
                Menu
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}