import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import { createGroup, fetchAllGroups, fetchGroupsVisibleToProfile } from "@/services/group-service";
import { fetchAllStudents } from "@/services/student-service";
import type { Group, GroupStatus } from "@/types/group";
import type { Student } from "@/types/student";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
}

function normalizeSelectedStudentId(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return null;
  }

  return /^\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

interface GroupsPageProps {
  searchParams?: Promise<{ status?: string; from?: string }>;
}

/**
 * Página inicial de Grupos (MVP).
 *
 * Esta etapa entrega uma base navegável do módulo,
 * com estado vazio e CTA para criação futura de grupo.
 */
export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const profile = await getAuthenticatedProfile();

  if (profile?.role === "student") {
    redirect(STUDENT_ROUTES.HOME);
  }

  if (!profile) {
    redirect("/auth/login");
  }

  let groups: Group[] = [];
  let groupsError: string | null = null;
  let students: Student[] = [];
  let studentsError: string | null = null;

  const params = searchParams ? await searchParams : {};
  const rawStatus = params.status ?? "all";
  const fromCoordinator = params.from === "coordinator";
  const currentFilter: "all" | GroupStatus =
    rawStatus === "planejamento" || rawStatus === "em_andamento" || rawStatus === "concluido"
      ? rawStatus
      : "all";

  async function handleCreateGroup(formData: FormData) {
    "use server";

    const selectedStudent1Id = normalizeSelectedStudentId(formData.get("student_1_id"));
    const selectedStudent2Id = normalizeSelectedStudentId(formData.get("student_2_id"));
    const selectedStudent3Id = normalizeSelectedStudentId(formData.get("student_3_id"));
    const member1Name = String(formData.get("member_1_name") ?? "").trim();
    const member1Series = String(formData.get("member_1_series") ?? "").trim();
    const member2Name = String(formData.get("member_2_name") ?? "").trim();
    const member2Series = String(formData.get("member_2_series") ?? "").trim();
    const member3Name = String(formData.get("member_3_name") ?? "").trim();
    const member3Series = String(formData.get("member_3_series") ?? "").trim();
    const theme = String(formData.get("theme") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    const selectedIds = [selectedStudent1Id, selectedStudent2Id, selectedStudent3Id].filter(
      (value): value is string | number => value !== null
    );
    const uniqueIds = new Set(selectedIds.map((value) => String(value)));

    if (uniqueIds.size !== selectedIds.length) {
      redirect("/groups");
    }

    let availableStudents: Student[] = [];
    try {
      availableStudents = await fetchAllStudents();
    } catch {
      availableStudents = [];
    }

    const linkedStudent1 = availableStudents.find((student) => idsAreEqual(student.id, selectedStudent1Id));
    const linkedStudent2 = availableStudents.find((student) => idsAreEqual(student.id, selectedStudent2Id));
    const linkedStudent3 = availableStudents.find((student) => idsAreEqual(student.id, selectedStudent3Id));

    const resolvedMember1Name = linkedStudent1?.name ?? member1Name;
    const resolvedMember1Series = linkedStudent1?.grade ?? member1Series;
    const resolvedMember2Name = linkedStudent2?.name ?? (member2Name || null);
    const resolvedMember2Series = linkedStudent2?.grade ?? (member2Series || null);
    const resolvedMember3Name = linkedStudent3?.name ?? (member3Name || null);
    const resolvedMember3Series = linkedStudent3?.grade ?? (member3Series || null);

    if (!resolvedMember1Name || resolvedMember1Name.length < 3 || !resolvedMember1Series) {
      redirect("/groups");
    }

    await createGroup({
      student_1_id: selectedStudent1Id,
      member_1_name: resolvedMember1Name,
      member_1_series: resolvedMember1Series,
      student_2_id: selectedStudent2Id,
      member_2_name: resolvedMember2Name,
      member_2_series: resolvedMember2Series,
      student_3_id: selectedStudent3Id,
      member_3_name: resolvedMember3Name,
      member_3_series: resolvedMember3Series,
      theme: theme || null,
      description: description || null,
    });

    revalidatePath("/groups");
    redirect("/groups");
  }

  try {
    groups = profile.role === "coordinator"
      ? await fetchAllGroups()
      : await fetchGroupsVisibleToProfile(profile);
  } catch (error) {
    groupsError = error instanceof Error ? error.message : "Erro desconhecido ao carregar grupos.";
  }

  try {
    students = await fetchAllStudents();
  } catch (error) {
    studentsError = error instanceof Error ? error.message : "Erro desconhecido ao carregar estudantes.";
  }

  const activeStudents = students.filter((student) => student.active !== false);

  const filteredGroups =
    currentFilter === "all"
      ? groups
      : groups.filter((group) => (group.status || "planejamento") === currentFilter);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold tca-title-guide">Grupos</h1>
          <p className="text-gray-600 mt-2">
            Organize os membros e acompanhe os grupos de TCA.
          </p>
        </header>

        {fromCoordinator && (
          <div className="bg-lime-50 border border-lime-200 rounded-lg p-4 mb-6">
            <p className="text-lime-900 font-medium">Modo coordenador: criação manual de grupos</p>
            <p className="text-lime-800 text-sm mt-1">
              Selecione estudantes cadastrados ou preencha manualmente os integrantes para criar um grupo.
            </p>
          </div>
        )}

        {groupsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium mb-1">Configuração pendente do módulo de grupos</p>
            <p className="text-amber-800 text-sm">{groupsError}</p>
          </div>
        )}

        {studentsError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 font-medium mb-1">Vinculação com estudantes ainda indisponível</p>
            <p className="text-yellow-800 text-sm">{studentsError}</p>
            <p className="text-yellow-700 text-sm mt-2">
              Enquanto isso, a criação manual de grupos continua disponível.
            </p>
          </div>
        )}

        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrantes do grupo e série</h2>

          <form action={handleCreateGroup} className="space-y-3">
            <div>
              <label htmlFor="member_1_name" className="block text-sm font-medium text-gray-700 mb-1">
                Integrante 1 *
              </label>
              <div className="mb-3">
                <label htmlFor="student_1_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Vincular estudante cadastrado
                </label>
                <select
                  id="student_1_id"
                  name="student_1_id"
                  defaultValue=""
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value="">— Selecionar estudante cadastrado —</option>
                  {activeStudents.map((student) => (
                    <option key={student.id} value={String(student.id)}>
                      {student.name} {student.grade ? `— ${student.grade}` : "— Série não informada"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="member_1_name"
                  name="member_1_name"
                  type="text"
                  placeholder="Nome do integrante 1 (ou preenchimento manual)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                <input
                  id="member_1_series"
                  name="member_1_series"
                  type="text"
                  placeholder="Série do integrante 1 (ou preenchimento manual)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="member_2_name" className="block text-sm font-medium text-gray-700 mb-1">
                Integrante 2
              </label>
              <div className="mb-3">
                <label htmlFor="student_2_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Vincular estudante cadastrado
                </label>
                <select
                  id="student_2_id"
                  name="student_2_id"
                  defaultValue=""
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value="">— Opcional —</option>
                  {activeStudents.map((student) => (
                    <option key={student.id} value={String(student.id)}>
                      {student.name} {student.grade ? `— ${student.grade}` : "— Série não informada"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="member_2_name"
                  name="member_2_name"
                  type="text"
                  placeholder="Nome do integrante 2 (ou preenchimento manual)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                <input
                  id="member_2_series"
                  name="member_2_series"
                  type="text"
                  placeholder="Série do integrante 2 (ou preenchimento manual)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="member_3_name" className="block text-sm font-medium text-gray-700 mb-1">
                Integrante 3
              </label>
              <div className="mb-3">
                <label htmlFor="student_3_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Vincular estudante cadastrado
                </label>
                <select
                  id="student_3_id"
                  name="student_3_id"
                  defaultValue=""
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value="">— Opcional —</option>
                  {activeStudents.map((student) => (
                    <option key={student.id} value={String(student.id)}>
                      {student.name} {student.grade ? `— ${student.grade}` : "— Série não informada"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="member_3_name"
                  name="member_3_name"
                  type="text"
                  placeholder="Nome do integrante 3 (ou preenchimento manual)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                <input
                  id="member_3_series"
                  name="member_3_series"
                  type="text"
                  placeholder="Série do integrante 3 (ou preenchimento manual)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
                Tema do projeto
              </label>
              <input
                id="theme"
                name="theme"
                type="text"
                placeholder="Ex.: Sustentabilidade na escola"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do projeto
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Descreva brevemente o projeto do grupo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
              >
                Criar grupo
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

        <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Grupos cadastrados</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <Link
              href="/groups"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "all"
                  ? "bg-lime-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Todos
            </Link>
            <Link
              href="/groups?status=planejamento"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "planejamento"
                  ? "bg-lime-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Planejamento
            </Link>
            <Link
              href="/groups?status=em_andamento"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "em_andamento"
                  ? "bg-lime-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Em andamento
            </Link>
            <Link
              href="/groups?status=concluido"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                currentFilter === "concluido"
                  ? "bg-lime-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Concluído
            </Link>
          </div>

          {filteredGroups.length === 0 ? (
            <p className="text-gray-700">Nenhum grupo encontrado para este filtro.</p>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group, index) => (
                <article key={group.id} className="border border-gray-200 rounded-md p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Grupo {filteredGroups.length - index}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Status: {getStatusLabel((group.status as GroupStatus) || "planejamento")}
                  </p>
                  <p className="text-xs text-lime-700 mb-2">
                    Estudantes vinculados: {[group.student_1_id, group.student_2_id, group.student_3_id].filter(Boolean).length}
                  </p>
                  <ul className="text-sm text-gray-800 space-y-0.5">
                    <li>{group.member_1_name} — {group.member_1_series}</li>
                    {group.member_2_name && (
                      <li>{group.member_2_name} — {group.member_2_series || "Sem série"}</li>
                    )}
                    {group.member_3_name && (
                      <li>{group.member_3_name} — {group.member_3_series || "Sem série"}</li>
                    )}
                  </ul>
                  {group.theme && (
                    <p className="text-sm text-gray-500 mt-2">Tema: {group.theme}</p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={`/groups/${group.id}`}
                      className="text-lime-700 hover:underline text-sm font-medium"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
