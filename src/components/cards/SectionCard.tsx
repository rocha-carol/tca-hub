import { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusVariant?: "green" | "yellow" | "red" | "blue" | "gray" | "teal";
  children?: ReactNode;
  actions?: ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  statusLabel,
  statusVariant = "gray",
  children,
  actions,
}: SectionCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-xl font-semibold text-[#1F2937]">{title}</h3>
          {subtitle && <p className="text-sm text-[#6B7280] mt-1">{subtitle}</p>}
        </div>
        {statusLabel && <Badge variant={statusVariant}>{statusLabel}</Badge>}
      </div>
      {children}
      {actions && <div className="mt-4">{actions}</div>}
    </Card>
  );
}
