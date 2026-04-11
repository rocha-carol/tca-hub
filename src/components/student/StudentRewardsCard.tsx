"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";

interface StudentRewardsCardProps {
  group: Group | null;
  projectSections: GroupProjectSection[];
  processPhotosCount: number;
  repertoryItemsCount: number;
}

type RewardTier = "bronze" | "silver" | "gold" | "emerald" | "violet";

interface RewardMetrics {
  hasGroup: boolean;
  memberCount: number;
  totalWords: number;
  themeWords: number;
  processPhotosCount: number;
  repertoryItemsCount: number;
  activeMinutes: number;
  themeStarted: boolean;
  advisorRequested: boolean;
  advisorConfirmed: boolean;
  problemStarted: boolean;
  objectivesStarted: boolean;
  methodologyStarted: boolean;
  planningCompleted: boolean;
  developmentStarted: boolean;
  resultStarted: boolean;
  journeyCompleted: boolean;
}

interface RewardDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: RewardTier;
  points: number;
  unlocked: (metrics: RewardMetrics) => boolean;
}

const ACTIVE_TIME_STORAGE_KEY = "tca-hub:journey-active-minutes";
const MAX_REWARD_POINTS = 2;

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

function writeStoredActiveMinutes(storageKey: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, String(Math.max(0, Math.floor(value))));
}

function findSection(projectSections: GroupProjectSection[], sectionKey: string) {
  return projectSections.find((section) => section.section_key === sectionKey) ?? null;
}

function sectionHasProgress(section?: GroupProjectSection | null) {
  if (!section) {
    return false;
  }

  return section.status !== "nao_iniciado" || Boolean(section.content?.trim());
}

