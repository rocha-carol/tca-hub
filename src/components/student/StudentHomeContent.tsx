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
              <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
                  <Link
                    href={journeyHref}
                    className="inline-flex min-w-[240px] justify-center rounded-xl bg-lime-700 hover:bg-lime-800 text-white font-medium px-6 py-3 shadow-sm transition-colors"
                  >
                    Abrir jornada do projeto
                  </Link>
                  <p className="text-sm text-[#6B7280] max-w-md leading-relaxed">
                    Lá ficam a missão atual, o avanço por etapas e os reconhecimentos desbloqueados.
                  </p>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}