"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

const steps = [
  {
    title: "Formar o grupo",
    recognitionMessage:
      "Grupo formado! Esse é um começo valioso, porque mostra iniciativa, parceria e disposição para construir o projeto em equipe.",
  },
  {
    title: "Escolher um tema",
    recognitionMessage:
      "Tema definido! O grupo conseguiu transformar interesse em direção de pesquisa. Isso já é um avanço importante.",
  },
  {
    title: "Indicar orientadores",
    recognitionMessage:
      "Orientação encaminhada! O grupo mostrou organização e maturidade ao buscar apoio para seguir com mais segurança.",
  },
  {
    title: "Planejar a investigação",
    recognitionMessage:
      "Planejamento estruturado! Isso mostra mais clareza, intenção e foco no caminho da investigação.",
  },
  {
    title: "Desenvolver o projeto",
    recognitionMessage:
      "Desenvolvimento registrado! Esse passo valoriza o processo, os aprendizados e a autoria construída ao longo do percurso.",
  },
  {
    title: "Apresentar o trabalho",
    recognitionMessage:
      "Apresentação consolidada! O grupo chegou a uma etapa de síntese que revela crescimento, organização e consistência.",
  },
];

interface TcaStepsGuideProps {
  hasGroup: boolean;
  group: Group | null;
  groupId?: string;
  nextJourneyHref?: string;
  projectSections: GroupProjectSection[];
  studentName: string;
  studentsError?: string | null;
  groupsError?: string | null;
}

interface StoredJourneyProgress {
  groupId: string | null;
  completedSteps: number;
}

interface ActiveRecognition {
  title: string;
  message: string;
}

const JOURNEY_PROGRESS_STORAGE_KEY = "tca-hub:student-journey-progress";

function readStoredJourneyProgress(): StoredJourneyProgress | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(JOURNEY_PROGRESS_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredJourneyProgress;

    if (typeof parsed?.completedSteps !== "number") {
      return null;
    }

    return {
      groupId: typeof parsed.groupId === "string" ? parsed.groupId : null,
      completedSteps: parsed.completedSteps,
    };
  } catch {
    return null;
  }
}

