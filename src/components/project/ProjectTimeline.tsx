import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface TimelineItem {
  id: string | number;
  title: string;
  date: string;
  description?: string | null;
  status?: string;
}

interface ProjectTimelineProps {
  title?: string;
  items: TimelineItem[];
}

function statusVariant(status?: string) {
  if (status === "realizado" || status === "concluido") return "green" as const;
  if (status === "cancelado") return "red" as const;
  if (status === "agendado" || status === "em_andamento") return "blue" as const;
  return "gray" as const;
}

export function ProjectTimeline({ title = "Linha do tempo", items }: ProjectTimelineProps) {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-[#1F2937] mb-4">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={String(item.id)} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-[#4CAF50] mt-1" />
              <div className="w-px flex-1 bg-gray-200 min-h-8" />
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[#1F2937]">{item.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{item.date}</p>
                </div>
                {item.status && <Badge variant={statusVariant(item.status)}>{item.status}</Badge>}
              </div>
              {item.description && <p className="text-sm text-[#6B7280] mt-2">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
