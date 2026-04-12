import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ProgressCardProps {
  title: string;
  description?: string;
  value: number;
  max: number;
}

export function ProgressCard({ title, description, value, max }: ProgressCardProps) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  return (
    <Card accent="green" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tca-text-muted)]">Progresso</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{title}</h3>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--tca-text-muted)]">{description}</p>}
        </div>

        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Avanço atual</p>
          <p className="mt-1 text-3xl font-bold text-emerald-800">{percent}%</p>
          <p className="mt-1 text-xs text-emerald-700">{value} de {max}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(242,246,242,0.96)_100%)] px-4 py-4">
        <ProgressBar
          value={value}
          max={max}
          label="Percurso concluído"
          colorClass="bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)]"
        />
      </div>
    </Card>
  );
}
