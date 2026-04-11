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

function getGroupStatusText(hasGroup: boolean, group: Group | null) {
  if (!hasGroup || !group) {
    return "Grupo ainda não formado";
  }

  if (group.indication_status === "pendente") {
    return "Aguardando retorno de orientadores";
  }

  if (group.primary_advisor_id) {
    return "Grupo com orientação definida";
  }

  return "Grupo em organização";
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
  const isStudentHomePage =
    pathname === STUDENT_ROUTES.HOME ||
    pathname === STUDENT_ROUTES.LEGACY_NAMESPACE_HOME ||
    pathname === STUDENT_ROUTES.LEGACY_HOME ||
    pathname === STUDENT_ROUTES.LEGACY_ROOT_HOME;
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
      label: "Início",
      icon: "⌂",
      enabled: true,
    },
    {
      href: groupStatusHref,
      label: hasGroup ? "Grupo" : "Criar grupo",
      icon: "◫",
      enabled: true,
    },
    {
      href: STUDENT_ROUTES.JOURNEY,
      label: "Jornada",
      icon: "↗",
      enabled: true,
    },
    {
      href: hasGroup && group ? `/estudante/groups/${group.id}/theme-guide` : STUDENT_ROUTES.GROUP_CREATE,
      label: "Tema",
      icon: "✦",
      enabled: true,
    },
    {
      href: hasGroup && group ? `/estudante/groups/${group.id}/advisor-indication` : groupStatusHref,
      label: "Orientadores",
      icon: "➜",
      enabled: hasGroup,
    },
    {
      href: `${STUDENT_ROUTES.JOURNEY}#minhas-recompensas`,
      label: "Conquistas",
      icon: "★",
      enabled: true,
    },
    ...(shouldShowWaitingStudyLink
      ? [
          {
            href: `${STUDENT_ROUTES.JOURNEY}#${STUDENT_JOURNEY_SECTION_IDS.WAITING_STUDY}`,
            label: waitingStudyCompleted ? "Apoio em espera" : "Apoio em espera",
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

  const groupStatusText = getGroupStatusText(hasGroup, group);

  function getMobileLinkClass(href: string) {
    return isActive(href)
      ? "border-[#BFD8B5] bg-[#EDF7E8] text-[#24532A] shadow-sm"
      : "border-[#DCE8D6] bg-white text-[#17301C] hover:border-[#C8DABD] hover:bg-[#F8FBF6]";
  }

  function getDesktopLinkClass(href: string) {
    return isActive(href)
      ? "border-[#C8DDC0] bg-[#EEF7EA] text-[#24532A] shadow-sm"
      : "border-[#E3EDE0] bg-white/95 text-[#17301C] hover:border-[#D0DFCA] hover:bg-[#F8FBF6]";
  }

  function getDesktopIconClass(href: string) {
    return isActive(href)
      ? "bg-white text-[#2F6F35]"
      : "bg-[#F1F8ED] text-[#24532A]";
  }

  function getDesktopIndicatorClass(href: string) {
    return isActive(href) ? "text-[#2F6F35]" : "text-[#7AA56F]";
  }

  function isActive(href: string) {
    const [pathWithoutHash] = href.split("#");
    return pathname === pathWithoutHash || pathname.startsWith(`${pathWithoutHash}/`);
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => !current);
  }

  if (isStudentHomePage) {
    return null;
  }

  return (
    <>
      <div className="lg:hidden">
        <div className="space-y-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8D6] bg-white/95 px-4 py-2.5 text-sm font-semibold text-[#17301C] shadow-[0_4px_14px_rgba(31,41,55,0.06)] transition-colors hover:bg-[#F8FBF6]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F8ED] text-[#24532A]">
              {isSidebarOpen ? "×" : "☰"}
            </span>
            {isSidebarOpen ? "Ocultar menu" : "Mostrar menu"}
          </button>

          {isSidebarOpen ? (
            <Card className="border border-[#E3EDE0] bg-[#FBFDF9] p-4 shadow-[0_8px_24px_rgba(31,41,55,0.05)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                    Navegação do estudante
                  </p>
                  <p className="text-sm text-[#374151] mt-1">{groupStatusText}</p>
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
            <Card className="border border-[#E3EDE0] bg-[#FBFDF9] p-5 shadow-[0_10px_30px_rgba(31,41,55,0.05)]">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                      Navegação do estudante
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-[#1F2937]">Portal do estudante</h2>
                    <p className="mt-1 text-sm text-[#6B7280] leading-relaxed">Acesso rápido ao que importa nesta etapa.</p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3EDE0] bg-white text-[#24532A] transition-colors hover:bg-[#F8FBF6]"
                    aria-label="Ocultar sidebar"
                  >
                    ←
                  </button>
                </div>

                <div className="rounded-2xl border border-[#E6EEE2] bg-white/95 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Resumo atual</p>
                      <p className="mt-2 text-base font-semibold text-[#1F2937] truncate">{getGroupLabel(group)}</p>
                      <p className="text-sm text-[#6B7280] mt-1">{studentName}</p>
                      <p className="text-sm text-[#4B5563] mt-2">{groupStatusText}</p>
                    </div>

                    <Badge variant={hasGroup ? "green" : "yellow"}>
                      {hasGroup ? "Em grupo" : "Sem grupo"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={hasGroup && group ? `${STUDENT_ROUTES.GROUP}/${group.id}` : STUDENT_ROUTES.GROUP_CREATE}
                      className="inline-flex rounded-lg border border-[#D9E8D2] bg-[#F8FBF6] px-4 py-2 text-sm font-medium text-[#2C5E31] transition-colors hover:border-[#C9DEC0] hover:bg-[#F3FBF1]"
                    >
                      {hasGroup ? "Acessar meu grupo" : "Criar grupo"}
                    </Link>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] mb-2">Navegação principal</p>
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
                </div>

                {isGroupWorkspacePage ? (
                  <div className="rounded-xl border border-[#E6EEE2] bg-white/95 px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                        Navegação do projeto
                      </p>
                    </div>

                    <nav className="mt-3 space-y-2">
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
                  <div className="rounded-xl border border-[#E6EEE2] bg-white/95 px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                        Desafios concluídos
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280] leading-relaxed">Resumo visual das conquistas já desbloqueadas.</p>
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
                            className="flex items-start justify-between gap-3 rounded-xl border border-[#E7EFE3] bg-[#FAFCF8] px-3 py-3 text-sm transition-colors hover:border-[#D9E6D2] hover:bg-[#F6FBF3]"
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
                className="inline-flex items-center gap-2 rounded-2xl border border-[#E3EDE0] bg-white/95 px-4 py-3 text-sm font-semibold text-[#17301C] shadow-[0_6px_18px_rgba(31,41,55,0.05)] transition-colors hover:bg-[#F8FBF6]"
                aria-label="Mostrar sidebar"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F1F8ED] text-[#24532A]">
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