import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGroupById } from "@/services/group-service";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import { fetchGroupFinalProduct } from "@/services/group-final-product-service";
import { fetchGroupProcessPhotos } from "@/services/group-process-photo-service";
import { fetchGroupRepertoryItems } from "@/services/group-repertory-item-service";
import { requireGroupAccess } from "@/services/group-access-service";

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  artigo: "Artigo", livro: "Livro", site: "Site",
  video: "Vídeo", podcast: "Podcast", outro: "Outro",
};

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

function toRoman(n: number): string {
  const vals = [10, 9, 5, 4, 1];
  const syms = ["X", "IX", "V", "IV", "I"];
  let result = "";
  vals.forEach((v, i) => { while (n >= v) { result += syms[i]; n -= v; } });
  return result;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const { group } = await requireGroupAccess(id);

  let sections: Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>> = [];
  let finalProduct: Awaited<ReturnType<typeof fetchGroupFinalProduct>> = null;
  let photos: Awaited<ReturnType<typeof fetchGroupProcessPhotos>> = [];
  let repertoryItems: Awaited<ReturnType<typeof fetchGroupRepertoryItems>> = [];

  try { sections = await ensureGroupProjectSectionsStructure(id); } catch { /* silencioso */ }
  try { finalProduct = await fetchGroupFinalProduct(id); } catch { /* silencioso */ }
  try { photos = await fetchGroupProcessPhotos(id); } catch { /* silencioso */ }
  try { repertoryItems = await fetchGroupRepertoryItems(id); } catch { /* silencioso */ }

  const title = finalProduct?.title || group.theme || "Trabalho Colaborativo de Autoria";
  const summary = finalProduct?.description || group.description || "";
  const members = [group.member_1_name, group.member_2_name, group.member_3_name].filter(Boolean);
  const filledSections = sections.filter((s) => !!s.content?.trim());

  return (
    <div className="max-w-3xl">
      {/* Nav */}
      <div className="mb-6 no-print">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-4" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href={`/groups/${id}/project`} className="text-sm text-[#4CAF50] hover:underline">
            ← Projeto
          </Link>
          <span className="text-xs text-[#6B7280]">Visualização de artigo acadêmico</span>
        </div>
      </div>

      {/* Paper wrapper — styled like a printed academic sheet */}
      <article className="bg-white shadow-lg rounded-2xl overflow-hidden">

        {/* ── CAPA ── */}
        <div className="bg-[#F5F2E9] border-b-4 border-[#4CAF50] px-10 py-14 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-[#4CAF50] font-semibold mb-6">
            Trabalho Colaborativo de Autoria
          </p>
          <h1 className="text-3xl font-bold text-[#1F2937] mb-6 leading-snug">{title}</h1>

          <div className="flex flex-col items-center gap-1 mb-8">
            {members.map((m, i) => (
              <p key={i} className="text-sm text-[#6B7280]">{m}</p>
            ))}
          </div>

          {finalProduct?.product_format && finalProduct.product_format !== "outro" && (
            <p className="text-xs text-[#6B7280] mb-2 capitalize">
              Formato: {finalProduct.product_format}
            </p>
          )}

          <p className="text-xs text-[#9CA3AF] mt-6">
            {new Date().getFullYear()} — TCA Hub
          </p>
        </div>

        {/* ── RESUMO ── */}
        {summary && (
          <div className="px-10 py-8 border-b border-gray-100">
            <h2 className="text-base font-bold text-[#1F2937] uppercase tracking-widest mb-3">Resumo</h2>
            <p className="text-sm text-[#374151] leading-relaxed text-justify">{summary}</p>
          </div>
        )}

        {/* ── SEÇÕES ── */}
        {sections.length > 0 && (
          <div className="divide-y divide-gray-100">
            {sections.map((section, index) => (
              <div key={String(section.id)} className="px-10 py-8">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-xs font-bold text-[#4CAF50] upperecase tabular-nums w-6 flex-shrink-0">
                    {toRoman(index + 1)}.
                  </span>
                  <h2 className="text-lg font-bold text-[#1F2937]">{section.section_title}</h2>
                </div>

                {section.content?.trim() ? (
                  <p className="text-sm text-[#374151] leading-relaxed text-justify whitespace-pre-line ml-9">
                    {section.content}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic ml-9">
                    Esta seção ainda não foi preenchida pelo grupo.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── FOTOS DO PROCESSO ── */}
        {photos.length > 0 && (
          <div className="px-10 py-8 border-t border-gray-100">
            <h2 className="text-base font-bold text-[#1F2937] uppercase tracking-widest mb-5">
              Registros do Processo
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <figure key={String(photo.id)} className="m-0">
                  <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || "Foto do processo"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {photo.caption && (
                    <figcaption className="mt-1 text-xs text-[#6B7280] text-center leading-tight">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* ── PRODUTO FINAL ── */}
        {finalProduct && (
          <div className="px-10 py-8 border-t border-gray-100 bg-[#f0faf0]">
            <h2 className="text-base font-bold text-[#1F2937] uppercase tracking-widest mb-3">
              Produto Final
            </h2>
            {finalProduct.description && (
              <p className="text-sm text-[#374151] leading-relaxed mb-3">
                {finalProduct.description}
              </p>
            )}
            {finalProduct.presentation_notes && (
              <p className="text-sm text-[#6B7280] italic mb-3">{finalProduct.presentation_notes}</p>
            )}
            {finalProduct.final_link && (
              <a
                href={finalProduct.final_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#2F80ED] hover:underline"
              >
                Acessar produto final →
              </a>
            )}
          </div>
        )}

        {/* ── REFERÊNCIAS ── */}
        {repertoryItems.length > 0 && (
          <div className="px-10 py-8 border-t border-gray-100">
            <h2 className="text-base font-bold text-[#1F2937] uppercase tracking-widest mb-5">
              Referências
            </h2>
            <ol className="space-y-3 list-none">
              {repertoryItems.map((item, i) => (
                <li key={String(item.id)} className="flex gap-3 text-sm text-[#374151]">
                  <span className="text-[#4CAF50] font-semibold flex-shrink-0 tabular-nums">
                    [{i + 1}]
                  </span>
                  <div>
                    <span className="font-medium">{item.title}</span>
                    {item.description && (
                      <span className="text-[#6B7280]"> — {item.description}</span>
                    )}
                    {item.resource_type && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({RESOURCE_TYPE_LABELS[item.resource_type] ?? item.resource_type})
                      </span>
                    )}
                    {item.resource_link && (
                      <>
                        {" "}
                        <a
                          href={item.resource_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2F80ED] hover:underline"
                        >
                          Acessar
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Rodapé */}
        <div className="px-10 py-6 border-t border-gray-100 bg-[#F5F2E9] text-center">
          <p className="text-xs text-[#9CA3AF]">
            TCA Hub — Plataforma de Projeto Autoral Colaborativo
          </p>
        </div>
      </article>
    </div>
  );
}
