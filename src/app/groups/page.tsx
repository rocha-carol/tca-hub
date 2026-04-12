import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import { buildStableGroupNumberMap, getNextGeneratedGroupNumber } from "@/lib/utils/group-number";
import { resolveDisplayedGroupTheme } from "@/lib/utils/group-theme-label";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { createGroup, fetchAllGroups, fetchGroupsVisibleToProfile } from "@/services/group-service";
import { fetchThemeSectionContentMap } from "@/services/project-section-service";
import { fetchAllStudents } from "@/services/student-service";
import CoordinatorGroupMembersBuilder from "@/components/groups/CoordinatorGroupMembersBuilder";
import type { Advisor } from "@/types/advisor";
import type { Group, GroupStatus } from "@/types/group";
import type { Student } from "@/types/student";

function getStatusLabel(status: GroupStatus) {
  if (status === "planejamento") return "Planejamento";
  if (status === "em_andamento") return "Em andamento";
  return "Concluído";
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

  if (profile?.role === "advisor") {
    redirect("/advisor/dashboard");
  }

  if (!profile) {
    redirect("/auth/login");
  }

  let groups: Group[] = [];
  let groupsError: string | null = null;
  let students: Student[] = [];
  let studentsError: string | null = null;
  let advisors: Advisor[] = [];

  const params = searchParams ? await searchParams : {};
  const rawStatus = params.status ?? "all";
  const fromCoordinator = params.from === "coordinator";
  const currentFilter: "all" | GroupStatus =
    rawStatus === "planejamento" || rawStatus === "em_andamento" || rawStatus === "concluido"
      ? rawStatus
      : "all";

  async function handleCreateGroup(formData: FormData) {
    "use server";

    const rawPayload = String(formData.get("members_payload") ?? "[]");

    let parsedMembers: Array<{ id: string | number; name: string; grade?: string | null }> = [];
    try {
      const parsed = JSON.parse(rawPayload);
      parsedMembers = Array.isArray(parsed) ? parsed : [];
    } catch {
      redirect("/groups");
    }

    if (parsedMembers.length === 0 || parsedMembers.length > 5) {
      redirect("/groups");
    }

    let availableStudents: Student[] = [];
    let allGroups: Group[] = [];
    try {
      availableStudents = await fetchAllStudents();
      allGroups = await fetchAllGroups();
    } catch {
      redirect("/groups");
    }

    const selectedIds = parsedMembers.map((member) => String(member.id));
    const uniqueIds = new Set(selectedIds);

    if (uniqueIds.size !== selectedIds.length) {
      redirect("/groups");
    }

    const resolvedMembers = parsedMembers.map((member) =>
      availableStudents.find((student) => String(student.id) === String(member.id)) ?? null
    );

    const firstMember = resolvedMembers[0];

    if (!firstMember?.name || !firstMember.grade) {
      redirect("/groups");
    }

    const generatedGroupName = `Grupo ${getNextGeneratedGroupNumber(allGroups)}`;

    await createGroup({
      student_1_id: firstMember.id,
      member_1_name: firstMember.name,
      member_1_series: firstMember.grade,
      student_2_id: resolvedMembers[1]?.id ?? null,
      member_2_name: resolvedMembers[1]?.name ?? null,
      member_2_series: resolvedMembers[1]?.grade ?? null,
      student_3_id: resolvedMembers[2]?.id ?? null,
      member_3_name: resolvedMembers[2]?.name ?? null,
      member_3_series: resolvedMembers[2]?.grade ?? null,
      student_4_id: resolvedMembers[3]?.id ?? null,
      member_4_name: resolvedMembers[3]?.name ?? null,
      member_4_series: resolvedMembers[3]?.grade ?? null,
      student_5_id: resolvedMembers[4]?.id ?? null,
      member_5_name: resolvedMembers[4]?.name ?? null,
      member_5_series: resolvedMembers[4]?.grade ?? null,
      theme: generatedGroupName,
      description: null,
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

  try {
    advisors = await fetchAllAdvisors();
  } catch {
    advisors = [];
  }

  const activeStudents = students.filter((student) => student.active !== false);

  const filteredGroups =
    currentFilter === "all"
      ? groups
      : groups.filter((group) => (group.status || "planejamento") === currentFilter);

  let themeSectionContentMap = new Map<string, string | null>();
  try {
    themeSectionContentMap = await fetchThemeSectionContentMap(filteredGroups.map((group) => String(group.id)));
  } catch {
    themeSectionContentMap = new Map();
  }

  const stableGroupNumberMap = buildStableGroupNumberMap(groups);

  const orderedGroups = [...filteredGroups]
    .map((group) => ({
      group,
      numericLabel: stableGroupNumberMap.get(String(group.id)) ?? 0,
    }))
    .sort((left, right) => left.numericLabel - right.numericLabel);

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
              Selecione estudantes cadastrados para compor o grupo. O número do grupo será gerado automaticamente ao salvar.
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {orderedGroups.map(({ group, numericLabel }) => (
                <article key={group.id} className="border border-gray-200 rounded-md p-4 bg-white">
                  {(() => {
                    const primaryAdvisor = advisors.find((advisor) => String(advisor.id) === String(group.primary_advisor_id ?? ""));
                    const coAdvisor = advisors.find((advisor) => String(advisor.id) === String(group.co_advisor_id ?? ""));

                    return (
                      <>
                  <h3 className="font-semibold text-gray-900 mb-2">Grupo {numericLabel}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Status: {getStatusLabel((group.status as GroupStatus) || "planejamento")}
                  </p>
                  <p className="text-xs text-lime-700 mb-1">
                    Orientador: {primaryAdvisor?.name || "a definir"}
                  </p>
                  {coAdvisor && (
                    <p className="text-xs text-lime-700 mb-2">
                      Coorientador: {coAdvisor.name}
                    </p>
                  )}
                  <ul className="text-sm text-gray-800 space-y-0.5">
                    <li>{group.member_1_name} — {group.member_1_series}</li>
                    {group.member_2_name && (
                      <li>{group.member_2_name} — {group.member_2_series || "Sem série"}</li>
                    )}
                    {group.member_3_name && (
                      <li>{group.member_3_name} — {group.member_3_series || "Sem série"}</li>
                    )}
                    {group.member_4_name && (
                      <li>{group.member_4_name} — {group.member_4_series || "Sem série"}</li>
                    )}
                    {group.member_5_name && (
                      <li>{group.member_5_name} — {group.member_5_series || "Sem série"}</li>
                    )}
                  </ul>
                  <p className="text-sm text-gray-500 mt-2">
                    Tema: {resolveDisplayedGroupTheme({
                      storedTheme: group.theme,
                      themeSectionContent: themeSectionContentMap.get(String(group.id)) ?? null,
                    })}
                  </p>
                  <div className="mt-3">
                    <Link
                      href={`/groups/${group.id}`}
                      className="text-lime-700 hover:underline text-sm font-medium"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </div>

        <details className="group mt-8">
          <summary className="list-none">
            <span className="inline-flex cursor-pointer items-center rounded-md bg-lime-700 px-4 py-2 text-sm font-medium text-white hover:bg-lime-800">
              Criar novo grupo
            </span>
          </summary>

          <div className="tca-soft-surface rounded-lg p-6 shadow-sm mt-4">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">Novo grupo</p>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">Criar novo grupo</h2>
              <p className="text-sm text-gray-600 leading-relaxed mt-2">
                Selecione estudantes cadastrados para montar o grupo de forma simples.
              </p>
            </div>

            <form action={handleCreateGroup} className="space-y-4">
              <CoordinatorGroupMembersBuilder
                students={activeStudents.map((student) => ({
                  id: student.id,
                  name: student.name,
                  grade: student.grade,
                }))}
                maxMembers={5}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
                >
                  Salvar grupo
                </button>
              </div>
            </form>
          </div>
        </details>
      </section>
    </main>
  );
}
