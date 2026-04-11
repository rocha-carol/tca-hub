"use client";

import Link from "next/link";
import { useState } from "react";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";
import { Card } from "@/components/ui/Card";
import { StudentWelcome } from "@/components/student/StudentWelcome";
import { TcaIntroduction } from "@/components/student/TcaIntroduction";
import { Badge } from "@/components/ui/Badge";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentHomeContentProps {
  firstName: string;
  hasGroup: boolean;
  group: Group | null;
  groupId?: string;
  nextJourneyHref?: string;
  projectSections: GroupProjectSection[];
  studentName: string;
  studentsError?: string | null;
  groupsError?: string | null;
}

export function StudentHomeContent({
  firstName,
  hasGroup,
  group,
  groupId,
  nextJourneyHref,
  projectSections,
  studentName,
  studentsError = null,
  groupsError = null,
}: StudentHomeContentProps) {
  const [showDetails, setShowDetails] = useState(hasGroup);
  const journeyHref = STUDENT_ROUTES.JOURNEY;

  return (
    <div className="min-w-0 space-y-4">
      <section id="inicio-estudante" className="scroll-mt-24">
        <StudentWelcome
          firstName={firstName}
          hasGroup={hasGroup}
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
            <Card className="border border-[#DCEBD5] bg-[#F8FBF6]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <Badge variant={hasGroup ? "green" : "yellow"}>
                    {hasGroup ? "Acompanhamento contínuo" : "Primeiros passos"}
                  </Badge>
                  <div>
                    <h2 className="text-xl font-bold text-[#1F2937]">Jornada do projeto em página própria</h2>
                    <p className="text-sm text-[#374151] mt-1 leading-relaxed">
                      A jornada agora fica em uma página dedicada para facilitar o acompanhamento do progresso, da missão atual
                      e das conquistas do grupo sem sobrecarregar a página inicial.
                    </p>
                  </div>
                  <p className="text-sm text-[#6B7280] leading-relaxed">
                    A página inicial continua sendo o ponto de acolhimento e contexto. A jornada fica como segunda página,
                    mais focada em execução e acompanhamento pedagógico.
                  </p>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  <Link
                    href={journeyHref}
                    className="inline-flex rounded-lg bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2"
                  >
                    Abrir jornada do projeto
                  </Link>
                  <p className="text-xs text-[#6B7280] max-w-xs md:text-right">
                    Lá ficam a missão atual, o avanço por etapas e os reconhecimentos desbloqueados.
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