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

type RewardTier = "silver" | "gold" | "emerald" | "violet" | "ultra";

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
  platformCompleted: boolean;
}

interface RewardDefinition {
  id: string;
  title: string;
  description: string;
  flavor: string;
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
  const lockedFilterClassName = unlocked ? "" : "grayscale saturate-0 brightness-[1.02] contrast-[0.92]";
  const lockedOverlayClassName = unlocked ? "" : "bg-white/48";

  if (tier === "silver") {
    return {
      rarityLabel: "Silver",
      outerClassName: `rounded-[2rem] bg-[linear-gradient(180deg,#F8FCFF_0%,#DDEAF3_55%,#C3D4E2_100%)] shadow-[0_22px_32px_-28px_rgba(71,85,105,0.95)] ${lockedFilterClassName}`,
      innerClassName: "rounded-[1.8rem] border border-[#D6E0EA] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(241,245,249,0.98)_100%)]",
      rarityBadgeClassName: "rounded-full border border-white/80 bg-[#64748B] text-[#F8FAFC]",
      namePlateClassName: "text-[#1E293B]",
      artPanelClassName: "rounded-[1.55rem] border border-[#C7D6E4] bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#DDEAF3_58%,#C8D8E7_100%)]",
      artGlowClassName: "bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_68%)]",
      descriptionPanelClassName: "rounded-[1.35rem] border border-[#D8E1EA] bg-white/85",
      powerChipClassName: "rounded-full border border-[#D4DFE8] bg-[#EEF4F8] text-[#334155]",
      footerClassName: "text-[#475569]",
      shapeClassName: "",
      overlayClassName: lockedOverlayClassName,
    };
  }

  if (tier === "gold") {
    return {
      rarityLabel: "Gold",
      outerClassName: `rounded-[2rem] bg-[linear-gradient(180deg,#FFF9D6_0%,#F5D56D_55%,#E4B93F_100%)] shadow-[0_24px_34px_-28px_rgba(161,98,7,1)] ${lockedFilterClassName}`,
      innerClassName: "rounded-[1.8rem] border border-[#E7CE75] bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,244,201,0.98)_100%)]",
      rarityBadgeClassName: "[clip-path:polygon(10%_0%,90%_0%,100%_45%,90%_100%,10%_100%,0%_45%)] bg-[#A16207] px-3 py-1 text-[#FFFBEB]",
      namePlateClassName: "text-[#713F12]",
      artPanelClassName: "[clip-path:polygon(8%_0%,92%_0%,100%_14%,100%_86%,92%_100%,8%_100%,0%_86%,0%_14%)] border border-[#E8CF84] bg-[radial-gradient(circle_at_top,#FFFBEA_0%,#FDE68A_52%,#F3C95B_100%)]",
      artGlowClassName: "bg-[radial-gradient(circle,rgba(255,251,235,0.92)_0%,rgba(255,251,235,0)_70%)]",
      descriptionPanelClassName: "rounded-[1.35rem] border border-[#ECDB9A] bg-white/78",
      powerChipClassName: "rounded-full border border-[#EACD79] bg-[#FFF1B3] text-[#854D0E]",
      footerClassName: "text-[#854D0E]",
      shapeClassName: "",
      overlayClassName: lockedOverlayClassName,
    };
  }

  if (tier === "emerald") {
    return {
      rarityLabel: "Emerald",
      outerClassName: `rounded-[2.2rem] bg-[linear-gradient(180deg,#ECFDF5_0%,#86EFAC_52%,#3FA466_100%)] shadow-[0_24px_34px_-28px_rgba(22,101,52,1)] ${lockedFilterClassName}`,
      innerClassName: "rounded-[2rem_2rem_2.5rem_2.5rem] border border-[#99D8AF] bg-[linear-gradient(180deg,rgba(240,253,244,0.95)_0%,rgba(220,252,231,0.98)_100%)]",
      rarityBadgeClassName: "rounded-[999px_999px_999px_200px] bg-[#166534] text-[#F0FDF4]",
      namePlateClassName: "text-[#14532D]",
      artPanelClassName: "rounded-[1.8rem_1.8rem_2.4rem_2.4rem] border border-[#9DDFB5] bg-[radial-gradient(circle_at_top,#F0FDF4_0%,#BBF7D0_50%,#59C37D_100%)]",
      artGlowClassName: "bg-[radial-gradient(circle,rgba(240,253,244,0.95)_0%,rgba(240,253,244,0)_70%)]",
      descriptionPanelClassName: "rounded-[1.45rem] border border-[#B7E7C7] bg-white/80",
      powerChipClassName: "rounded-full border border-[#97D9AE] bg-[#DCFCE7] text-[#166534]",
      footerClassName: "text-[#166534]",
      shapeClassName: "",
      overlayClassName: lockedOverlayClassName,
    };
  }

