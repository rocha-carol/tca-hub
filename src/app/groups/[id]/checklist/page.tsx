import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGroupById } from "@/services/group-service";
import { fetchGroupProjectDevelopmentChecklistItems } from "@/services/project-development-checklist-service";
import { fetchGroupProjectSections } from "@/services/project-section-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { requireGroupAccess } from "@/services/group-access-service";

interface ChecklistPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { id } = await params;
  const { group } = await requireGroupAccess(id);

  let items: Awaited<ReturnType<typeof fetchGroupProjectDevelopmentChecklistItems>> = [];
  let sections: Awaited<ReturnType<typeof fetchGroupProjectSections>> = [];

  try {
    items = await fetchGroupProjectDevelopmentChecklistItems(id);
  } catch { /* silencioso */ }

  try {
    sections = await fetchGroupProjectSections(id);
  } catch { /* silencioso */ }

  const sectionTitleById = new Map(sections.map((s) => [String(s.id), `${s.section_order}. ${s.section_title}`]));

  const completed = items.filter((i) => i.status === "concluido").length;
  const total = items.length;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="tca-stripes h-1.5 w-full rounded-md" />

      <header>
        <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
          ← Projeto
        </Link>
        <h1 className="text-3xl font-bold text-[#1F2937] mt-2">Checklist de desenvolvimento</h1>
        <p className="text-[#6B7280] mt-1">{group.theme || group.member_1_name}</p>
      </header>

      {total > 0 && (
        <Card>
          <ProgressBar
            value={completed}
            max={total}
            label={`${completed} de ${total} itens concluídos`}
            colorClass="bg-[#4CAF50]"
          />
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <p className="text-[#6B7280] text-sm">
            Nenhum item no checklist ainda. O orientador pode adicionar itens de desenvolvimento pela página do projeto.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={String(item.id)}
              accent={item.status === "concluido" ? "green" : "none"}
              className="flex items-start gap-4"
            >
              <div className="mt-0.5 text-lg">
                {item.status === "concluido" ? "✅" : "⬜"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-[#1F2937] ${item.status === "concluido" ? "line-through text-[#6B7280]" : ""}`}>
                  {item.item_text}
                </p>
                <div className="flex flex-wrap gap-2 mt-1 items-center text-xs text-[#6B7280]">
                  {item.section_id && sectionTitleById.get(String(item.section_id)) && (
                    <span className="bg-gray-100 rounded px-2 py-0.5">
                      {sectionTitleById.get(String(item.section_id))}
                    </span>
                  )}
                  <span>por {item.created_by_name}</span>
                </div>
              </div>
              <Badge variant={item.status === "concluido" ? "green" : "gray"}>
                {item.status === "concluido" ? "Concluído" : "Pendente"}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
