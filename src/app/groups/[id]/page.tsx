import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { requireGroupAccess } from "@/services/group-access-service";
import {
  respondAdvisorIndication,
  updateGroupAdvisors,
  updateGroupStatus,
} from "@/services/group-service";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchAllStudents } from "@/services/student-service";
import { fetchGroupAdvisorPreferences } from "@/services/group-advisor-preference-service";
import { suggestPrimaryAdvisorByPreference } from "@/services/advisor-indication-service";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import type { Student } from "@/types/student";
import type { GroupStatus } from "@/types/group";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function getProjectSectionStatusLabel(status: string) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluido") return "Concluída";
  return "Não iniciada";
}

function renderMemberCard(
  name: string,
  series: string | null
) {
  return (
    <div className="flex items-center justify-between gap-3 border border-lime-100 rounded-md px-3 py-2.5 bg-lime-50/40">
      <p className="font-medium text-[15px] text-gray-900 leading-snug">{name}</p>
      <p className="text-sm text-gray-600 whitespace-nowrap leading-snug">{series || "Série não informada"}</p>
    </div>
  );
}

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    indication_response?: string;
    advisor_error?: string;
  }>;
}

/**
 * Página de detalhe de um grupo.
 *
 * Permite visualizar todos os dados do grupo e associar orientadores
 * via seletor com os orientadores cadastrados no sistema.
 */
