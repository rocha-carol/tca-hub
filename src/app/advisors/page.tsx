import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdvisor,
  deactivateAdvisor,
  fetchAllAdvisors,
  updateAdvisor,
} from "@/services/advisor-service";
import type { Advisor } from "@/types/advisor";

/**
 * Página de Orientadores (MVP).
 *
 * Permite cadastrar e listar orientadores.
 * Associação com grupos será feita em etapa futura.
 */
export default async function AdvisorsPage() {
  let advisors: Advisor[] = [];
  let advisorsError: string | null = null;

  async function handleCreateAdvisor(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const roleTitle = String(formData.get("role_title") ?? "").trim();
    const employeeCode = String(formData.get("employee_code") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const areaOfActivity = String(formData.get("area_of_activity") ?? "").trim();

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
    });

    revalidatePath("/advisors");
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
    });

    revalidatePath("/advisors");
    redirect("/advisors");
  }

  async function handleDeactivateAdvisor(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      redirect("/advisors");
    }

    await deactivateAdvisor(id);

    revalidatePath("/advisors");
    redirect("/advisors");
  }

  try {
    advisors = await fetchAllAdvisors();
  } catch (error) {
    advisorsError =
      error instanceof Error ? error.message : "Erro desconhecido ao carregar orientadores.";
  }

  const activeAdvisorsCount = advisors.filter((advisor) => advisor.active !== false).length;
  const inactiveAdvisorsCount = advisors.length - activeAdvisorsCount;

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orientadores</h1>
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

        {/* Formulário de cadastro */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cadastrar orientador</h2>

          <form action={handleCreateAdvisor} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex.: Prof. João da Silva"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
              >
                Cadastrar orientador
              </button>

              <Link
                href="/dashboard"
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
              >
                Voltar ao dashboard
              </Link>
            </div>
          </form>
        </div>

        {/* Listagem */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Orientadores cadastrados</h2>
          <p className="text-sm text-gray-600">
            Total de orientadores cadastrados: <strong>{advisors.length}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Ativos: <strong>{activeAdvisorsCount}</strong> • Inativos: <strong>{inactiveAdvisorsCount}</strong>
          </p>

          {advisors.length === 0 ? (
            <p className="text-gray-700">Nenhum orientador cadastrado ainda.</p>
          ) : (
            <div className="space-y-4">
              {advisors.map((advisor) => (
                <article key={advisor.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{advisor.name}</p>
                      <p className="text-sm text-gray-600">{advisor.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-gray-400">ID: {String(advisor.id).slice(0, 8)}…</span>
                      <span
                        className={`inline-flex mt-2 rounded-full px-2 py-1 text-xs font-semibold ${
                          advisor.active === false
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {advisor.active === false ? "Inativo" : "Ativo"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <p className="text-gray-700">
                      <strong>Cargo/Função:</strong> {advisor.role_title || "Não informado"}
                    </p>
                    <p className="text-gray-700">
                      <strong>Código funcional:</strong> {advisor.employee_code || "Não informado"}
                    </p>
                    <p className="text-gray-700">
                      <strong>Escola:</strong> {advisor.school || "Não informada"}
                    </p>
                    <p className="text-gray-700">
                      <strong>Área de atuação:</strong> {advisor.area_of_activity || "Não informada"}
                    </p>
                  </div>

                  <form action={handleUpdateAdvisor} className="mt-4 border-t border-gray-100 pt-4 space-y-3">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </form>

                  {advisor.active !== false && (
                    <form action={handleDeactivateAdvisor} className="mt-3">
                      <input type="hidden" name="id" value={String(advisor.id)} />
                      <button
                        type="submit"
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium px-4 py-2 rounded-md text-sm"
                      >
                        Inativar cadastro
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
