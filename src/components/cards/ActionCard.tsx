import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface ActionCardProps {
  title: string;
  value?: string | number;
  description?: string;
  href: string;
  accent?: "green" | "yellow" | "red" | "blue" | "none";
}

export function ActionCard({ title, value, description, href, accent = "none" }: ActionCardProps) {
  const accentStyles: Record<NonNullable<ActionCardProps["accent"]>, { valueClass: string; chipClass: string; glowClass: string }> = {
    green: {
      valueClass: "text-[var(--tca-primary)]",
      chipClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      glowClass: "group-hover:shadow-[0_20px_34px_-24px_rgba(47,143,83,0.65)]",
    },
    yellow: {
      valueClass: "text-amber-600",
      chipClass: "border-amber-200 bg-amber-50 text-amber-800",
      glowClass: "group-hover:shadow-[0_20px_34px_-24px_rgba(245,158,11,0.6)]",
    },
    red: {
      valueClass: "text-rose-600",
      chipClass: "border-rose-200 bg-rose-50 text-rose-700",
      glowClass: "group-hover:shadow-[0_20px_34px_-24px_rgba(225,29,72,0.55)]",
    },
    blue: {
      valueClass: "text-indigo-600",
      chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
      glowClass: "group-hover:shadow-[0_20px_34px_-24px_rgba(91,110,225,0.65)]",
    },
    none: {
      valueClass: "text-[var(--tca-primary)]",
      chipClass: "border-slate-200 bg-slate-50 text-slate-700",
      glowClass: "group-hover:shadow-[0_20px_34px_-24px_rgba(15,23,42,0.35)]",
    },
  };

  const style = accentStyles[accent];

  return (
    <Link href={href} className="group block h-full">
      <Card accent={accent} className={`h-full cursor-pointer overflow-hidden transition-all duration-200 group-hover:-translate-y-1 ${style.glowClass}`}>
        <div className="flex h-full flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
              <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.chipClass}`}>
                ação
              </span>
            </div>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-[var(--tca-text-muted)]">{description}</p>}
          </div>

          <div className="rounded-[22px] border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.98)_100%)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tca-text-muted)]">Resumo</p>
                <p className={`mt-1 text-3xl font-bold ${style.valueClass}`}>{value ?? "—"}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--tca-focus)] px-3 py-1.5 text-sm font-semibold text-[var(--tca-secondary)] transition-all duration-200 group-hover:bg-[var(--tca-secondary)] group-hover:text-white">
                Abrir
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
