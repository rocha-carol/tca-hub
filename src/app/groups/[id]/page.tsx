import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchGroupById, updateGroupAdvisors, updateGroupStatus } from "@/services/group-service";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchAllStudents } from "@/services/student-service";
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

function renderMemberCard(
  label: string,
  name: string,
  series: string | null,
  linkedStudent: Student | undefined
) {
  return (
    <div className="flex items-center justify-between border border-gray-100 rounded-md px-4 py-3 bg-gray-50">
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-600">{series || "Série não informada"}</p>
        {linkedStudent && (
          <p className="text-xs text-blue-700 mt-1">
            Cadastro vinculado • Matrícula: {linkedStudent.registration_code || "Não informada"}
          </p>
        )}
      </div>
      <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Página de detalhe de um grupo.
 *
 * Permite visualizar todos os dados do grupo e associar orientadores
 * via seletor com os orientadores cadastrados no sistema.
 */
export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = await params;

  async function handleAssignAdvisors(formData: FormData) {
    "use server";

    const primaryAdvisorId = String(formData.get("primary_advisor_id") ?? "").trim() || null;
    const coAdvisorId = String(formData.get("co_advisor_id") ?? "").trim() || null;

    await updateGroupAdvisors(id, primaryAdvisorId, coAdvisorId);

    revalidatePath(`/groups/${id}`);
    redirect(`/groups/${id}`);
  }

  async function handleUpdateStatus(formData: FormData) {
    "use server";

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

  let group;
  try {
    group = await fetchGroupById(id);
  } catch {
    return (
      <main className="min-h-screen bg-gray-50">
        <section className="max-w-2xl mx-auto px-6 py-10">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium">Erro ao carregar o grupo.</p>
            <p className="text-amber-800 text-sm mt-1">
              Verifique se a tabela de grupos foi criada no Supabase.
            </p>
          </div>
          <Link href="/groups" className="text-blue-600 hover:underline text-sm">
            ← Voltar para grupos
          </Link>
        </section>
      </main>
    );
  }

  if (!group) {
    notFound();
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

  // Resolve nome dos orientadores vinculados
  const primaryAdvisor = advisors.find((a) => a.id === group.primary_advisor_id);
  const coAdvisor = advisors.find((a) => a.id === group.co_advisor_id);
  const linkedStudent1 = students.find((student) => idsAreEqual(student.id, group.student_1_id));
  const linkedStudent2 = students.find((student) => idsAreEqual(student.id, group.student_2_id));
  const linkedStudent3 = students.find((student) => idsAreEqual(student.id, group.student_3_id));
  const currentStatus: GroupStatus =
    group.status === "em_andamento" || group.status === "concluido"
      ? group.status
      : "planejamento";

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-8">
          <Link href="/groups" className="text-blue-600 hover:underline text-sm">
            ← Voltar para grupos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Detalhe do grupo</h1>
          <p className="text-gray-500 text-sm mt-1">ID: {group.id}</p>
        </header>

        {/* Integrantes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrantes</h2>

          <div className="space-y-3">
            {renderMemberCard("Integrante 1", group.member_1_name, group.member_1_series, linkedStudent1)}

            {group.member_2_name && (
              renderMemberCard("Integrante 2", group.member_2_name, group.member_2_series, linkedStudent2)
            )}

            {group.member_3_name && (
              renderMemberCard("Integrante 3", group.member_3_name, group.member_3_series, linkedStudent3)
            )}
          </div>
        </div>

        {/* Projeto */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
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

            <form action={handleUpdateStatus} className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label htmlFor="status" className="block text-sm text-gray-600 mb-1">
                  Atualizar status do grupo
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={currentStatus}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Salvar status
              </button>
            </form>
          </div>
        </div>

        {/* Orientação */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
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
          </div>

          {/* Formulário de associação */}
          {advisors.length > 0 ? (
            <form action={handleAssignAdvisors} className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700">Atualizar orientadores:</p>

              <div>
                <label htmlFor="primary_advisor_id" className="block text-sm text-gray-600 mb-1">
                  Orientador principal
                </label>
                <select
                  id="primary_advisor_id"
                  name="primary_advisor_id"
                  defaultValue={group.primary_advisor_id ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Salvar orientadores
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
              Nenhum orientador cadastrado.{" "}
              <Link href="/advisors" className="text-blue-600 hover:underline">
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

