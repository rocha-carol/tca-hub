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
  return (
    <Card accent={accent}>
      <p className="text-sm font-medium text-[#6B7280]">{title}</p>
      <p className="text-4xl font-bold text-[#1F2937] mt-2">{value}</p>
      {description && <p className="text-sm text-[#6B7280] mt-2">{description}</p>}
      {href && linkLabel && (
        <Link href={href} className="text-sm text-[#4CAF50] hover:underline mt-3 inline-block">
          {linkLabel}
        </Link>
      )}
    </Card>
  );
}