  if (tier === "violet") {
    return {
      rarityLabel: "Violet",
      outerClassName: `rounded-[2rem] bg-[linear-gradient(180deg,#FAF5FF_0%,#D8B4FE_52%,#8B5CF6_100%)] shadow-[0_24px_34px_-28px_rgba(109,40,217,1)] ${lockedFilterClassName}`,
      innerClassName: "[clip-path:polygon(6%_0%,94%_0%,100%_11%,100%_89%,94%_100%,6%_100%,0%_89%,0%_11%)] border border-[#D8C1FA] bg-[linear-gradient(180deg,rgba(250,245,255,0.96)_0%,rgba(237,233,254,0.98)_100%)] rounded-[1.8rem]",
      rarityBadgeClassName: "rounded-full border border-white/80 bg-[#6D28D9] text-[#FAF5FF]",
      namePlateClassName: "text-[#5B21B6]",
      artPanelClassName: "[clip-path:polygon(7%_0%,93%_0%,100%_18%,100%_82%,93%_100%,7%_100%,0%_82%,0%_18%)] border border-[#D6BDF8] bg-[radial-gradient(circle_at_top,#F5F3FF_0%,#DDD6FE_48%,#B794F4_100%)]",
      artGlowClassName: "bg-[radial-gradient(circle,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0)_68%)]",
      descriptionPanelClassName: "rounded-[1.45rem] border border-[#DFCFFB] bg-white/80",
      powerChipClassName: "rounded-full border border-[#D2B8FB] bg-[#F3E8FF] text-[#6D28D9]",
      footerClassName: "text-[#6D28D9]",
      shapeClassName: "",
      overlayClassName: lockedOverlayClassName,
    };
  }

