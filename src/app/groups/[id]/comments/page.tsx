import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGroupById } from "@/services/group-service";
import { fetchGroupProjectSectionComments } from "@/services/project-section-comment-service";
import { fetchGroupProjectSections } from "@/services/project-section-service";
import { Card } from "@/components/ui/Card";
import { requireGroupAccess } from "@/services/group-access-service";

interface CommentsPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

export default async function CommentsPage({ params }: CommentsPageProps) {
  const { id } = await params;
  const { group } = await requireGroupAccess(id);

  let comments: Awaited<ReturnType<typeof fetchGroupProjectSectionComments>> = [];
  let sections: Awaited<ReturnType<typeof fetchGroupProjectSections>> = [];

  try {
    comments = await fetchGroupProjectSectionComments(id);
  } catch { /* silencioso */ }

  try {
    sections = await fetchGroupProjectSections(id);
  } catch { /* silencioso */ }

  const sectionTitleById = new Map(sections.map((s) => [String(s.id), `${s.section_order}. ${s.section_title}`]));

  const commentsBySection = new Map<string, typeof comments>();
  for (const comment of comments) {
    const key = String(comment.section_id);
    commentsBySection.set(key, [...(commentsBySection.get(key) ?? []), comment]);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="tca-stripes h-1.5 w-full rounded-md" />

      <header>
        <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
          ← Projeto
        </Link>
        <h1 className="text-3xl font-bold text-[#1F2937] mt-2">Comentários do orientador</h1>
        <p className="text-[#6B7280] mt-1">{group.theme || group.member_1_name}</p>
      </header>

      {comments.length === 0 ? (
        <Card>
          <p className="text-[#6B7280] text-sm">
            Nenhum comentário registrado ainda. O orientador pode comentar em cada seção pela página do projeto.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {sections
            .filter((s) => commentsBySection.has(String(s.id)))
            .map((section) => {
              const sectionComments = commentsBySection.get(String(section.id)) ?? [];
              return (
                <section key={String(section.id)}>
                  <h2 className="text-base font-semibold text-[#1F2937] mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#4CAF50]" />
                    {section.section_order}. {section.section_title}
                  </h2>
                  <div className="space-y-3">
                    {sectionComments.map((comment) => (
                      <Card key={String(comment.id)} accent="green">
                        <p className="text-sm text-[#1F2937] leading-relaxed">{comment.comment}</p>
                        <p className="text-xs text-[#6B7280] mt-2">
                          💬 {comment.author_name}
                          {" "}({comment.author_role === "coordinator" ? "Coordenador" : "Orientador"})
                          {formatDate(comment.created_at) && ` • ${formatDate(comment.created_at)}`}
                        </p>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
