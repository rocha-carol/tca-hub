import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAllGroups } from "@/services/group-service";
import {
  createAdvisor,
  deleteAdvisor,
  deactivateAdvisor,
  fetchAllAdvisors,
  importAdvisors,
  updateAdvisor,
} from "@/services/advisor-service";
import { parseCsvText } from "@/lib/import/csv";
import type { Advisor } from "@/types/advisor";
import type { Group } from "@/types/group";

const ADVISOR_PAGE_PATHS = ["/advisors", "/coordinator/advisors"] as const;

function revalidateAdvisorPages() {
  for (const path of ADVISOR_PAGE_PATHS) {
    revalidatePath(path);
  }
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function getGroupLabel(group: Group) {
  return group.theme || group.member_1_name || `Grupo ${String(group.id).slice(0, 8)}`;
}

function getAdvisorStatus(advisor: Advisor, groups: Group[]) {
  const pendingGroup = groups.find(
    (group) =>
      idsAreEqual(group.indicated_advisor_id, advisor.id) &&
      group.indication_status === "pendente"
  );

  if (pendingGroup) {
    return {
      label: "Status: Ainda não respondeu solicitação de orientação",
      description: getGroupLabel(pendingGroup),
      className: "bg-amber-100 text-amber-800",
    };
  }

  const linkedGroups = groups.filter(
    (group) => idsAreEqual(group.primary_advisor_id, advisor.id) || idsAreEqual(group.co_advisor_id, advisor.id)
  );

  if (linkedGroups.length > 0) {
    const firstGroupLabel = getGroupLabel(linkedGroups[0]);
    const suffix = linkedGroups.length > 1 ? ` e +${linkedGroups.length - 1}` : "";

    return {
      label: `Status: Orientador ${firstGroupLabel}${suffix}`,
      description: linkedGroups.length > 1 ? `${linkedGroups.length} grupo(s) vinculados` : "Grupo vinculado",
      className: "bg-blue-100 text-blue-800",
    };
  }

  return {
    label: "Status: Sem grupo para orientar",
    description: "Disponível para nova distribuição",
    className: "bg-gray-100 text-gray-700",
  };
}

/**
 * Página de Orientadores (MVP).
 *
 * Permite cadastrar e listar orientadores.
 * Associação com grupos será feita em etapa futura.
 */
interface AdvisorsPageProps {
  searchParams: Promise<{
    import_status?: string;
    import_count?: string;
    import_skipped?: string;
    update_status?: string;
    update_id?: string;
    delete_status?: string;
    delete_id?: string;
    edit_id?: string;
  }>;
}

export default async function AdvisorsPage({ searchParams }: AdvisorsPageProps) {
  const { import_status, import_count, import_skipped, update_status, update_id, delete_status, delete_id, edit_id } = await searchParams;

  let advisors: Advisor[] = [];
  let groups: Group[] = [];
  let advisorsError: string | null = null;

  async function handleCreateAdvisor(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const roleTitle = String(formData.get("role_title") ?? "").trim();
    const employeeCode = String(formData.get("employee_code") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const areaOfActivity = String(formData.get("area_of_activity") ?? "").trim();
    const rawMaxOrientacoes = String(formData.get("max_orientacoes") ?? "").trim();
    const maxOrientacoes = rawMaxOrientacoes && /^\d+$/.test(rawMaxOrientacoes)
      ? Math.max(1, Number(rawMaxOrientacoes))
      : null;

    if (!name || name.length < 2 || !email) {
      redirect("/advisors");
    }

    await createAdvisor({
      name,
      email,
      role_title: roleTitle || null,
      employee_code: employeeCode || null,
      school: school || null,
      area_of_activity: areaOfActivity || null,
      max_orientacoes: maxOrientacoes,
    });

    revalidateAdvisorPages();
    redirect("/advisors");
  }

  async function handleUpdateAdvisor(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const roleTitle = String(formData.get("role_title") ?? "").trim();
    const employeeCode = String(formData.get("employee_code") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const areaOfActivity = String(formData.get("area_of_activity") ?? "").trim();
    const rawMaxOrientacoes = String(formData.get("max_orientacoes") ?? "").trim();
    const maxOrientacoes = rawMaxOrientacoes && /^\d+$/.test(rawMaxOrientacoes)
      ? Math.max(1, Number(rawMaxOrientacoes))
      : null;

    if (!id || !name || name.length < 2 || !email) {
      redirect("/advisors");
    }

    await updateAdvisor(id, {
      name,
      email,
      role_title: roleTitle || null,
      employee_code: employeeCode || null,
      school: school || null,
      area_of_activity: areaOfActivity || null,
      max_orientacoes: maxOrientacoes,
    });

    revalidateAdvisorPages();
    redirect(`/advisors?update_status=success&update_id=${id}`);
  }

  async function handleDeactivateAdvisor(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      redirect("/advisors");
    }

    await deactivateAdvisor(id);

    revalidateAdvisorPages();
    redirect("/advisors");
  }

  async function handleDeleteAdvisor(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      redirect("/advisors?delete_status=invalid");
    }

    try {
      await deleteAdvisor(id);
    } catch {
      redirect(`/advisors?delete_status=error&delete_id=${id}`);
    }

    revalidateAdvisorPages();
    redirect(`/advisors?delete_status=success&delete_id=${id}`);
  }

  async function handleImportAdvisors(formData: FormData) {
    "use server";

    const file = formData.get("import_file");
    if (!(file instanceof File) || file.size === 0) {
      redirect("/advisors?import_status=invalid_file");
    }

    let text = "";
    try {
      text = await file.text();
    } catch {
      redirect("/advisors?import_status=invalid_file");
    }

    let rows: ReturnType<typeof parseCsvText>["rows"] = [];
    try {
      rows = parseCsvText(text).rows;
    } catch {
      redirect("/advisors?import_status=invalid_csv");
    }

    const mappedRows = rows.map((row) => {
      const rawMax = row.max_orientacoes || row.maximo_orientacoes || row.maximo || "";
      const maxOrientacoes = /^\d+$/.test(rawMax) ? Math.max(1, Number(rawMax)) : null;

      return {
        name: row.name || row.nome || "",
        email: row.email || row.e_mail || "",
        role_title: row.role_title || row.cargo || row.funcao || null,
        employee_code: row.employee_code || row.codigo_funcional || null,
        school: row.school || row.escola || null,
        area_of_activity: row.area_of_activity || row.area_atuacao || row.area || null,
        max_orientacoes: maxOrientacoes,
      };
    });

    try {
      const result = await importAdvisors(mappedRows);
      revalidateAdvisorPages();
      redirect(
        `/advisors?import_status=success&import_count=${result.importedCount}&import_skipped=${result.skippedCount}`
      );
    } catch {
      redirect("/advisors?import_status=error");
    }
  }

  try {
    advisors = await fetchAllAdvisors();
  } catch (error) {
    advisorsError =
      error instanceof Error ? error.message : "Erro desconhecido ao carregar orientadores.";
  }

  try {
    groups = await fetchAllGroups();
  } catch {
    groups = [];
  }

  const activeAdvisors = advisors.filter((advisor) => advisor.active !== false);
  const activeAdvisorsCount = activeAdvisors.length;
  const inactiveAdvisorsCount = advisors.length - activeAdvisorsCount;
  const advisorsWithGroupCount = activeAdvisors.filter((advisor) =>
    groups.some(
      (group) => idsAreEqual(group.primary_advisor_id, advisor.id) || idsAreEqual(group.co_advisor_id, advisor.id)
    )
  ).length;
  const advisorsWithoutGroupCount = activeAdvisors.length - advisorsWithGroupCount;

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold tca-title-guide">Orientadores</h1>
          <p className="text-gray-600 mt-2">
            Cadastre e gerencie os orientadores dos grupos de TCA.
          </p>
        </header>

        {advisorsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium mb-1">Configuração pendente do módulo de orientadores</p>
            <p className="text-amber-800 text-sm">{advisorsError}</p>
          </div>
        )}

        {import_status === "success" && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">
            <p className="text-green-900 font-medium">Importação concluída com sucesso.</p>
            <p className="text-green-800 text-sm mt-1">
              Registros importados/atualizados: <strong>{import_count || "0"}</strong>
              {" • "}
              Linhas ignoradas: <strong>{import_skipped || "0"}</strong>
            </p>
          </div>
        )}
        {import_status === "invalid_file" && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">Arquivo inválido.</p>
            <p className="text-red-800 text-sm mt-1">Selecione um arquivo CSV para importar.</p>
          </div>
        )}
        {import_status === "invalid_csv" && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">CSV inválido.</p>
            <p className="text-red-800 text-sm mt-1">Use cabeçalho e ao menos uma linha de dados.</p>
          </div>
        )}
        {import_status === "error" && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">Falha na importação.</p>
            <p className="text-red-800 text-sm mt-1">Verifique o formato do arquivo e tente novamente.</p>
          </div>
        )}
        {delete_status === "success" && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">
            <p className="text-green-900 font-medium">Orientador excluído com sucesso.</p>
          </div>
        )}
        {delete_status === "error" && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">Não foi possível excluir o orientador.</p>
            <p className="text-red-800 text-sm mt-1">Se houver vínculo com grupos ou restrição no banco, remova o vínculo antes de tentar novamente.</p>
          </div>
        )}

        {/* Listagem */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Orientadores cadastrados</h2>
          <p className="text-sm text-gray-600">
            Total de orientadores cadastrados: <strong>{advisors.length}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Ativos: <strong>{activeAdvisorsCount}</strong> • Inativos: <strong>{inactiveAdvisorsCount}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Com grupo: <strong>{advisorsWithGroupCount}</strong> • Sem grupo: <strong>{advisorsWithoutGroupCount}</strong>
          </p>

          {advisors.length === 0 ? (
            <p className="text-gray-700">Nenhum orientador cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {advisors.map((advisor) => {
                const advisorStatus = getAdvisorStatus(advisor, groups);

                return (
                <article key={advisor.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-gray-900 leading-tight">{advisor.name}</p>
                      <p className="text-sm text-gray-600 truncate mt-1">{advisor.email}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        advisor.active === false
                          ? "bg-gray-100 text-gray-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {advisor.active === false ? "Inativo" : "Ativo"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${advisorStatus.className}`}>
                      {advisorStatus.label}
                    </span>
                    <span className="text-xs text-gray-500">{advisorStatus.description}</span>
                  </div>

                  {update_status === "success" && update_id === String(advisor.id) && (
                    <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                      Alterações salvas com sucesso.
                    </div>
                  )}
                  {delete_status === "error" && delete_id === String(advisor.id) && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      Não foi possível excluir este orientador.
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Cargo/Função</p>
                      <p className="text-sm text-gray-800 mt-1">{advisor.role_title || "Não informado"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Código funcional</p>
                      <p className="text-sm text-gray-800 mt-1">{advisor.employee_code || "Não informado"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Escola</p>
                      <p className="text-sm text-gray-800 mt-1">{advisor.school || "Não informada"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Área de atuação</p>
                      <p className="text-sm text-gray-800 mt-1">{advisor.area_of_activity || "Não informada"}</p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/advisors?edit_id=${advisor.id}`}
                        className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                      >
                        Editar cadastro
                      </Link>

                      {advisor.active !== false && (
                        <form action={handleDeactivateAdvisor}>
                          <input type="hidden" name="id" value={String(advisor.id)} />
                          <button
                            type="submit"
                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium px-4 py-2 rounded-md text-sm"
                          >
                            Inativar cadastro
                          </button>
                        </form>
                      )}
                    </div>

                    <form action={handleDeleteAdvisor}>
                      <input type="hidden" name="id" value={String(advisor.id)} />
                      <button
                        type="submit"
                        className="bg-red-100 hover:bg-red-200 text-red-900 font-medium px-4 py-2 rounded-md text-sm"
                      >
                        Excluir orientador
                      </button>
                    </form>
                  </div>

                  {edit_id === String(advisor.id) && (
                    <form action={handleUpdateAdvisor} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                      <input type="hidden" name="id" value={String(advisor.id)} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor={`advisor-name-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Nome completo
                          </label>
                          <input
                            id={`advisor-name-${advisor.id}`}
                            name="name"
                            type="text"
                            defaultValue={advisor.name}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`advisor-email-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            E-mail
                          </label>
                          <input
                            id={`advisor-email-${advisor.id}`}
                            name="email"
                            type="email"
                            defaultValue={advisor.email}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`advisor-role-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Cargo/Função
                          </label>
                          <input
                            id={`advisor-role-${advisor.id}`}
                            name="role_title"
                            type="text"
                            defaultValue={advisor.role_title ?? ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`advisor-code-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Código funcional
                          </label>
                          <input
                            id={`advisor-code-${advisor.id}`}
                            name="employee_code"
                            type="text"
                            defaultValue={advisor.employee_code ?? ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`advisor-school-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Escola
                          </label>
                          <input
                            id={`advisor-school-${advisor.id}`}
                            name="school"
                            type="text"
                            defaultValue={advisor.school ?? ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`advisor-area-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Área de atuação
                          </label>
                          <input
                            id={`advisor-area-${advisor.id}`}
                            name="area_of_activity"
                            type="text"
                            defaultValue={advisor.area_of_activity ?? ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`advisor-max-${advisor.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Máx. orientações simultâneas
                          </label>
                          <input
                            id={`advisor-max-${advisor.id}`}
                            name="max_orientacoes"
                            type="number"
                            min="1"
                            max="99"
                            defaultValue={advisor.max_orientacoes ?? 5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
                        >
                          Salvar alterações
                        </button>

                        <Link
                          href="/advisors"
                          className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                        >
                          Cancelar edição
                        </Link>
                      </div>
                    </form>
                  )}
                </article>
              )})}
            </div>
          )}
        </div>

        {/* Formulário de cadastro */}
        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mt-8">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Cadastrar orientador</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Abra este bloco apenas quando for incluir um novo orientador no sistema.
                </p>
              </div>

              <span className="inline-flex items-center rounded-md bg-lime-700 px-4 py-2 text-sm font-medium text-white hover:bg-lime-800">
                Cadastrar orientador
              </span>
            </summary>

            <form action={handleCreateAdvisor} className="space-y-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ex.: Prof. João da Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Ex.: joao.silva@escola.edu.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role_title" className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo/Função
                  </label>
                  <input
                    id="role_title"
                    name="role_title"
                    type="text"
                    placeholder="Ex.: Professor de Ciências"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                  />
                </div>

                <div>
                  <label htmlFor="employee_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Código funcional
                  </label>
                  <input
                    id="employee_code"
                    name="employee_code"
                    type="text"
                    placeholder="Ex.: 123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1">
                    Escola
                  </label>
                  <input
                    id="school"
                    name="school"
                    type="text"
                    placeholder="Ex.: EMEF Exemplo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                  />
                </div>

                <div>
                  <label htmlFor="area_of_activity" className="block text-sm font-medium text-gray-700 mb-1">
                    Área de atuação
                  </label>
                  <input
                    id="area_of_activity"
                    name="area_of_activity"
                    type="text"
                    placeholder="Ex.: Ciências da Natureza"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div className="max-w-xs">
                <label htmlFor="max_orientacoes" className="block text-sm font-medium text-gray-700 mb-1">
                  Máx. de orientações simultâneas
                </label>
                <input
                  id="max_orientacoes"
                  name="max_orientacoes"
                  type="number"
                  min="1"
                  max="99"
                  placeholder="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                <p className="text-xs text-gray-500 mt-1">Padrão: 5. Define quantos grupos este orientador pode assumir como orientador principal ao mesmo tempo.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
                >
                  Salvar orientador
                </button>

                <Link
                  href="/dashboard"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
                >
                  Voltar ao dashboard
                </Link>
              </div>
            </form>
          </details>
        </div>

        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Importar orientadores por arquivo</h2>
          <p className="text-sm text-gray-600 mb-4">
            Envie um CSV com colunas como: <code>name,email,role_title,employee_code,school,area_of_activity,max_orientacoes</code>
            {" "}(também aceitamos: <code>nome,cargo,codigo_funcional,escola,area_atuacao,maximo_orientacoes</code>).
          </p>

          <form action={handleImportAdvisors} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="import_file" className="block text-sm font-medium text-gray-700 mb-1">
                Arquivo CSV
              </label>
              <input
                id="import_file"
                name="import_file"
                type="file"
                accept=".csv,text/csv,.txt"
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 hover:file:bg-gray-200"
              />
            </div>

            <button
              type="submit"
              className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
            >
              Importar CSV
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
