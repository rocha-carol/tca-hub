"use client";

import Link from "next/link";
import { useState } from "react";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";
import { Card } from "@/components/ui/Card";
import { StudentWelcome } from "@/components/student/StudentWelcome";
import { TcaIntroduction } from "@/components/student/TcaIntroduction";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentHomeContentProps {
  firstName: string;
  hasGroup: boolean;
  group: Group | null;
  groupId?: string;
  projectSections: GroupProjectSection[];
}

export function StudentHomeContent({
  firstName,
  hasGroup,
  group,
  groupId,
  projectSections,
}: StudentHomeContentProps) {
  const [showDetails, setShowDetails] = useState(hasGroup);
  const journeyHref = STUDENT_ROUTES.JOURNEY;
  const projectHref = groupId ? `/groups/${groupId}/project` : STUDENT_ROUTES.GROUP_CREATE;

  const themeSection = projectSections.find((section) => section.section_key === "tema_contexto") ?? null;
  const problemSection = projectSections.find((section) => section.section_key === "problema_justificativa") ?? null;
  const objectivesSection = projectSections.find((section) => section.section_key === "objetivos") ?? null;
  const methodologySection = projectSections.find((section) => section.section_key === "metodologia_plano") ?? null;

  const sectionHasProgress = (section: GroupProjectSection | null) => {
    if (!section) {
      return false;
    }

    return section.status !== "nao_iniciado" || Boolean(section.content?.trim());
  };

  const themeDone = sectionHasProgress(themeSection) || Boolean(group?.theme?.trim());
  const planningDone = [problemSection, objectivesSection, methodologySection].every(sectionHasProgress);
  const hasAdvisor = Boolean(group?.primary_advisor_id);
  const indicationPending = group?.indication_status === "pendente";
  const indicationRefused = group?.indication_status === "recusada";

  const homeSnapshot = !hasGroup
    ? {
        statusLabel: "Grupo ainda não criado.",
        missionTitle: "Formar o grupo inicial",
        missionDescription:
          "O primeiro passo é reunir colegas e abrir o grupo. A partir disso, o TCA Hub libera tema, jornada e organização do projeto.",
        primaryActionLabel: "Criar meu grupo",
        primaryActionHref: STUDENT_ROUTES.GROUP_CREATE,
        secondaryActionLabel: "Ver como funciona",
      }
    : !themeDone
      ? {
          statusLabel: "Grupo formado, aguardando definição de tema.",
          missionTitle: "Escolher o tema do projeto",
          missionDescription:
            "Com o grupo já criado, a missão mais importante agora é definir tema e contexto para iniciar a investigação com clareza.",
          primaryActionLabel: "Abrir jornada do projeto",
          primaryActionHref: journeyHref,
          secondaryActionLabel: "Rever visão da jornada",
        }
      : !hasAdvisor
        ? {
            statusLabel: indicationPending
              ? "Tema definido e indicação de orientação em análise."
              : indicationRefused
                ? "Tema definido, mas a indicação anterior precisa ser refeita."
                : "Tema definido e orientação ainda pendente.",
            missionTitle: indicationPending ? "Acompanhar a indicação" : "Definir a orientação do grupo",
            missionDescription: indicationPending
              ? "Vale acompanhar a resposta da indicação para saber quando o grupo poderá avançar com apoio pedagógico confirmado."
              : indicationRefused
                ? "A indicação anterior não avançou. O próximo passo é revisar preferências e tentar uma nova indicação de orientador."
                : "Com o tema definido, o próximo avanço do projeto é indicar orientadores para garantir acompanhamento da investigação.",
            primaryActionLabel: indicationPending ? "Acompanhar jornada" : "Ir para a jornada",
            primaryActionHref: journeyHref,
            secondaryActionLabel: "Rever visão da jornada",
          }
        : !planningDone
          ? {
              statusLabel: "Grupo com orientação definida e planejamento em construção.",
              missionTitle: "Estruturar o planejamento",
              missionDescription:
                "Agora o foco é fortalecer problema, objetivos e metodologia para deixar a investigação mais consistente antes do desenvolvimento.",
              primaryActionLabel: "Continuar na jornada",
              primaryActionHref: journeyHref,
              secondaryActionLabel: "Rever visão da jornada",
            }
          : {
              statusLabel: "Projeto em andamento com base já estruturada.",
              missionTitle: "Avançar na produção do projeto",
              missionDescription:
                "A etapa seguinte é registrar desenvolvimento, consolidar evidências e preparar os resultados que irão sustentar a apresentação final.",
              primaryActionLabel: "Continuar na jornada",
              primaryActionHref: journeyHref,
              secondaryActionLabel: "Rever visão da jornada",
            };

  return (
    <div className="min-w-0 space-y-4">
      <section id="inicio-estudante" className="scroll-mt-24">
        <StudentWelcome
          firstName={firstName}
          hasGroup={hasGroup}
          statusLabel={homeSnapshot.statusLabel}
          missionTitle={homeSnapshot.missionTitle}
          missionDescription={homeSnapshot.missionDescription}
          primaryActionLabel={homeSnapshot.primaryActionLabel}
          primaryActionHref={homeSnapshot.primaryActionHref}
          secondaryActionLabel={homeSnapshot.secondaryActionLabel}
          showStartButton={!showDetails}
          onStart={() => setShowDetails(true)}
        />
      </section>

      {showDetails && (
        <>
          <section id="sobre-o-tca" className="scroll-mt-24">
            <TcaIntroduction />
          </section>

          <section id="jornada-do-projeto" className="scroll-mt-24">
            <Card className="border border-[#E3EDE0] bg-white/95 shadow-[0_8px_22px_rgba(31,41,55,0.04)]">
              <div className="flex flex-col gap-5 px-1 py-3 md:flex-row md:items-center md:justify-between md:text-left">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                    Ação principal
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#16301A]">
                    Continue por onde a jornada já organiza o próximo passo
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280] md:text-[15px]">
                    A jornada reúne missão atual, progresso por etapa e os acessos que mais importam para o andamento do projeto.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 text-center md:items-end md:text-right">
                  <Link
                    href={journeyHref}
                    className="inline-flex min-w-[240px] justify-center rounded-xl bg-lime-700 hover:bg-lime-800 text-white font-medium px-6 py-3 shadow-sm transition-colors"
                  >
                    Abrir jornada do projeto
                  </Link>
                  {hasGroup ? (
                    <Link
                      href={projectHref}
                      className="inline-flex min-w-[240px] justify-center rounded-xl border border-[#D9E7D5] bg-white px-6 py-3 text-sm font-medium text-[#35523A] transition-colors hover:bg-[#F5FAF2]"
                    >
                      Abrir área do projeto
                    </Link>
                  ) : null}
                  <p className="max-w-md text-sm leading-relaxed text-[#6B7280]">
                    Aqui a navegação fica mais objetiva: primeiro entender a missão, depois executar a próxima ação.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}