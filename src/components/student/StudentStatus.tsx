import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Group } from "@/types/group";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentStatusProps {
  group: Group | null;
  studentName: string;
  studentsError?: string | null;
  groupsError?: string | null;
}

export function StudentStatus({
  group,
  studentName,
  studentsError = null,
  groupsError = null,
}: StudentStatusProps) {
  const hasDataWarning = Boolean(studentsError || groupsError);

  return (
    <Card accent={group ? "green" : "yellow"}>
      <h2 className="text-xl font-bold text-[#1F2937] mb-3">Sua situação atual</h2>

      <p className="text-sm text-[#6B7280] mb-4">Estudante: {studentName}</p>

      {hasDataWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 mb-4">
          Não foi possível validar tudo agora. Você ainda pode seguir com as ações iniciais.
        </div>
      )}

      {!group ? (
        <>
          <p className="text-[#374151]">Você ainda não participa de um grupo.</p>
          <p className="text-[#374151] mt-2">
            Para começar o projeto, é necessário formar um grupo com seus colegas.
          </p>
        </>
      ) : (
        <>
          <p className="text-[#374151]">Você já está cadastrado no:</p>
          <p className="mt-2 font-semibold text-[#1F2937]">
            {group.theme || `Grupo ${String(group.id).slice(0, 8)}`}
          </p>

          <Link
            href={`${STUDENT_ROUTES.GROUP}/${group.id}`}
            className="inline-flex mt-4 rounded-lg bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2"
          >
            Acessar meu grupo
          </Link>
        </>
      )}
    </Card>
  );
}
