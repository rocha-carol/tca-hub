import { ProgressBar } from "@/components/ui/ProgressBar";

interface ProjectProgressProps {
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
}

export function ProjectProgress({ completed, inProgress, notStarted, total }: ProjectProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl shadow-md bg-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">Progresso do projeto</h2>
          <p className="text-sm text-[#6B7280] mt-1">
            Calculado automaticamente pelo status de cada seção
          </p>
        </div>
        <p className="text-3xl font-bold text-[#4CAF50] sm:text-right">{percent}%</p>
      </div>

      <ProgressBar
        value={completed}
        max={total || 1}
        showPercent={false}
        colorClass="bg-gradient-to-r from-[#4CAF50] via-[#8BC34A] to-teal-400"
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Concluídas</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{completed}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Em andamento</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{inProgress}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Não iniciadas</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{notStarted}</p>
        </div>
      </div>
    </div>
  );
}
