import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface PreviewSection {
  id: string;
  title: string;
  status: string;
  excerpt: string;
}

interface PreviewRepertoryItem {
  title: string;
  resource_type: string;
}

interface ProjectPreviewProps {
  groupId: string;
  title: string;
  summary: string;
  sections: PreviewSection[];
  repertoryItems: PreviewRepertoryItem[];
  photosCount: number;
  hasContent: boolean;
}

function sectionStatusBadge(status: string) {
  if (status === "concluido") return <Badge variant="green">Concluída</Badge>;
  if (status === "em_andamento") return <Badge variant="yellow">Em andamento</Badge>;
  return <Badge variant="gray">Não iniciada</Badge>;
}

export function ProjectPreview({
  groupId,
  title,
  summary,
  sections,
  repertoryItems,
  photosCount,
  hasContent,
}: ProjectPreviewProps) {
  if (!hasContent) {
    return (
      <div className="rounded-2xl shadow-md bg-white p-6 border-l-4 border-l-[#F2C94C]">
        <h2 className="text-xl font-semibold text-[#1F2937] mb-2">Prévia do trabalho final</h2>
        <p className="text-sm text-[#6B7280]">
          A prévia será gerada automaticamente conforme o grupo preencher as seções do projeto.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-md bg-white p-6 border-l-4 border-l-[#2F80ED]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">Prévia do trabalho final</h2>
          <p className="text-sm text-[#6B7280] mt-0.5">Gerada automaticamente</p>
        </div>
        <Link
          href={`/groups/${groupId}/project/preview`}
          className="shrink-0 text-sm font-semibold text-[#2F80ED] hover:underline"
        >
          Ver completo →
        </Link>
      </div>

      <h3 className="text-lg font-bold text-[#1F2937] mb-1">{title}</h3>
      <p className="text-sm text-[#6B7280] leading-relaxed mb-4">{summary}</p>

      {sections.length > 0 && (
        <div className="space-y-2 mb-4">
          {sections.slice(0, 4).map((section) => (
            <div key={section.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1F2937] truncate">{section.title}</p>
                {section.excerpt && (
                  <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{section.excerpt}</p>
                )}
              </div>
              {sectionStatusBadge(section.status)}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-[#6B7280]">
        {repertoryItems.length > 0 && (
          <span>📚 {repertoryItems.length} fonte{repertoryItems.length > 1 ? "s" : ""}</span>
        )}
        {photosCount > 0 && (
          <span>📷 {photosCount} foto{photosCount > 1 ? "s" : ""} do processo</span>
        )}
      </div>
    </div>
  );
}