function countWords(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function countGroupMembers(group: Group | null) {
  if (!group) {
    return 0;
  }

  return [
    group.member_1_name,
    group.member_2_name,
    group.member_3_name,
    group.member_4_name,
    group.member_5_name,
  ].filter((memberName) => typeof memberName === "string" && memberName.trim().length > 0).length;
}

function getRewardToneClasses(tier: RewardTier, unlocked: boolean) {
  if (!unlocked) {
    return {
      containerClassName: "border-dashed border-[#D1D5DB] bg-[linear-gradient(135deg,#F9FAFB_0%,#F3F4F6_100%)] shadow-none",
      stickerContainerClassName: "rounded-full border-[3px] border-white bg-[#E5E7EB] text-[#9CA3AF] shadow-sm",
      iconInnerClassName: "",
      statusVariant: "gray" as const,
      pointsClassName: "bg-[#E5E7EB] text-[#6B7280]",
    };
  }

  if (tier === "bronze") {
    return {
      containerClassName: "border-[#E7C7A8] bg-[linear-gradient(135deg,#FFF7ED_0%,#FFEDD5_100%)] shadow-[0_12px_24px_-20px_rgba(120,74,29,0.9)]",
      stickerContainerClassName: "rounded-full border-[3px] border-white bg-[#D97706] text-white shadow-[0_10px_18px_-12px_rgba(120,74,29,1)]",
      iconInnerClassName: "",
      statusVariant: "yellow" as const,
      pointsClassName: "bg-[#FDE7C7] text-[#9A580A]",
    };
  }

  if (tier === "silver") {
    return {
      containerClassName: "border-[#D5E1E8] bg-[linear-gradient(135deg,#F8FCFF_0%,#EEF6FB_100%)] shadow-[0_12px_24px_-20px_rgba(75,85,99,0.85)]",
      stickerContainerClassName: "rounded-full border-[3px] border-white bg-[#94A3B8] text-white shadow-[0_10px_18px_-12px_rgba(75,85,99,1)]",
      iconInnerClassName: "",
      statusVariant: "blue" as const,
      pointsClassName: "bg-[#DCEAF6] text-[#31506B]",
    };
  }

  if (tier === "gold") {
    return {
      containerClassName: "border-[#F3DE92] bg-[linear-gradient(135deg,#FFFBEA_0%,#FEF3C7_100%)] shadow-[0_12px_24px_-20px_rgba(146,110,0,0.95)]",
      stickerContainerClassName: "rounded-full border-[3px] border-white bg-[#F2C94C] text-[#5C4400] shadow-[0_10px_18px_-12px_rgba(146,110,0,1)]",
      iconInnerClassName: "",
      statusVariant: "yellow" as const,
      pointsClassName: "bg-[#FAE9A5] text-[#735300]",
    };
  }

  if (tier === "emerald") {
    return {
      containerClassName: "border-[#C9E8D1] bg-[linear-gradient(135deg,#F2FBF5_0%,#DCFCE7_100%)] shadow-[0_12px_24px_-20px_rgba(47,111,53,0.95)]",
      stickerContainerClassName: "rounded-full border-[3px] border-white bg-[#4CAF50] text-white shadow-[0_10px_18px_-12px_rgba(47,111,53,1)]",
      iconInnerClassName: "",
      statusVariant: "green" as const,
      pointsClassName: "bg-[#CDEFD4] text-[#20632C]",
    };
  }

  return {
    containerClassName: "border-[#E5DAFA] bg-[linear-gradient(135deg,#FBF7FF_0%,#F3E8FF_100%)] shadow-[0_12px_24px_-20px_rgba(107,70,193,1)]",
    stickerContainerClassName: "rounded-full border-[3px] border-white bg-[#8B5CF6] text-white shadow-[0_10px_18px_-12px_rgba(107,70,193,1)]",
    iconInnerClassName: "",
    statusVariant: "blue" as const,
    pointsClassName: "bg-[#E9DBFF] text-[#5E35B1]",
  };
}

function formatPoints(points: number) {
  return points.toFixed(2).replace(".", ",");
}

function buildRewardDefinitions(): RewardDefinition[] {
  return [
    {
      id: "first-visit",
      title: "Primeiro passo",
      description: "A área de jornada foi aberta e a aventura no TCA Hub começou oficialmente.",
      icon: "🌱",
      tier: "bronze",
      points: 0.03,
      unlocked: () => true,
    },
    {
      id: "group-formed",
      title: "Grupo formado",
      description: "O grupo já existe e liberou a trilha principal do projeto.",
      icon: "🤝",
      tier: "bronze",
      points: 0.05,
      unlocked: (metrics) => metrics.hasGroup,
    },
    {
      id: "team-expanded",
      title: "Equipe ampliada",
      description: "Três ou mais integrantes já estão envolvidos na construção coletiva.",
      icon: "👥",
      tier: "silver",
      points: 0.07,
      unlocked: (metrics) => metrics.memberCount >= 3,
    },
    {
      id: "theme-started",
      title: "Tema em construção",
      description: "A seção de tema já ganhou os primeiros registros do grupo.",
      icon: "💡",
      tier: "bronze",
      points: 0.05,
      unlocked: (metrics) => metrics.themeStarted,
    },
    {
      id: "theme-deepened",
      title: "Tema aprofundado",
      description: "O grupo já escreveu um recorte mais consistente para o tema investigado.",
      icon: "🧠",
      tier: "silver",
      points: 0.08,
      unlocked: (metrics) => metrics.themeWords >= 120,
    },
    {
      id: "advisor-requested",
      title: "Orientação acionada",
      description: "A indicação de orientação já foi iniciada pelo grupo.",
      icon: "📨",
      tier: "bronze",
      points: 0.05,
      unlocked: (metrics) => metrics.advisorRequested,
    },
    {
      id: "advisor-confirmed",
      title: "Orientação confirmada",
      description: "Um orientador principal já está vinculado ao grupo.",
      icon: "🎓",
      tier: "gold",
      points: 0.12,
      unlocked: (metrics) => metrics.advisorConfirmed,
    },
    {
      id: "problem-started",
      title: "Problema investigado",
      description: "A pergunta central do projeto já começou a ser construída.",
      icon: "🔎",
      tier: "silver",
      points: 0.07,
      unlocked: (metrics) => metrics.problemStarted,
    },
    {
      id: "objectives-started",
      title: "Objetivos definidos",
      description: "Os objetivos da investigação já começaram a tomar forma.",
      icon: "🎯",
      tier: "silver",
      points: 0.07,
      unlocked: (metrics) => metrics.objectivesStarted,
    },
    {
      id: "methodology-started",
      title: "Metodologia estruturada",
      description: "O grupo já registrou como pretende investigar e agir.",
      icon: "🗺️",
      tier: "silver",
      points: 0.07,
      unlocked: (metrics) => metrics.methodologyStarted,
    },
    {
      id: "planning-complete",
      title: "Planejamento completo",
      description: "Problema, objetivos e metodologia já foram iniciados como base do percurso.",
      icon: "🧩",
      tier: "gold",
      points: 0.12,
      unlocked: (metrics) => metrics.planningCompleted,
    },
    {
      id: "development-started",
      title: "Mão na massa",
      description: "A etapa de desenvolvimento já começou a ser registrada pelo grupo.",
      icon: "⚙️",
      tier: "emerald",
      points: 0.12,
      unlocked: (metrics) => metrics.developmentStarted,
    },
    {
      id: "result-started",
      title: "Síntese em andamento",
      description: "Os resultados ou o produto final já começaram a ser consolidados.",
      icon: "🏁",
      tier: "emerald",
      points: 0.12,
      unlocked: (metrics) => metrics.resultStarted,
    },
    {
      id: "journey-complete",
      title: "Jornada central concluída",
      description: "As etapas principais da jornada do TCA já foram preenchidas.",
      icon: "👑",
      tier: "violet",
      points: 0.18,
      unlocked: (metrics) => metrics.journeyCompleted,
    },
    {
      id: "wordsmith-300",
      title: "Escrita consistente",
      description: "O grupo já acumulou pelo menos 300 palavras no projeto.",
      icon: "✍️",
      tier: "bronze",
      points: 0.07,
      unlocked: (metrics) => metrics.totalWords >= 300,
    },
    {
      id: "wordsmith-1200",
      title: "Autoria robusta",
      description: "O projeto já soma 1200 palavras ou mais em seus registros.",
      icon: "📚",
      tier: "gold",
      points: 0.13,
      unlocked: (metrics) => metrics.totalWords >= 1200,
    },
    {
      id: "photo-collector",
      title: "Memória visual",
      description: "O grupo já registrou pelo menos 3 fotos do processo.",
      icon: "📸",
      tier: "silver",
      points: 0.12,
      unlocked: (metrics) => metrics.processPhotosCount >= 3,
    },
    {
      id: "source-curator",
      title: "Curadoria inicial",
      description: "O repertório do projeto já reúne pelo menos 3 fontes registradas.",
      icon: "🧾",
      tier: "silver",
      points: 0.12,
      unlocked: (metrics) => metrics.repertoryItemsCount >= 3,
    },
    {
      id: "time-15",
      title: "Presença ativa",
      description: "Foram registrados pelo menos 15 minutos ativos nesta jornada neste navegador.",
      icon: "⏱️",
      tier: "bronze",
      points: 0.11,
      unlocked: (metrics) => metrics.activeMinutes >= 15,
    },
    {
      id: "time-45",
      title: "Fôlego de maratona",
      description: "Foram registrados pelo menos 45 minutos ativos nesta jornada neste navegador.",
      icon: "🔥",
      tier: "gold",
      points: 0.25,
      unlocked: (metrics) => metrics.activeMinutes >= 45,
    },
  ];
}

export function StudentRewardsCard({
  group,
  projectSections,
  processPhotosCount,
  repertoryItemsCount,
}: StudentRewardsCardProps) {
  const [activeMinutes, setActiveMinutes] = useState(0);
  const totalStoredMinutesRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  const storageKey = useMemo(
    () => `${ACTIVE_TIME_STORAGE_KEY}:${group?.id ?? "sem-grupo"}`,
    [group?.id]
  );

  useEffect(() => {
    const initialMinutes = readStoredActiveMinutes(storageKey);
    totalStoredMinutesRef.current = initialMinutes;
    setActiveMinutes(initialMinutes);
    startedAtRef.current = document.visibilityState === "visible" ? Date.now() : null;

    function flushElapsedMinutes() {
      if (startedAtRef.current === null) {
        return;
      }

      const elapsedMs = Date.now() - startedAtRef.current;
      if (elapsedMs <= 0) {
        return;
      }

      const nextTotalMinutes = totalStoredMinutesRef.current + elapsedMs / 60000;
      totalStoredMinutesRef.current = nextTotalMinutes;
      setActiveMinutes(nextTotalMinutes);
      writeStoredActiveMinutes(storageKey, nextTotalMinutes);
      startedAtRef.current = Date.now();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushElapsedMinutes();
        startedAtRef.current = null;
        return;
      }

      startedAtRef.current = Date.now();
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        flushElapsedMinutes();
      }
    }, 15000);

    window.addEventListener("beforeunload", flushElapsedMinutes);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flushElapsedMinutes();
      window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", flushElapsedMinutes);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [storageKey]);

  const metrics = useMemo<RewardMetrics>(() => {
    const themeSection = findSection(projectSections, "tema_contexto");
    const problemSection = findSection(projectSections, "problema_justificativa");
    const objectivesSection = findSection(projectSections, "objetivos");
    const methodologySection = findSection(projectSections, "metodologia_plano");
    const developmentSection = findSection(projectSections, "desenvolvimento_registros");
    const resultSection = findSection(projectSections, "resultado_produto_final");

    return {
      hasGroup: Boolean(group),
      memberCount: countGroupMembers(group),
      totalWords: projectSections.reduce((total, section) => total + countWords(section.content), 0),
      themeWords: countWords(themeSection?.content),
      processPhotosCount,
      repertoryItemsCount,
      activeMinutes,
      themeStarted: sectionHasProgress(themeSection),
      advisorRequested: Boolean(group?.indicated_advisor_id || group?.indication_status),
      advisorConfirmed: Boolean(group?.primary_advisor_id),
      problemStarted: sectionHasProgress(problemSection),
      objectivesStarted: sectionHasProgress(objectivesSection),
      methodologyStarted: sectionHasProgress(methodologySection),
      planningCompleted: [problemSection, objectivesSection, methodologySection].every(sectionHasProgress),
      developmentStarted: sectionHasProgress(developmentSection),
      resultStarted: sectionHasProgress(resultSection),
      journeyCompleted: Boolean(
        sectionHasProgress(themeSection) &&
        group?.primary_advisor_id &&
        [problemSection, objectivesSection, methodologySection].every(sectionHasProgress) &&
        sectionHasProgress(developmentSection) &&
        sectionHasProgress(resultSection)
      ),
    };
  }, [activeMinutes, group, processPhotosCount, projectSections, repertoryItemsCount]);

  const rewards = useMemo(
    () => buildRewardDefinitions().map((reward) => ({
      ...reward,
      achieved: reward.unlocked(metrics),
    })),
    [metrics]
  );

  const unlockedRewardsCount = rewards.filter((reward) => reward.achieved).length;
  const unlockedRewardPoints = Math.min(
    rewards.reduce((total, reward) => total + (reward.achieved ? reward.points : 0), 0),
    MAX_REWARD_POINTS
  );
  const totalAvailableRewardPoints = Math.min(
    rewards.reduce((total, reward) => total + reward.points, 0),
    MAX_REWARD_POINTS
  );

  return (
    <div
      id="minhas-recompensas"
      className="scroll-mt-24 lg:-ml-6 lg:w-[calc(100%+1.5rem)] xl:-ml-10 xl:w-[calc(100%+2.5rem)] 2xl:-ml-12 2xl:w-[calc(100%+3rem)]"
    >
      <Card className="border border-[#DCEBD5] bg-white/95 px-4 py-5 md:px-5 xl:px-6">
        <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-[#1F2937]">Minhas recompensas</h2>
            <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">
              Estas badges ficam ocultas até a conquista ser alcançada. Quando o marco é desbloqueado,
              a peça ganha cor, forma e destaque visual na coleção da jornada.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <Badge variant={unlockedRewardsCount > 0 ? "green" : "gray"}>
              {unlockedRewardsCount} de {rewards.length} recompensas reveladas
            </Badge>
            <div className="rounded-2xl border border-[#DCEBD5] bg-[#F8FBF6] px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                Pontuação extra
              </p>
              <p className="text-lg font-black text-[#1F2937] leading-tight">
                {formatPoints(unlockedRewardPoints)} / {formatPoints(totalAvailableRewardPoints)}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                limite máximo de {formatPoints(MAX_REWARD_POINTS)} pontos na nota final
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FBF6] px-4 py-3 text-sm text-[#374151] leading-relaxed">
          <p>
            As recompensas usam dados que já existem no projeto, como escrita acumulada, fotos do processo,
            repertório registrado e avanço das etapas.
          </p>
          <p className="mt-2 text-xs text-[#6B7280]">
            As metas permanecem visíveis mesmo quando a figurinha ainda está oculta, para orientar o que precisa ser alcançado.
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            As badges de presença ativa usam o tempo registrado neste navegador até a etapa futura de telemetria.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {rewards.map((reward, index) => {
            const tone = getRewardToneClasses(reward.tier, reward.achieved);
            const staggerClassName =
              index % 3 === 0
                ? "md:-translate-y-2"
                : index % 3 === 1
                  ? "md:translate-y-2"
                  : "md:-translate-y-1";
            const rotationClassName =
              index % 2 === 0 ? "rotate-[-1.5deg] hover:rotate-0" : "rotate-[1.5deg] hover:rotate-0";

            return (
              <div
                key={reward.id}
                className={`group relative mt-7 min-h-[154px] overflow-visible rounded-[1.4rem] border px-3 pb-3 pt-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${staggerClassName} ${rotationClassName} ${tone.containerClassName}`}
              >
                <div className="pointer-events-none absolute right-2 top-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/10">
                  sticker
                </div>

                <div className={`absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center text-xl ${tone.stickerContainerClassName}`}>
                  <span className={tone.iconInnerClassName}>{reward.achieved ? reward.icon : "✦"}</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <Badge variant={tone.statusVariant} className="text-[10px] px-2 py-1">
                    {reward.achieved ? "Revelada" : "Oculta"}
                  </Badge>

                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone.pointsClassName}`}>
                    +{formatPoints(reward.points)} pt
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-center">
                  <h3 className={`text-[13px] font-extrabold leading-tight ${reward.achieved ? "text-[#1F2937]" : "text-[#4B5563]"}`}>
                    {reward.title}
                  </h3>

                  <p className={`text-[12px] leading-relaxed ${reward.achieved ? "text-[#374151]" : "text-[#6B7280]"}`}>
                    {reward.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                    {reward.tier}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </Card>
    </div>
  );
}