  return {
    rarityLabel: "Ultra rara",
    outerClassName: `rounded-[2.1rem] bg-[linear-gradient(135deg,#FFF7ED_0%,#FDE68A_18%,#A7F3D0_40%,#C4B5FD_68%,#F9A8D4_100%)] shadow-[0_28px_42px_-30px_rgba(126,34,206,0.95)] ${lockedFilterClassName}`,
    innerClassName: "rounded-[1.95rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,245,255,0.94)_100%)]",
    rarityBadgeClassName: "[clip-path:polygon(8%_0%,92%_0%,100%_50%,92%_100%,8%_100%,0%_50%)] bg-[linear-gradient(135deg,#A855F7_0%,#EC4899_50%,#F59E0B_100%)] px-3 py-1 text-white",
    namePlateClassName: "text-[#4C1D95]",
    artPanelClassName: "rounded-[1.75rem] border border-white/90 bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#FDE68A_24%,#A7F3D0_48%,#C4B5FD_72%,#F9A8D4_100%)]",
    artGlowClassName: "bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_64%)]",
    descriptionPanelClassName: "rounded-[1.45rem] border border-white/75 bg-white/82",
    powerChipClassName: "rounded-full border border-white/80 bg-[linear-gradient(135deg,#FAE8FF_0%,#FEF3C7_100%)] text-[#7E22CE]",
    footerClassName: "text-[#7E22CE]",
    shapeClassName: "",
    overlayClassName: lockedOverlayClassName,
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
      flavor: "Toda coleção começa com a primeira carta descoberta.",
      icon: "🌱",
      tier: "silver",
      points: 0.03,
      unlocked: () => true,
    },
    {
      id: "group-formed",
      title: "Grupo formado",
      description: "O grupo já existe e liberou a trilha principal do projeto.",
      flavor: "Sem equipe não existe guilda, sem guilda não existe jornada.",
      icon: "🤝",
      tier: "silver",
      points: 0.05,
      unlocked: (metrics) => metrics.hasGroup,
    },
    {
      id: "team-expanded",
      title: "Equipe ampliada",
      description: "Três ou mais integrantes já estão envolvidos na construção coletiva.",
      flavor: "A carta ganha força quando a inteligência deixa de ser solitária.",
      icon: "👥",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.memberCount >= 3,
    },
    {
      id: "theme-started",
      title: "Tema em construção",
      description: "A seção de tema já ganhou os primeiros registros do grupo.",
      flavor: "Toda grande investigação nasce de uma centelha bem guardada.",
      icon: "💡",
      tier: "silver",
      points: 0.05,
      unlocked: (metrics) => metrics.themeStarted,
    },
    {
      id: "theme-deepened",
      title: "Tema aprofundado",
      description: "O grupo já escreveu um recorte mais consistente para o tema investigado.",
      flavor: "Quando a ideia cria raízes, a carta muda de raridade.",
      icon: "🧠",
      tier: "gold",
      points: 0.08,
      unlocked: (metrics) => metrics.themeWords >= 120,
    },
    {
      id: "advisor-requested",
      title: "Orientação acionada",
      description: "A indicação de orientação já foi iniciada pelo grupo.",
      flavor: "Pedir orientação é ativar uma habilidade estratégica do time.",
      icon: "📨",
      tier: "silver",
      points: 0.05,
      unlocked: (metrics) => metrics.advisorRequested,
    },
    {
      id: "advisor-confirmed",
      title: "Orientação confirmada",
      description: "Um orientador principal já está vinculado ao grupo.",
      flavor: "A presença da orientação eleva a carta ao patamar de suporte lendário.",
      icon: "🎓",
      tier: "emerald",
      points: 0.12,
      unlocked: (metrics) => metrics.advisorConfirmed,
    },
    {
      id: "problem-started",
      title: "Problema investigado",
      description: "A pergunta central do projeto já começou a ser construída.",
      flavor: "Toda carta forte conhece exatamente o desafio que enfrenta.",
      icon: "🔎",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.problemStarted,
    },
    {
      id: "objectives-started",
      title: "Objetivos definidos",
      description: "Os objetivos da investigação já começaram a tomar forma.",
      flavor: "Objetivos claros funcionam como atributos de precisão da missão.",
      icon: "🎯",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.objectivesStarted,
    },
    {
      id: "methodology-started",
      title: "Metodologia estruturada",
      description: "O grupo já registrou como pretende investigar e agir.",
      flavor: "Estratégia registrada é o equivalente pedagógico de um deck bem montado.",
      icon: "🗺️",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.methodologyStarted,
    },
    {
      id: "planning-complete",
      title: "Planejamento completo",
      description: "Problema, objetivos e metodologia já foram iniciados como base do percurso.",
      flavor: "Essa carta só aparece quando a base do projeto para de oscilar.",
      icon: "🧩",
      tier: "emerald",
      points: 0.12,
      unlocked: (metrics) => metrics.planningCompleted,
    },
    {
      id: "development-started",
      title: "Mão na massa",
      description: "A etapa de desenvolvimento já começou a ser registrada pelo grupo.",
      flavor: "A raridade sobe quando o projeto deixa de ser plano e vira ação.",
      icon: "⚙️",
      tier: "violet",
      points: 0.12,
      unlocked: (metrics) => metrics.developmentStarted,
    },
    {
      id: "result-started",
      title: "Síntese em andamento",
      description: "Os resultados ou o produto final já começaram a ser consolidados.",
      flavor: "Toda coleção respeita a carta que já mostra sinais concretos de conclusão.",
      icon: "🏁",
      tier: "violet",
      points: 0.12,
      unlocked: (metrics) => metrics.resultStarted,
    },
    {
      id: "journey-complete",
      title: "Jornada central concluída",
      description: "As etapas principais da jornada do TCA já foram preenchidas.",
      flavor: "Concluir o núcleo da jornada já coloca a carta no álbum das memoráveis.",
      icon: "👑",
      tier: "violet",
      points: 0.18,
      unlocked: (metrics) => metrics.journeyCompleted,
    },
    {
      id: "wordsmith-300",
      title: "Escrita consistente",
      description: "O grupo já acumulou pelo menos 300 palavras no projeto.",
      flavor: "Texto constante é poder silencioso que cresce linha por linha.",
      icon: "✍️",
      tier: "silver",
      points: 0.07,
      unlocked: (metrics) => metrics.totalWords >= 300,
    },
    {
      id: "wordsmith-1200",
      title: "Autoria robusta",
      description: "O projeto já soma 1200 palavras ou mais em seus registros.",
      flavor: "Uma carta de autoria forte sempre deixa rastros extensos no tabuleiro.",
      icon: "📚",
      tier: "emerald",
      points: 0.13,
      unlocked: (metrics) => metrics.totalWords >= 1200,
    },
    {
      id: "photo-collector",
      title: "Memória visual",
      description: "O grupo já registrou pelo menos 3 fotos do processo.",
      flavor: "Registrar o processo transforma experiência em evidência jogável.",
      icon: "📸",
      tier: "gold",
      points: 0.12,
      unlocked: (metrics) => metrics.processPhotosCount >= 3,
    },
    {
      id: "source-curator",
      title: "Curadoria inicial",
      description: "O repertório do projeto já reúne pelo menos 3 fontes registradas.",
      flavor: "Toda carta estratégica se fortalece quando o repertório vira base sólida.",
      icon: "🧾",
      tier: "gold",
      points: 0.12,
      unlocked: (metrics) => metrics.repertoryItemsCount >= 3,
    },
    {
      id: "time-15",
      title: "Presença ativa",
      description: "Foram registrados pelo menos 15 minutos ativos nesta jornada neste navegador.",
      flavor: "Tempo de foco também conta como atributo da coleção.",
      icon: "⏱️",
      tier: "silver",
      points: 0.11,
      unlocked: (metrics) => metrics.activeMinutes >= 15,
    },
    {
      id: "time-45",
      title: "Fôlego de maratona",
      description: "Foram registrados pelo menos 45 minutos ativos nesta jornada neste navegador.",
      flavor: "Persistência longa é o tipo de poder que muda a mesa inteira.",
      icon: "🔥",
      tier: "emerald",
      points: 0.25,
      unlocked: (metrics) => metrics.activeMinutes >= 45,
    },
    {
      id: "platform-master",
      title: "Lenda da plataforma",
      description: "Concluir todas as etapas centrais da plataforma, com orientação confirmada, registros do processo e repertório ativo.",
      flavor: "Ultrarrara: reservada para quem fecha o ciclo completo do TCA Hub.",
      icon: "🏆",
      tier: "ultra",
      points: 0.35,
      unlocked: (metrics) => metrics.platformCompleted,
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

    const planningCompleted = [problemSection, objectivesSection, methodologySection].every(sectionHasProgress);
    const developmentStarted = sectionHasProgress(developmentSection);
    const resultStarted = sectionHasProgress(resultSection);
    const advisorConfirmed = Boolean(group?.primary_advisor_id);
    const journeyCompleted = Boolean(
      sectionHasProgress(themeSection) &&
      advisorConfirmed &&
      planningCompleted &&
      developmentStarted &&
      resultStarted
    );

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
      advisorConfirmed,
      problemStarted: sectionHasProgress(problemSection),
      objectivesStarted: sectionHasProgress(objectivesSection),
      methodologyStarted: sectionHasProgress(methodologySection),
      planningCompleted,
      developmentStarted,
      resultStarted,
      journeyCompleted,
      platformCompleted: Boolean(
        group &&
        sectionHasProgress(themeSection) &&
        advisorConfirmed &&
        planningCompleted &&
        developmentStarted &&
        resultStarted &&
        processPhotosCount >= 3 &&
        repertoryItemsCount >= 3
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
        <div className="flex flex-col gap-3">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-[#1F2937]">Minhas recompensas</h2>
            <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">
              A coleção agora segue linguagem de carta rara: cada recompensa recebe cor, moldura e forma próprias
              conforme a raridade, com nome, arte, descrição da conquista e valor de poder.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
              <div className="inline-flex min-h-[58px] items-center rounded-2xl border border-[#D7E7D0] bg-[#F4FAF1] px-3 py-2">
                <Badge variant={unlockedRewardsCount > 0 ? "green" : "gray"}>
                  {unlockedRewardsCount} de {rewards.length} recompensas conquistadas
                </Badge>
              </div>

              <div className="inline-flex min-h-[58px] flex-col justify-center rounded-2xl border border-[#DCEBD5] bg-[#F8FBF6] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                  Pontuação extra
                </p>
                <p className="text-sm font-black text-[#1F2937] leading-tight">
                  {formatPoints(unlockedRewardPoints)} / {formatPoints(totalAvailableRewardPoints)}
                </p>
                <p className="text-[10px] text-[#6B7280] leading-tight">
                  limite máximo de {formatPoints(MAX_REWARD_POINTS)} pontos na nota final
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FBF6] px-4 py-3 text-sm text-[#374151] leading-relaxed">
          <p>
            As cartas usam dados que já existem no projeto, como escrita acumulada, fotos do processo,
            repertório registrado e avanço das etapas, sem inventar métricas artificiais no fluxo principal.
          </p>
          <p className="mt-2 text-xs text-[#6B7280]">
            A ultrarrara é liberada ao concluir o ciclo completo da plataforma: tema, planejamento, desenvolvimento,
            resultados, orientação confirmada, repertório e memória visual do processo.
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            As cartas de presença ativa usam o tempo registrado neste navegador até a etapa futura de telemetria.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rewards.map((reward) => {
            const tone = getRewardToneClasses(reward.tier, reward.achieved);

            return (
              <div
                key={reward.id}
                className={`group relative overflow-hidden p-[2px] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${tone.outerClassName} ${tone.shapeClassName}`}
              >
                <div className={`relative flex h-full min-h-[282px] flex-col overflow-hidden p-2.5 ${tone.innerClassName}`}>
                  <div className={`pointer-events-none absolute inset-0 ${tone.overlayClassName}`} />

                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] shadow-sm ${tone.rarityBadgeClassName}`}>
                      {tone.rarityLabel}
                    </span>

                    {reward.achieved ? (
                      <div className={`inline-flex flex-col items-end rounded-2xl px-2.5 py-1 text-right ${tone.powerChipClassName}`}>
                        <span className="text-[9px] font-black uppercase tracking-[0.16em]">Poder</span>
                        <span className="text-[13px] font-black leading-none">+{formatPoints(reward.points)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="relative z-10 mt-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                          Carta da jornada
                        </p>
                        <h3 className={`mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-black leading-tight ${tone.namePlateClassName}`}>
                          {reward.title}
                        </h3>
                      </div>

                      <Badge variant={reward.achieved ? "green" : "gray"} className="text-[10px] px-2 py-1">
                        {reward.achieved ? "Conquistada" : "Oculta"}
                      </Badge>
                    </div>
                  </div>

                  <div className={`relative z-10 mt-2.5 flex h-[104px] items-center justify-center overflow-hidden p-3 ${tone.artPanelClassName}`}>
                    <div className={`pointer-events-none absolute inset-0 ${tone.artGlowClassName}`} />
                    <div className="pointer-events-none absolute inset-x-3 top-2.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-white/80">
                      <span>{tone.rarityLabel}</span>
                      <span>#{reward.id}</span>
                    </div>
                    <span className="relative text-5xl drop-shadow-[0_8px_10px_rgba(0,0,0,0.18)]">
                      {reward.achieved ? reward.icon : "🔒"}
                    </span>
                  </div>

                  <div className={`relative z-10 mt-2.5 flex flex-1 flex-col justify-between p-2.5 ${tone.descriptionPanelClassName}`}>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                        Conquista
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#374151]">
                        {reward.description}
                      </p>
                    </div>

                    <div className="mt-2.5 border-t border-black/10 pt-2.5">
                      <p className={`text-[10px] italic leading-relaxed ${tone.footerClassName}`}>
                        {reward.flavor}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-2.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                    <span>{reward.achieved ? "No álbum" : "Meta visível"}</span>
                    <span>{tone.rarityLabel}</span>
                  </div>
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