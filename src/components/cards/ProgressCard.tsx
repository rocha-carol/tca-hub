import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ProgressCardProps {
  title: string;
  description?: string;
  value: number;
  max: number;
}

export function ProgressCard({ title, description, value, max }: ProgressCardProps) {
  return (
    <Card accent="green">
      <h3 className="text-lg font-semibold text-[#1F2937]">{title}</h3>
      {description && <p className="text-sm text-[#6B7280] mt-1 mb-4">{description}</p>}
      <ProgressBar value={value} max={max} colorClass="bg-[#4CAF50]" />
    </Card>
  );
}