export default async function GroupDetailPage({ params, searchParams }: GroupDetailPageProps) {
  const { id } = await params;
  const { indication_response, advisor_error } = await searchParams;
  const { group, profile } = await requireGroupAccess(id);
  const isStudentView = profile?.role === "student";
  const canManageStatuses = profile?.role === "advisor" || profile?.role === "coordinator";

  async function handleAssignAdvisors(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}`);
    }

    const primaryAdvisorId = String(formData.get("primary_advisor_id") ?? "").trim() || null;
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    try {
      await updateGroupAdvisors(id, primaryAdvisorId, coAdvisorId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("indisponível") || message.includes("limite")) {
        redirect(`/groups/${id}?advisor_error=unavailable`);
      }
      redirect(`/groups/${id}?advisor_error=save`);
    }

    revalidatePath(`/groups/${id}`);
    redirect(`/groups/${id}`);
  }

  async function handleUpdateStatus(formData: FormData) {
    "use server";

    const authenticatedProfile = await getAuthenticatedProfile();
    if (!authenticatedProfile || (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator")) {
      redirect(`/groups/${id}`);
    }

    const rawStatus = String(formData.get("status") ?? "planejamento").trim();
    const validStatus: GroupStatus[] = ["planejamento", "em_andamento", "concluido"];
    const status = validStatus.includes(rawStatus as GroupStatus)
      ? (rawStatus as GroupStatus)
      : "planejamento";

    await updateGroupStatus(id, status);

    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    redirect(`/groups/${id}`);
  }

  async function handleRespondAdvisorIndication(formData: FormData) {
    "use server";

    const { profile: authenticatedProfile } = await requireGroupAccess(id);
    if (authenticatedProfile.role !== "advisor" && authenticatedProfile.role !== "coordinator") {
      redirect(`/groups/${id}`);
    }

    const decision = String(formData.get("decision") ?? "").trim();
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    if (decision !== "aceita" && decision !== "recusada") {
      redirect(`/groups/${id}`);
    }

    try {
      await respondAdvisorIndication(id, decision, coAdvisorId);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("indisponível") || message.includes("limite")) {
        redirect(`/groups/${id}?indication_response=unavailable`);
      }
      if (message.includes("coorientador") && message.includes("mesmo")) {
        redirect(`/groups/${id}?indication_response=invalid_co`);
      }
      redirect(`/groups/${id}?indication_response=error`);
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    redirect(`/groups/${id}?indication_response=${decision}`);
  }

  // Carrega orientadores para preencher o seletor — falha silenciosa se tabela não existir
  let advisors: Awaited<ReturnType<typeof fetchAllAdvisors>> = [];
  try {
    advisors = await fetchAllAdvisors();
  } catch {
    // sem orientadores cadastrados — seletor ficará vazio
  }

  let students: Student[] = [];
  try {
    students = await fetchAllStudents();
  } catch {
    students = [];
  }

  let advisorPreferences = [] as Awaited<ReturnType<typeof fetchGroupAdvisorPreferences>>;
  let advisorPreferencesError: string | null = null;
  try {
    advisorPreferences = await fetchGroupAdvisorPreferences(id);
  } catch (error) {
    advisorPreferencesError =
      error instanceof Error ? error.message : "Erro desconhecido ao carregar preferências.";
  }

  let projectSections = [] as Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>>;
  let projectSectionsError: string | null = null;
  try {
    projectSections = await ensureGroupProjectSectionsStructure(id);
  } catch (error) {
    projectSectionsError =
      error instanceof Error ? error.message : "Erro desconhecido ao carregar estrutura de seções do projeto.";
  }

  // Verificação de disponibilidade por preferência (para exibição informativa)
  let indicationChecked: Awaited<ReturnType<typeof suggestPrimaryAdvisorByPreference>>["checked"] = [];
  try {
    const indicationResult = await suggestPrimaryAdvisorByPreference(id);
    indicationChecked = indicationResult.checked;
  } catch {
    // falha silenciosa — informativo apenas
  }

  // Resolve nome dos orientadores vinculados
  const primaryAdvisor = advisors.find((a) => a.id === group.primary_advisor_id);
  const coAdvisor = advisors.find((a) => a.id === group.co_advisor_id);
  const indicatedAdvisor = advisors.find((a) => idsAreEqual(a.id, group.indicated_advisor_id));
  const preferenceAdvisor1 = advisorPreferences.find((p) => p.preference_order === 1);
  const preferenceAdvisor2 = advisorPreferences.find((p) => p.preference_order === 2);
  const preferenceAdvisor3 = advisorPreferences.find((p) => p.preference_order === 3);
  const preferredAdvisor1 = advisors.find((a) => idsAreEqual(a.id, preferenceAdvisor1?.advisor_id));
  const preferredAdvisor2 = advisors.find((a) => idsAreEqual(a.id, preferenceAdvisor2?.advisor_id));
  const preferredAdvisor3 = advisors.find((a) => idsAreEqual(a.id, preferenceAdvisor3?.advisor_id));

  const currentStatus: GroupStatus =
    group.status === "em_andamento" || group.status === "concluido"
      ? group.status
      : "planejamento";

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-2xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          {!isStudentView && (
            <Link href="/groups" className="text-lime-700 hover:underline text-sm">
              ← Voltar para grupos
            </Link>
          )}
          <h1 className="text-3xl font-bold tca-title-guide mt-3">Detalhe do grupo</h1>
        </header>

        {/* Integrantes */}
        <div className="tca-soft-surface rounded-lg p-4 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Integrantes do Grupo</h2>

          <div className="space-y-2">
            {renderMemberCard(group.member_1_name, group.member_1_series)}

            {group.member_2_name && (
              renderMemberCard(group.member_2_name, group.member_2_series)
            )}

            {group.member_3_name && (
              renderMemberCard(group.member_3_name, group.member_3_series)
            )}

            {group.member_4_name && (
              renderMemberCard(group.member_4_name, group.member_4_series ?? null)
            )}

            {group.member_5_name && (
              renderMemberCard(group.member_5_name, group.member_5_series ?? null)
            )}
          </div>
        </div>

        {/* Projeto */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projeto</h2>

          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-700">Tema</dt>
              <dd className="text-gray-900 mt-1">{group.theme || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-700">Descrição</dt>
              <dd className="text-gray-900 mt-1 whitespace-pre-line">
                {group.description || "Sem descrição"}
              </dd>
            </div>
          </dl>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">Status atual:</span> {getStatusLabel(currentStatus)}
            </p>

            {canManageStatuses ? (
              <form action={handleUpdateStatus} className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="status" className="block text-sm text-gray-600 mb-1">
                    Atualizar status do grupo
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={currentStatus}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="planejamento">Planejamento</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                >
                  Salvar status
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-500">
                A atualização de status do grupo fica disponível apenas para orientadores e coordenação.
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Estrutura das seções do projeto TCA</h3>

            <div className="mb-3">
              <Link
                href={`/groups/${id}/project`}
                className="text-sm text-lime-700 hover:underline font-medium"
              >
                Editar projeto por seções →
              </Link>
            </div>

            {projectSectionsError && (
              <p className="text-xs text-amber-800 mb-2">{projectSectionsError}</p>
            )}

            {projectSections.length === 0 ? (
              <p className="text-sm text-gray-500">Estrutura ainda não disponível para este grupo.</p>
            ) : (
              <ul className="space-y-2">
                {projectSections.map((section) => (
                  <li
                    key={String(section.id)}
                    className="flex items-start justify-between gap-3 border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {section.section_order}. {section.section_title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
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
                      {getProjectSectionStatusLabel(section.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Orientação */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Orientação</h2>

          {/* Resumo atual */}
          <div className="mb-5 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Orientador principal:</span>{" "}
              {primaryAdvisor ? (
                <span className="text-gray-900">{primaryAdvisor.name}</span>
              ) : (
                <span className="text-gray-400 italic">A definir</span>
              )}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Coorientador:</span>{" "}
              {coAdvisor ? (
                <span className="text-gray-900">{coAdvisor.name}</span>
              ) : (
                <span className="text-gray-400 italic">A definir</span>
              )}
            </p>

            <p className="text-sm text-gray-700">
              <span className="font-medium">Indicação:</span>{" "}
              {group.indication_status === "pendente" ? (
                <span className="text-amber-700 font-medium">Pendente</span>
              ) : group.indication_status === "aceita" ? (
                <span className="text-green-700 font-medium">Aceita</span>
              ) : group.indication_status === "recusada" ? (
                <span className="text-red-700 font-medium">Indisponível</span>
              ) : (
                <span className="text-gray-400 italic">Sem indicação ativa</span>
              )}
            </p>
          </div>

          {group.indication_status === "pendente" && indicatedAdvisor && (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 font-medium">
                Indicação pendente para: {indicatedAdvisor.name}
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Registre abaixo se a indicação foi aceita ou se o orientador ficou indisponível.
              </p>

              {indication_response === "invalid_co" && (
                <p className="text-xs text-red-700 mt-2 font-medium">
                  O coorientador não pode ser o mesmo orientador principal indicado.
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <form action={handleRespondAdvisorIndication} className="space-y-2">
                  <input type="hidden" name="decision" value="aceita" />

                  <div>
                    <label htmlFor="pending-co-advisor-id" className="block text-xs text-amber-900 mb-1">
                      Coorientador opcional
                    </label>
                    <select
                      id="pending-co-advisor-id"
                      name="co_advisor_id"
                      defaultValue={group.co_advisor_id ?? ""}
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md text-black bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">— Nenhum —</option>
                      {advisors
                        .filter((advisor) => !idsAreEqual(advisor.id, indicatedAdvisor.id))
                        .map((advisor) => (
                          <option key={advisor.id} value={advisor.id}>
                            {advisor.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-md"
                  >
                    Registrar aceite
                  </button>
                </form>

                <form action={handleRespondAdvisorIndication}>
                  <input type="hidden" name="decision" value="recusada" />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-md"
                  >
                    Marcar indisponível
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Preferências ordenadas */}
          <div className="mb-5 rounded-md border border-lime-100 bg-lime-50 p-4">
            <p className="text-sm font-medium text-lime-900 mb-2">Lista ordenada de preferência de orientadores</p>
            <ul className="space-y-1 text-sm text-lime-900">
              {[
                { label: "1ª preferência", advisor: preferredAdvisor1 },
                { label: "2ª preferência", advisor: preferredAdvisor2 },
                { label: "3ª preferência", advisor: preferredAdvisor3 },
              ].map(({ label, advisor }, index) => {
                const check = advisor
                  ? indicationChecked.find((c) => idsAreEqual(c.advisor.id, advisor.id))
                  : undefined;
                return (
                  <li key={index} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{label}:</span>{" "}
                      {advisor ? advisor.name : "Não definida"}
                    </span>
                    {check && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          check.available
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {check.available
                          ? `Disponível (${check.currentCount}/${check.maxOrientacoes})`
                          : `Indisponível (${check.currentCount}/${check.maxOrientacoes})`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {advisorPreferencesError && (
              <p className="text-xs text-amber-800 mt-2">{advisorPreferencesError}</p>
            )}

            {isStudentView ? (
              <div className="mt-3 pt-3 border-t border-lime-200">
                <Link
                  href={`/estudante/groups/${id}/advisor-indication`}
                  className="inline-flex rounded-md bg-lime-700 hover:bg-lime-800 text-white text-xs font-medium px-3 py-1.5"
                >
                  Abrir página de indicação de orientadores
                </Link>
                <p className="text-xs text-lime-900 mt-2">
                  A definição da ordem de preferência e o envio da indicação agora ficam em uma página dedicada do estudante.
                </p>
              </div>
            ) : advisorPreferences.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                {indication_response === "aceita" && (
                  <p className="text-xs text-green-700 mb-2 font-medium">
                    Aceite registrado. O orientador foi definido como principal do grupo.
                  </p>
                )}
                {indication_response === "unavailable" && (
                  <p className="text-xs text-red-700 mb-2 font-medium">
                    Não foi possível aceitar: o orientador atingiu o limite e está indisponível.
                  </p>
                )}
                {indication_response === "error" && (
                  <p className="text-xs text-red-700 mb-2 font-medium">
                    Não foi possível registrar a resposta da indicação. Tente novamente.
                  </p>
                )}
                {indication_response === "recusada" && (
                  <p className="text-xs text-red-700 mb-2 font-medium">
                    Indisponibilidade registrada. A indicação foi removida para nova tentativa.
                  </p>
                )}
                <p className="text-xs text-blue-900">
                  O envio da indicação por preferência é realizado pela página dedicada do estudante. Nesta tela, a orientação e a coordenação acompanham o status e registram o aceite ou a indisponibilidade.
                </p>
              </div>
            )}
          </div>

          {/* Formulário de associação */}
          {advisors.length > 0 ? (
            <>
              {!isStudentView && (
              <form action={handleAssignAdvisors} className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700">Atualizar orientadores:</p>

                {advisor_error === "unavailable" && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Este orientador principal está indisponível no momento (limite de orientações atingido).
                  </p>
                )}
                {advisor_error === "save" && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Não foi possível salvar a atualização de orientadores. Tente novamente.
                  </p>
                )}

                <div>
                  <label htmlFor="primary_advisor_id" className="block text-sm text-gray-600 mb-1">
                    Orientador principal
                  </label>
                  <select
                    id="primary_advisor_id"
                    name="primary_advisor_id"
                    defaultValue={group.primary_advisor_id ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="">— Nenhum —</option>
                    {advisors.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>
                        {advisor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="co_advisor_id" className="block text-sm text-gray-600 mb-1">
                    Coorientador
                  </label>
                  <select
                    id="co_advisor_id"
                    name="co_advisor_id"
                    defaultValue={group.co_advisor_id ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="">— Nenhum —</option>
                    {advisors.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>
                        {advisor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                >
                  Salvar orientadores
                </button>
              </form>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
              Nenhum orientador cadastrado.{" "}
              <Link href="/advisors" className="text-lime-700 hover:underline">
                Cadastre um orientador
              </Link>{" "}
              para associar ao grupo.
            </p>
          )}
        </div>

        <footer className="text-gray-500 text-xs mt-4">
          {group.created_at && (
            <p>
              Grupo criado em{" "}
              {new Date(group.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </footer>
      </section>
    </main>
  );
}

