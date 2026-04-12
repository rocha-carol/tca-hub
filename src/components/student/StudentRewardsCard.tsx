"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  buildRewardStates,
  buildRewardMetrics,
  formatRewardPoints,
  type RewardTier,
} from "@/lib/student-rewards";
import {
  STUDENT_JOURNEY_EVENTS,
  STUDENT_JOURNEY_STORAGE_KEYS,
} from "@/lib/utils/constants";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";

interface StudentRewardsCardProps {
  group: Group | null;
  projectSections: GroupProjectSection[];
  processPhotosCount: number;
  repertoryItemsCount: number;
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

function writeStoredActiveMinutes(storageKey: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, String(Math.max(0, Math.floor(value))));
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

export function StudentRewardsCard({
  group,
  projectSections,
  processPhotosCount,
  repertoryItemsCount,
}: StudentRewardsCardProps) {
  const storageKey = useMemo(
    () => `${STUDENT_JOURNEY_STORAGE_KEYS.ACTIVE_MINUTES}:${group?.id ?? "sem-grupo"}`,
    [group?.id]
  );
  const waitingStudyCompletedStorageKey = useMemo(
    () => `${STUDENT_JOURNEY_STORAGE_KEYS.WAITING_STUDY_COMPLETED}:${group?.id ?? "sem-grupo"}`,
    [group?.id]
  );

  const [activeMinutes, setActiveMinutes] = useState(() => readStoredActiveMinutes(storageKey));
  const [waitingStudyCompleted, setWaitingStudyCompleted] = useState(() =>
    readStoredBoolean(waitingStudyCompletedStorageKey)
  );
  const totalStoredMinutesRef = useRef(activeMinutes);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const syncCompletedState = () => {
      setWaitingStudyCompleted(readStoredBoolean(waitingStudyCompletedStorageKey));
    };

    function handleCompletedEvent(event: Event) {
      const customEvent = event as CustomEvent<{ storageKey?: string }>;

      if (customEvent.detail?.storageKey && customEvent.detail.storageKey !== waitingStudyCompletedStorageKey) {
        return;
      }

      syncCompletedState();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== waitingStudyCompletedStorageKey) {
        return;
      }

      syncCompletedState();
    }

    window.addEventListener(STUDENT_JOURNEY_EVENTS.WAITING_STUDY_COMPLETED, handleCompletedEvent as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(STUDENT_JOURNEY_EVENTS.WAITING_STUDY_COMPLETED, handleCompletedEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [waitingStudyCompletedStorageKey]);

  useEffect(() => {
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

  const metrics = useMemo(
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

  const rewards = useMemo(
    () => buildRewardStates(metrics),
    [metrics]
  );

  return (
    <div id="minhas-recompensas" className="scroll-mt-24">
      <Card className="border border-[#DCEBD5] bg-white/95 px-4 py-5 md:px-5 xl:px-6">
        <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-[#1F2937]">Minhas recompensas</h2>
            <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">
              A coleção agora segue linguagem de carta rara: cada recompensa recebe cor, moldura e forma próprias
              conforme a raridade, com nome, arte, descrição da conquista e valor de poder.
            </p>
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
                        <span className="text-[13px] font-black leading-none">+{formatRewardPoints(reward.points)}</span>
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