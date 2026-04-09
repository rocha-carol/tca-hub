import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureGroupProjectSectionsStructure, updateGroupProjectSection } from "@/services/project-section-service";
import { fetchGroupById } from "@/services/group-service";
import type { ProjectSectionStatus } from "@/types/project-section";

interface GroupProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ section_status?: string; section_id?: string }>;
}

function getStatusLabel(status: ProjectSectionStatus) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluido") return "Concluída";
  return "Não iniciada";
}

export default async function GroupProjectPage({ params, searchParams }: GroupProjectPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const group = await fetchGroupById(id);
  if (!group) {
    notFound();
  }

  async function handleUpdateSection(formData: FormData) {
    "use server";

    const sectionId = String(formData.get("section_id") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const rawStatus = String(formData.get("status") ?? "nao_iniciado").trim();

    const allowed: ProjectSectionStatus[] = ["nao_iniciado", "em_andamento", "concluido"];
    const status = allowed.includes(rawStatus as ProjectSectionStatus)
      ? (rawStatus as ProjectSectionStatus)
      : "nao_iniciado";

    if (!sectionId) {
      redirect(`/groups/${id}/project?section_status=error`);
    }

    try {
      await updateGroupProjectSection(sectionId, {
        content: content || null,
        status,
      });
    } catch {
      redirect(`/groups/${id}/project?section_status=error&section_id=${sectionId}`);
    }

    revalidatePath(`/groups/${id}/project`);
    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    redirect(`/groups/${id}/project?section_status=success&section_id=${sectionId}`);
  }

  let sections = [] as Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>>;
  let sectionsError: string | null = null;

  try {
    sections = await ensureGroupProjectSectionsStructure(id);
  } catch (error) {
    sectionsError = error instanceof Error ? error.message : "Erro ao carregar seções do projeto.";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <Link href={`/groups/${id}`} className="text-blue-600 hover:underline text-sm">
            ← Voltar para detalhe do grupo
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Projeto por seções</h1>
          <p className="text-gray-600 mt-1">Grupo: {group.theme || group.member_1_name}</p>
        </header>

        {sectionsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Configuração pendente das seções do projeto</p>
            <p className="text-amber-800 text-sm mt-1">{sectionsError}</p>
          </div>
        )}

        {sections.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <p className="text-gray-600">Nenhuma seção disponível para edição ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <article key={String(section.id)} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {section.section_order}. {section.section_title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.section_description || "Sem descrição"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      section.status === "concluido"
                        ? "bg-green-100 text-green-700"
                        : section.status === "em_andamento"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {getStatusLabel(section.status)}
                  </span>
                </div>

                {query.section_status === "success" && query.section_id === String(section.id) && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
                    Seção atualizada com sucesso.
                  </p>
                )}
                {query.section_status === "error" && (!query.section_id || query.section_id === String(section.id)) && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                    Não foi possível atualizar esta seção. Tente novamente.
                  </p>
                )}

                <form action={handleUpdateSection} className="space-y-3">
                  <input type="hidden" name="section_id" value={String(section.id)} />

                  <div>
                    <label htmlFor={`status-${section.id}`} className="block text-sm text-gray-700 mb-1">
                      Status da seção
                    </label>
                    <select
                      id={`status-${section.id}`}
                      name="status"
                      defaultValue={section.status}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="nao_iniciado">Não iniciada</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluída</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`content-${section.id}`} className="block text-sm text-gray-700 mb-1">
                      Conteúdo da seção
                    </label>
                    <textarea
                      id={`content-${section.id}`}
                      name="content"
                      rows={6}
                      defaultValue={section.content || ""}
                      placeholder="Escreva aqui o conteúdo desta seção..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                  >
                    Salvar seção
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
