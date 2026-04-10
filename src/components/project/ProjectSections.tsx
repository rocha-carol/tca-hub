import Link from "next/link";
import { SectionCard } from "@/components/cards/SectionCard";

interface ProjectSectionsItem {
  id: string | number;
  section_order: number;
  section_title: string;
  section_description?: string | null;
  status: string;
}

interface ProjectSectionsProps {
  groupId: string;
  sections: ProjectSectionsItem[];
}

function mapStatus(status: string) {
  if (status === "concluido") return { label: "Concluída", variant: "green" as const };
  if (status === "em_andamento") return { label: "Em andamento", variant: "yellow" as const };
  return { label: "Não iniciada", variant: "gray" as const };
}

export function ProjectSections({ groupId, sections }: ProjectSectionsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => {
        const status = mapStatus(section.status);
        return (
          <Link
            key={String(section.id)}
            href={`/groups/${groupId}/project/sections/${section.id}`}
            className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF50]"
          >
            <SectionCard
              title={section.section_title}
              subtitle={section.section_description || undefined}
              statusLabel={status.label}
              statusVariant={status.variant}
              actions={
                <span className="text-sm text-[#4CAF50] font-medium hover:underline">
                  Abrir seção →
                </span>
              }
            />
          </Link>
        );
      })}
    </div>
  );
}
