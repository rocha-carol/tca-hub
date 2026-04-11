import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchGroupById } from "@/services/group-service";
import { fetchGroupFinalProduct } from "@/services/group-final-product-service";
import { fetchGroupProcessPhotos } from "@/services/group-process-photo-service";
import { fetchGroupRepertoryItems } from "@/services/group-repertory-item-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireGroupAccess } from "@/services/group-access-service";

interface FinalProductPageProps {
  params: Promise<{ id: string }>;
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  artigo: "Artigo",
  livro: "Livro",
  site: "Site",
  video: "Vídeo",
  podcast: "Podcast",
  outro: "Outro",
};

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  artigo: "bg-[#e8f5e9] text-[#2e7d32]",
  livro: "bg-[#e3f2fd] text-[#1565c0]",
  site: "bg-[#fff8e1] text-[#f57f17]",
  video: "bg-[#fce4ec] text-[#c62828]",
  podcast: "bg-[#ede7f6] text-[#4527a0]",
  outro: "bg-gray-100 text-gray-600",
};

export default async function FinalProductPage({ params }: FinalProductPageProps) {
  const { id } = await params;
  const { group } = await requireGroupAccess(id);

  let finalProduct: Awaited<ReturnType<typeof fetchGroupFinalProduct>> = null;
  let photos: Awaited<ReturnType<typeof fetchGroupProcessPhotos>> = [];
  let repertoryItems: Awaited<ReturnType<typeof fetchGroupRepertoryItems>> = [];

  try { finalProduct = await fetchGroupFinalProduct(id); } catch { /* silencioso */ }
  try { photos = await fetchGroupProcessPhotos(id); } catch { /* silencioso */ }
  try { repertoryItems = await fetchGroupRepertoryItems(id); } catch { /* silencioso */ }

  const title = finalProduct?.title || group.theme || "Produto Final";
  const summary = finalProduct?.description || group.description || "";
  const members = [group.member_1_name, group.member_2_name, group.member_3_name].filter(Boolean);

  return (
    <main className="min-h-full">
      <div className="max-w-4xl px-2 py-2 lg:px-0 space-y-8">
        <div className="tca-stripes h-1.5 w-full rounded-md" />

        {/* Cabeçalho */}
        <header>
          <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
            ← Voltar ao projeto
          </Link>
          <div className="flex items-start justify-between gap-4 mt-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-1">Produto Final</p>
              <h1 className="text-3xl font-bold text-[#1F2937]">{title}</h1>
              {members.length > 0 && (
                <p className="text-sm text-[#6B7280] mt-1">{members.join(" · ")}</p>
              )}
            </div>
            <Badge variant={finalProduct?.status === "finalizado" ? "green" : "yellow"}>
              {finalProduct?.status === "finalizado" ? "Finalizado" : "Em construção"}
            </Badge>
          </div>
        </header>

        {/* Resumo */}
        <Card accent="green">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#4CAF50] mb-3">Resumo</p>
          {summary ? (
            <p className="text-[#1F2937] leading-relaxed">{summary}</p>
          ) : (
            <p className="text-[#6B7280] italic text-sm">O grupo ainda não registrou uma descrição detalhada do produto final.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {finalProduct?.product_format && (
              <Badge variant="blue">Formato: {finalProduct.product_format}</Badge>
            )}
            {finalProduct?.final_link && (
              <a
                href={finalProduct.final_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[#2F80ED] px-3 py-0.5 text-xs font-semibold text-white hover:bg-[#1a6fd4] transition-colors"
              >
                Acessar produto →
              </a>
            )}
          </div>
        </Card>

        {/* Notas de apresentação */}
        {finalProduct?.presentation_notes && (
          <Card className="bg-[#fffdf5] border border-[#fce9b0]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F2C94C] mb-2">Notas de apresentação</p>
            <p className="text-sm text-[#1F2937] whitespace-pre-line leading-relaxed">
              {finalProduct.presentation_notes}
            </p>
          </Card>
        )}

        {/* Fotos do processo */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-[#1F2937]">Fotos</h2>
            {photos.length > 0 && (
              <Badge variant="gray">{photos.length} registro{photos.length !== 1 ? "s" : ""}</Badge>
            )}
          </div>
          {photos.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <p className="text-2xl mb-2">📷</p>
                <p className="text-sm text-[#6B7280]">Nenhuma foto do processo registrada ainda.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <a
                  key={String(photo.id)}
                  href={photo.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block group rounded-2xl overflow-hidden bg-gray-100 aspect-square shadow hover:shadow-md transition-shadow"
                  title={photo.caption ?? undefined}
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Foto do processo"}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Repertório */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-[#1F2937]">Repertório</h2>
            {repertoryItems.length > 0 && (
              <Badge variant="gray">{repertoryItems.length} fonte{repertoryItems.length !== 1 ? "s" : ""}</Badge>
            )}
          </div>
          {repertoryItems.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <p className="text-2xl mb-2">📚</p>
                <p className="text-sm text-[#6B7280]">Nenhuma fonte ou referência vinculada ainda.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {repertoryItems.map((item) => {
                const typeLabel = RESOURCE_TYPE_LABELS[item.resource_type] ?? item.resource_type;
                const typeColor = RESOURCE_TYPE_COLORS[item.resource_type] ?? "bg-gray-100 text-gray-600";
                return (
                  <Card key={String(item.id)} className="flex items-start gap-4">
                    <span className={`flex-shrink-0 inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${typeColor}`}>
                      {typeLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1F2937] text-sm">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-[#6B7280] mt-1">{item.description}</p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-[#6B7280] mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                    {item.resource_link && (
                      <a
                        href={item.resource_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 text-xs text-[#2F80ED] hover:underline"
                      >
                        Ver →
                      </a>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