function writeStoredJourneyProgress(progress: StoredJourneyProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(JOURNEY_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function sectionHasProgress(section?: GroupProjectSection | null) {
  if (!section) {
    return false;
  }

  return section.status !== "nao_iniciado" || Boolean(section.content?.trim());
}

function findSection(projectSections: GroupProjectSection[], sectionKey: string) {
  return projectSections.find((section) => section.section_key === sectionKey) ?? null;
}

function getJourneySnapshot(
  hasGroup: boolean,
  group: Group | null,
  groupId: string | undefined,
  nextJourneyHref: string | undefined,
  projectSections: GroupProjectSection[]
) {
  if (!hasGroup) {
    return {
      completedSteps: 0,
      currentStepIndex: 0,
      currentMissionTitle: "Primeira missão",
      currentMission: "Monte um grupo com colegas para liberar as próximas etapas do TCA Hub.",
      missionActionHref: STUDENT_ROUTES.GROUP_CREATE,
      missionActionLabel: "Começar meu grupo",
      missionStageLabel: "Comece por aqui",
      achievements: [
        {
          title: "Primeiro acesso",
          description: "A jornada no TCA Hub já começou.",
          statusLabel: "Conquista liberada",
          variant: "green" as const,
          containerClassName: "border-[#cfe8c8] bg-[#f3fbf1]",
        },
        {
          title: "Em equipe",
          description: "Forme um grupo para desbloquear esta conquista.",
          statusLabel: "Ainda bloqueada",
          variant: "gray" as const,
          containerClassName: "border-[#E5E7EB] bg-[#F9FAFB]",
        },
        {
          title: "Próximo marco",
          description: "Assim que o grupo estiver pronto, o tema será a próxima missão.",
          statusLabel: "Em preparação",
          variant: "yellow" as const,
          containerClassName: "border-[#F2C94C] bg-[#FFF9E8]",
        },
      ],
    };
  }

  const themeSection = findSection(projectSections, "tema_contexto");
  const problemSection = findSection(projectSections, "problema_justificativa");
  const objectivesSection = findSection(projectSections, "objetivos");
  const methodologySection = findSection(projectSections, "metodologia_plano");
  const developmentSection = findSection(projectSections, "desenvolvimento_registros");
  const resultSection = findSection(projectSections, "resultado_produto_final");

  const themeDone = sectionHasProgress(themeSection);
  const advisorAssigned = Boolean(group?.primary_advisor_id);
  const indicationPending = group?.indication_status === "pendente";
  const indicationRefused = group?.indication_status === "recusada";
  const planningDone = [problemSection, objectivesSection, methodologySection].every(sectionHasProgress);
  const developmentDone = sectionHasProgress(developmentSection);
  const finalPresentationDone = sectionHasProgress(resultSection);

  const completedSteps = [true, themeDone, advisorAssigned, planningDone, developmentDone, finalPresentationDone].filter(Boolean).length;
  const currentStepIndex = Math.min(completedSteps, steps.length - 1);

  const firstPlanningPendingSection = [problemSection, objectivesSection, methodologySection].find(
    (section) => !sectionHasProgress(section)
  );

  let currentMissionTitle = "Etapa 2 liberada";
  let currentMission = "Seu grupo já foi formado. O próximo passo é escolher um tema para iniciar a investigação.";
  let missionActionHref = nextJourneyHref || (groupId ? `${STUDENT_ROUTES.GROUP}/${groupId}` : STUDENT_ROUTES.HOME);
  let missionActionLabel = "Escolha do tema";
  let missionStageLabel = "Próxima etapa: tema";

  if (themeDone && !advisorAssigned) {
    currentMissionTitle = indicationPending
      ? "Indicação em andamento"
      : indicationRefused
        ? "Nova indicação necessária"
        : "Etapa 3 liberada";
    currentMission = indicationPending
      ? "O tema já foi definido e a indicação de orientador está em análise. Agora vale acompanhar a resposta e o status do grupo."
      : indicationRefused
        ? "O tema já foi definido, mas o orientador indicado ficou indisponível para essa orientação. O próximo passo é atualizar as preferências e tentar uma nova indicação."
        : "O tema já saiu do papel. Agora o próximo passo é indicar orientadores para que o projeto avance com acompanhamento pedagógico.";
    missionActionHref = groupId ? `/estudante/groups/${groupId}/advisor-indication` : STUDENT_ROUTES.HOME;
    missionActionLabel = indicationPending ? "Acompanhar indicação" : "Indicar orientadores";
    missionStageLabel = "Próxima etapa: indicação";
  } else if (advisorAssigned && !planningDone) {
    currentMissionTitle = "Etapa 4 liberada";
    currentMission = "O grupo já tem orientação definida. Agora é hora de planejar a investigação, deixando problema, objetivos e metodologia mais claros.";
    missionActionHref = firstPlanningPendingSection && groupId
      ? `/groups/${groupId}/project/sections/${firstPlanningPendingSection.id}`
      : (groupId ? `/groups/${groupId}/project` : STUDENT_ROUTES.HOME);
    missionActionLabel = "Planejar investigação";
    missionStageLabel = "Próxima etapa: planejamento";
  } else if (advisorAssigned && planningDone && !developmentDone) {
    currentMissionTitle = "Etapa 5 liberada";
    currentMission = "O planejamento já está estruturado. Agora a missão é registrar desenvolvimento, evidências e aprendizados do processo.";
    missionActionHref = developmentSection && groupId
      ? `/groups/${groupId}/project/sections/${developmentSection.id}`
      : (groupId ? `/groups/${groupId}/project` : STUDENT_ROUTES.HOME);
    missionActionLabel = "Registrar desenvolvimento";
    missionStageLabel = "Próxima etapa: desenvolvimento";
  } else if (advisorAssigned && developmentDone && !finalPresentationDone) {
    currentMissionTitle = "Etapa 6 liberada";
    currentMission = "O desenvolvimento já foi registrado. Agora vale consolidar resultados e preparar a apresentação final do trabalho.";
    missionActionHref = resultSection && groupId
      ? `/groups/${groupId}/project/sections/${resultSection.id}`
      : (groupId ? `/groups/${groupId}/project/preview` : STUDENT_ROUTES.HOME);
    missionActionLabel = "Concluir resultados";
    missionStageLabel = "Próxima etapa: apresentação";
  } else if (finalPresentationDone) {
    currentMissionTitle = "Jornada principal concluída";
    currentMission = "As etapas centrais do TCA já foram preenchidas. Agora a missão é revisar o conjunto, fortalecer a autoria e preparar a socialização final.";
    missionActionHref = groupId ? `/groups/${groupId}/project/preview` : STUDENT_ROUTES.HOME;
    missionActionLabel = "Revisar projeto";
    missionStageLabel = "Missão: revisão final";
  }

  return {
    completedSteps,
    currentStepIndex,
    currentMissionTitle,
    currentMission,
    missionActionHref,
    missionActionLabel,
    missionStageLabel,
    achievements: [
      {
        title: "Primeiro acesso",
        description: "A jornada no TCA Hub já começou.",
        statusLabel: "Conquista liberada",
        variant: "green" as const,
        containerClassName: "border-[#cfe8c8] bg-[#f3fbf1]",
      },
      {
        title: "Em equipe",
        description: "O grupo foi formado e a próxima etapa já está disponível.",
        statusLabel: "Conquista liberada",
        variant: "green" as const,
        containerClassName: "border-[#cfe8c8] bg-[#f3fbf1]",
      },
      {
        title: "Próximo marco",
        description: !themeDone
          ? "Definir o tema será o próximo avanço visível da equipe."
          : !advisorAssigned
            ? indicationPending
              ? "A resposta da indicação de orientador é o próximo marco da jornada."
              : "Indicar orientadores é o próximo passo para destravar a jornada."
          : !planningDone
            ? "Planejar a investigação é o próximo passo para destravar a jornada."
            : !developmentDone
              ? "Registrar o desenvolvimento será o próximo avanço visível da equipe."
              : !finalPresentationDone
                ? "Consolidar resultados e apresentação é o próximo marco da jornada."
                : "Agora o foco é revisar o projeto e fortalecer a apresentação final.",
        statusLabel: finalPresentationDone ? "Jornada avançada" : "Em preparação",
        variant: finalPresentationDone ? ("green" as const) : ("yellow" as const),
        containerClassName: finalPresentationDone ? "border-[#cfe8c8] bg-[#f3fbf1]" : "border-[#F2C94C] bg-[#FFF9E8]",
      },
    ],
  };
}

function getStepState(index: number, currentStepIndex: number, completedSteps: number) {
  if (index < completedSteps) {
    return {
      label: "Concluída",
      badgeVariant: "green" as const,
      itemClassName: "border-[#cfe8c8] bg-[#f3fbf1]",
      circleClassName: "bg-[#4CAF50] text-white",
    };
  }

  if (index === currentStepIndex) {
    return {
      label: "Missão atual",
      badgeVariant: "yellow" as const,
      itemClassName: "border-[#F2C94C] bg-[#FFF9E8]",
      circleClassName: "bg-[#F2C94C] text-[#5C4400]",
    };
  }

  return {
    label: "Bloqueada",
    badgeVariant: "gray" as const,
    itemClassName: "border-[#E5E7EB] bg-[#F9FAFB]",
    circleClassName: "bg-[#E5E7EB] text-[#6B7280]",
  };
}

export function TcaStepsGuide({
  hasGroup,
  group,
  groupId,
  nextJourneyHref,
  projectSections,
  studentName,
  studentsError = null,
  groupsError = null,
}: TcaStepsGuideProps) {
  const hasDataWarning = Boolean(studentsError || groupsError);
  const [activeRecognition, setActiveRecognition] = useState<ActiveRecognition | null>(null);
  const {
    completedSteps,
    currentStepIndex,
    currentMissionTitle,
    currentMission,
    missionActionHref,
    missionActionLabel,
    missionStageLabel,
    achievements,
  } = getJourneySnapshot(hasGroup, group, groupId, nextJourneyHref, projectSections);
  const unlockedAchievementsCount = achievements.filter((achievement) => achievement.variant === "green").length;

  useEffect(() => {
    const previousProgress = readStoredJourneyProgress();
    const currentProgress = {
      groupId: groupId ?? null,
      completedSteps,
    };

    if (!hasGroup || completedSteps <= 0) {
      setActiveRecognition(null);
      writeStoredJourneyProgress(currentProgress);
      return;
    }

    const cameFromNoGroup = previousProgress?.groupId === null;
    const sameGroup = previousProgress?.groupId === currentProgress.groupId;
    const hasNewCompletion = Boolean(
      previousProgress &&
      completedSteps > previousProgress.completedSteps &&
      (sameGroup || cameFromNoGroup)
    );

    if (hasNewCompletion) {
      const latestCompletedStep = steps[completedSteps - 1];

      setActiveRecognition({
        title: latestCompletedStep.title,
        message: latestCompletedStep.recognitionMessage,
      });
    } else {
      setActiveRecognition(null);
    }

    writeStoredJourneyProgress(currentProgress);
  }, [completedSteps, groupId, hasGroup]);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1F2937]">Jornada do projeto</h2>
            <p className="text-sm text-[#6B7280] mt-1">
              Acompanhe o avanço do TCA e descubra qual é a próxima missão disponível.
            </p>
          </div>

          <Badge variant={hasGroup ? "green" : "yellow"}>
            {completedSteps} de {steps.length} etapa{steps.length > 1 ? "s" : ""} concluída
            {completedSteps === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="rounded-xl border border-[#DCEBD5] bg-[#F8FBF6] px-4 py-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-[#1F2937]">Sua situação atual</p>
              <p className="text-xs text-[#6B7280] mt-1">Estudante: {studentName}</p>
            </div>

            {hasDataWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Não foi possível validar tudo agora. Você ainda pode seguir com as ações iniciais.
              </div>
            )}

            {!group ? (
              <div className="space-y-2 text-sm text-[#374151]">
                <p>Você ainda não participa de um grupo.</p>
                <p>Para começar o projeto, é necessário formar um grupo com seus colegas.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#374151]">Você já está cadastrado no:</p>
                  <p className="font-semibold text-[#1F2937]">
                    {group.theme || `Grupo ${String(group.id).slice(0, 8)}`}
                  </p>
                </div>

                <Link
                  href={`${STUDENT_ROUTES.GROUP}/${group.id}`}
                  className="inline-flex rounded-lg bg-white border border-lime-200 hover:border-lime-300 text-lime-800 font-medium px-4 py-2"
                >
                  Acessar meu grupo
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#DCEBD5] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2F6F35]">{currentMissionTitle}</p>
              <p className="text-sm text-[#374151] mt-1">{currentMission}</p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <Badge variant={hasGroup ? "blue" : "yellow"} className="w-fit">
                {missionStageLabel}
              </Badge>

              <Link
                href={missionActionHref}
                className="inline-flex rounded-lg bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2"
              >
                {missionActionLabel}
              </Link>
            </div>
          </div>
        </div>

        <ProgressBar
          value={completedSteps}
          max={steps.length}
          label="Progresso da jornada"
          colorClass="bg-[#4CAF50]"
        />

        {activeRecognition ? (
          <div className="rounded-xl border border-[#CFE8C8] bg-[#F3FBF1] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="green">Etapa concluída agora</Badge>
                  <p className="text-sm font-semibold text-[#1F2937]">{activeRecognition.title}</p>
                </div>
                <p className="text-sm text-[#374151] leading-relaxed">{activeRecognition.message}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveRecognition(null)}
                className="text-xs font-medium text-[#2F6F35] hover:underline"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : null}

        <div id="conquistas-da-jornada" className="scroll-mt-24 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-[#1F2937]">Conquistas da jornada</h3>
              <p className="text-sm text-[#6B7280]">
                As conquistas ficam na própria jornada para reforçar o que já foi desbloqueado sem fragmentar a navegação.
              </p>
            </div>

            <Badge variant={unlockedAchievementsCount > 0 ? "green" : "gray"} className="w-fit">
              {unlockedAchievementsCount} conquista{unlockedAchievementsCount === 1 ? "" : "s"} liberada{unlockedAchievementsCount === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.title}
                className={`rounded-xl border px-3 py-3 ${achievement.containerClassName}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#1F2937]">{achievement.title}</h4>
                  <Badge variant={achievement.variant}>{achievement.statusLabel}</Badge>
                </div>
                <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                  {achievement.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <ol className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-5">
        {steps.map((step, index) => (
          (() => {
            const state = getStepState(index, currentStepIndex, completedSteps);

            return (
              <li
                key={step.title}
                className={`rounded-xl border px-3 py-3 text-sm text-[#1F2937] ${state.itemClassName}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${state.circleClassName}`}
                  >
                    {index + 1}
                  </span>
                  <Badge variant={state.badgeVariant}>{state.label}</Badge>
                </div>

                <p className="leading-relaxed font-medium">{step.title}</p>
              </li>
            );
          })()
        ))}
      </ol>
    </Card>
  );
}
