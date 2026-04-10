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
  return (
    <Link href={href} className="block h-full">
      <Card accent={accent} className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-lg cursor-pointer">
        <div className="flex h-full flex-col justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-[#1F2937]">{title}</p>
            {description && <p className="text-sm text-[#6B7280] mt-1">{description}</p>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold text-[#4CAF50]">{value ?? "—"}</p>
            <span className="text-sm font-medium text-[#4CAF50]">Abrir →</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
