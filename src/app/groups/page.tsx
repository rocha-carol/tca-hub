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

interface MemberFormSectionProps {
  index: 1 | 2 | 3;
  required?: boolean;
  students: Student[];
}

function MemberFormSection({ index, required = false, students }: MemberFormSectionProps) {
  const studentFieldName = `student_${index}_id`;
  const memberNameFieldName = `member_${index}_name`;
  const memberSeriesFieldName = `member_${index}_series`;

  return (
    <div className="rounded-2xl border border-[#E3EDE0] bg-white px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1F2937]">
            {required ? "Integrante principal" : `Integrante opcional ${index}`}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">
            Selecione um estudante cadastrado ou preencha manualmente nome e série.
          </p>
        </div>

        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${required ? "bg-lime-100 text-lime-800" : "bg-gray-100 text-gray-600"}`}>
          {required ? "Obrigatório" : "Opcional"}
        </span>
      </div>

      <div className="space-y-3">
        <select
          id={studentFieldName}
          name={studentFieldName}
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
        >
          <option value="">{required ? "— Selecionar estudante cadastrado —" : "— Nenhum estudante vinculado —"}</option>
          {students.map((student) => (
            <option key={student.id} value={String(student.id)}>
              {student.name} {student.grade ? `— ${student.grade}` : "— Série não informada"}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            id={memberNameFieldName}
            name={memberNameFieldName}
            type="text"
            placeholder={`Nome do integrante ${index}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
          />
          <input
            id={memberSeriesFieldName}
            name={memberSeriesFieldName}
            type="text"
            placeholder={`Série do integrante ${index}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
          />
        </div>
      </div>
    </div>
  );
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

        <div className="tca-soft-surface rounded-lg p-6 shadow-sm mt-8">
          <div className="mb-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">Novo grupo</p>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">Criar grupo manualmente</h2>
              <p className="text-sm text-gray-600 leading-relaxed mt-2">
                Comece pelo integrante principal e pelos dados iniciais do projeto. Os demais integrantes podem ser adicionados aqui sem deixar o formulário mais pesado do que precisa.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#DCEBD5] bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Estrutura</p>
                <p className="text-sm font-semibold text-[#1F2937] mt-2">1 integrante obrigatório</p>
              </div>
              <div className="rounded-2xl border border-[#DCEBD5] bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Composição</p>
                <p className="text-sm font-semibold text-[#1F2937] mt-2">Até 3 integrantes neste formulário</p>
              </div>
              <div className="rounded-2xl border border-[#DCEBD5] bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Projeto</p>
                <p className="text-sm font-semibold text-[#1F2937] mt-2">Tema e descrição iniciais</p>
              </div>
            </div>
          </div>

          <form action={handleCreateGroup} className="space-y-4">
            <MemberFormSection index={1} required students={activeStudents} />

            <details className="rounded-2xl border border-[#DCEBD5] bg-white px-4 py-4 shadow-sm">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">Adicionar integrantes opcionais</p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Abra este bloco apenas se o grupo já tiver mais participantes definidos.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    Até 2 extras
                  </span>
                </div>
              </summary>

              <div className="mt-4 space-y-4">
                <MemberFormSection index={2} students={activeStudents} />
                <MemberFormSection index={3} students={activeStudents} />
              </div>
            </details>

            <div className="rounded-2xl border border-[#E3EDE0] bg-white px-4 py-4 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#1F2937]">Dados iniciais do projeto</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Estes campos ajudam a identificar rapidamente o grupo na organização do TCA.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  id="theme"
                  name="theme"
                  type="text"
                  placeholder="Tema do projeto — ex.: Sustentabilidade na escola"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />

                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Descrição breve do projeto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
              >
                Criar novo grupo
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
      </section>
    </main>
  );
}
