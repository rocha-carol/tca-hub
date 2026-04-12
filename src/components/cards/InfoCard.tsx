import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface InfoCardProps {
  title: string;
  value: string | number;
  description?: string;
  href?: string;
  linkLabel?: string;
  accent?: "green" | "yellow" | "red" | "blue" | "none";
}

export function InfoCard({
  title,
  value,
  description,
  href,
  linkLabel,
  accent = "none",
}: InfoCardProps) {
  const accentStyles: Record<NonNullable<InfoCardProps["accent"]>, { valueClass: string; eyebrowClass: string; linkClass: string }> = {
    green: {
      valueClass: "text-[var(--tca-primary)]",
      eyebrowClass: "text-emerald-700",
      linkClass: "text-[var(--tca-primary)] hover:text-[var(--tca-primary-strong)]",
    },
    yellow: {
      valueClass: "text-amber-600",
      eyebrowClass: "text-amber-700",
      linkClass: "text-amber-700 hover:text-amber-800",
    },
    red: {
      valueClass: "text-rose-600",
      eyebrowClass: "text-rose-700",
      linkClass: "text-rose-700 hover:text-rose-800",
    },
    blue: {
      valueClass: "text-indigo-600",
      eyebrowClass: "text-indigo-700",
      linkClass: "text-indigo-700 hover:text-indigo-800",
    },
    none: {
      valueClass: "text-[var(--foreground)]",
      eyebrowClass: "text-[var(--tca-text-muted)]",
      linkClass: "text-[var(--tca-primary)] hover:text-[var(--tca-primary-strong)]",
    },
  };

  const style = accentStyles[accent];

  return (
    <Card accent={accent} className="overflow-hidden">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${style.eyebrowClass}`}>{title}</p>
      <p className={`mt-2 text-4xl font-bold ${style.valueClass}`}>{value}</p>
      {description && <p className="mt-2 text-sm leading-relaxed text-[var(--tca-text-muted)]">{description}</p>}
      {href && linkLabel && (
        <Link href={href} className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${style.linkClass}`}>
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </Card>
  );
}
