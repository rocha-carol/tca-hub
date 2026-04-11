import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchGroupById } from "@/services/group-service";
import { fetchGroupProcessPhotos } from "@/services/group-process-photo-service";
import { fetchGroupProjectSections } from "@/services/project-section-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireGroupAccess } from "@/services/group-access-service";

interface DiaryPageProps {
  params: Promise<{ id: string }>;
}

const ACTIVITY_TYPES = [
  { key: "entrevista", label: "Entrevista", color: "bg-[#2F80ED]", text: "text-white" },
  { key: "pesquisa", label: "Pesquisa", color: "bg-[#8BC34A]", text: "text-white" },
  { key: "observacao", label: "Observação", color: "bg-[#F2C94C]", text: "text-[#1F2937]" },
  { key: "reuniao", label: "Reunião", color: "bg-[#EB5757]", text: "text-white" },
  { key: "registro", label: "Registro", color: "bg-[#6B7280]", text: "text-white" },
] as const;

function inferActivityType(caption: string | null) {
  const c = (caption ?? "").toLowerCase();
  if (c.includes("entrevist")) return ACTIVITY_TYPES[0];
  if (c.includes("pesquis") || c.includes("busca") || c.includes("leitura")) return ACTIVITY_TYPES[1];
  if (c.includes("observa") || c.includes("visita") || c.includes("campo")) return ACTIVITY_TYPES[2];
  if (c.includes("reuni") || c.includes("encontro") || c.includes("discussion")) return ACTIVITY_TYPES[3];
  return ACTIVITY_TYPES[4];
}

function formatDate(date?: string | null) {
  if (!date) return null;
  try {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return date;
  }
}

export default async function DiaryPage({ params }: DiaryPageProps) {
  const { id } = await params;
  const { group } = await requireGroupAccess(id);

  let photos: Awaited<ReturnType<typeof fetchGroupProcessPhotos>> = [];
  let sections: Awaited<ReturnType<typeof fetchGroupProjectSections>> = [];

  try {
    photos = await fetchGroupProcessPhotos(id);
  } catch {
    photos = [];
  }

  try {
    sections = await fetchGroupProjectSections(id);
  } catch {
    sections = [];
  }

  const sectionTitleById = new Map(sections.map((section) => [String(section.id), section.section_title]));

  // Sort by taken_at or created_at descending
  const sortedPhotos = [...photos].sort((a, b) => {
    const dateA = a.taken_at ?? a.created_at ?? "";
    const dateB = b.taken_at ?? b.created_at ?? "";
    return dateB.localeCompare(dateA);
  });

  return (
    <main className="min-h-full">
      <section className="max-w-3xl px-2 py-2 lg:px-0">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

        <header className="mb-8">
          <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
            ← Voltar ao projeto
          </Link>
          <h1 className="text-3xl font-bold text-[#1F2937] mt-3">Diário de investigação</h1>
          <p className="text-[#6B7280] mt-1">
            Registro cronológico das atividades, pesquisas e encontros do grupo.
          </p>
        </header>

        {/* Legenda de tipos */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ACTIVITY_TYPES.map((t) => (
            <span
              key={t.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${t.color} ${t.text}`}
            >
              {t.label}
            </span>
          ))}
        </div>

        {sortedPhotos.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <p className="text-2xl mb-2">📓</p>
              <p className="text-sm font-semibold text-[#1F2937] mb-1">Nenhum registro ainda</p>
              <p className="text-sm text-[#6B7280]">
                Os registros de investigação — fotos, entrevistas e observações — cadastrados no módulo do projeto aparecerão aqui automaticamente.
              </p>
            </div>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {sortedPhotos.map((photo) => {
                const activityType = inferActivityType(photo.caption);
                const date = formatDate(photo.taken_at ?? photo.created_at);
                const sectionTitle = photo.section_id
                  ? sectionTitleById.get(String(photo.section_id))
                  : null;

                return (
                  <div key={String(photo.id)} className="flex gap-4 items-start">
                    {/* Timeline dot */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow z-10 ${activityType.color} ${activityType.text}`}
                    >
                      {activityType.label.slice(0, 2)}
                    </div>

                    {/* Card */}
                    <Card className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${activityType.color} ${activityType.text}`}
                          >
                            {activityType.label}
                          </span>
                          {sectionTitle && (
                            <Badge variant="blue">{sectionTitle}</Badge>
                          )}
                        </div>
                        {date && (
                          <time className="text-xs text-[#6B7280] flex-shrink-0">{date}</time>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-start">
                        {photo.photo_url && (
                          <a
                            href={photo.photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl overflow-hidden bg-gray-100 aspect-[4/3] flex-shrink-0 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={photo.photo_url}
                              alt={photo.caption || "Registro do processo"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        )}
                        <div>
                          <p className="text-sm text-[#1F2937] leading-relaxed">
                            {photo.caption || <span className="text-gray-400 italic">Sem descrição informada.</span>}
                          </p>
                          <p className="text-xs text-[#6B7280] mt-3">
                            Registrado por{" "}
                            <span className="font-medium text-[#1F2937]">{photo.author_name}</span>
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
