import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface StudentActionsProps {
  hasGroup: boolean;
  groupId?: string;
}

export function StudentActions({ hasGroup, groupId }: StudentActionsProps) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-[#1F2937] mb-4">Ações iniciais</h2>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/student/groups/create"
          className="inline-flex rounded-lg bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2"
        >
          Começar um grupo
        </Link>

        <Link
          href="/student/groups/status"
          className="inline-flex rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2"
        >
          Verificar se já estou em um grupo
        </Link>

        {hasGroup && groupId && (
          <Link
            href={`/student/groups/${groupId}`}
            className="inline-flex rounded-lg bg-[#2F80ED] hover:bg-blue-700 text-white font-medium px-4 py-2"
          >
            Acessar meu grupo
          </Link>
        )}
      </div>
    </Card>
  );
}
