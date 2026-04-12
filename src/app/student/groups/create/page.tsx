import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { getNextGeneratedGroupNumber } from "@/lib/utils/group-number";
import { createGroup, fetchAllGroups } from "@/services/group-service";
import { fetchAllStudents, resolveStudentByAuthIdentity } from "@/services/student-service";
import StudentGroupMembersBuilder from "@/components/student/StudentGroupMembersBuilder";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

function normalizeStudentId(value: string | number) {
  return typeof value === "number" ? value : /^\d+$/.test(value) ? Number(value) : value;
}

interface AddedMemberPayload {
  id: string;
  name: string;
  registrationCode: string;
  year: string;
}

interface StudentCreateGroupPageProps {
  searchParams?: Promise<{ erro?: string }>;
}

export default async function StudentCreateGroupPage({ searchParams }: StudentCreateGroupPageProps) {
  const params = searchParams ? await searchParams : {};

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();
  if (profile?.role !== "student") {
    redirect("/dashboard");
  }

  let allStudents = [] as Awaited<ReturnType<typeof fetchAllStudents>>;
  let allGroups = [] as Awaited<ReturnType<typeof fetchAllGroups>>;

  try {
    allStudents = await fetchAllStudents();
  } catch {
    allStudents = [];
  }

  try {
    allGroups = await fetchAllGroups();
  } catch {
    allGroups = [];
  }

  const currentStudent = await resolveStudentByAuthIdentity({
    profileId: user.id,
    email: user.email,
    name: profile?.name || user.email,
    allowCreateIfMissing: true,
  }).catch(() => allStudents.find((student) => student.profile_id === user.id) ?? null);
  const nextGroupNumber = getNextGeneratedGroupNumber(allGroups);

  async function handleCreateStudentGroup(formData: FormData) {
    "use server";

    const authenticatedUser = await getAuthenticatedUser();
    const authenticatedProfile = await getAuthenticatedProfile();

    if (!authenticatedUser || authenticatedProfile?.role !== "student") {
      redirect("/auth/login");
    }

    let students = [] as Awaited<ReturnType<typeof fetchAllStudents>>;
    let groups = [] as Awaited<ReturnType<typeof fetchAllGroups>>;

    try {
      students = await fetchAllStudents();
      groups = await fetchAllGroups();
    } catch {
      redirect(`${STUDENT_ROUTES.GROUP_CREATE}?erro=students`);
    }

    const loggedStudent = await resolveStudentByAuthIdentity({
      profileId: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedProfile?.name || authenticatedUser.email,
      allowCreateIfMissing: true,
    });

    if (!loggedStudent) {
      redirect(`${STUDENT_ROUTES.GROUP_CREATE}?erro=perfil`);
    }

    const rawPayload = String(formData.get("members_payload") ?? "[]");

    let parsedMembers: AddedMemberPayload[] = [];
    try {
      const parsed = JSON.parse(rawPayload);
      parsedMembers = Array.isArray(parsed) ? parsed : [];
    } catch {
      redirect(`${STUDENT_ROUTES.GROUP_CREATE}?erro=formato`);
    }

    if (parsedMembers.length > 4) {
      redirect(`${STUDENT_ROUTES.GROUP_CREATE}?erro=limite`);
    }

    const selectedIds = [String(loggedStudent.id), ...parsedMembers.map((member) => String(member.id))];
    if (new Set(selectedIds).size !== selectedIds.length) {
      redirect(`${STUDENT_ROUTES.GROUP_CREATE}?erro=duplicado`);
    }

    const member2 = parsedMembers[0]
      ? students.find((student) => String(student.id) === String(parsedMembers[0].id)) ?? null
      : null;

    const member3 = parsedMembers[1]
      ? students.find((student) => String(student.id) === String(parsedMembers[1].id)) ?? null
      : null;

    const member4 = parsedMembers[2]
      ? students.find((student) => String(student.id) === String(parsedMembers[2].id)) ?? null
      : null;

    const member5 = parsedMembers[3]
      ? students.find((student) => String(student.id) === String(parsedMembers[3].id)) ?? null
      : null;

    const generatedGroupName = `Grupo ${getNextGeneratedGroupNumber(groups)}`;

    await createGroup({
      student_1_id: normalizeStudentId(loggedStudent.id),
      member_1_name: loggedStudent.name,
      member_1_series: loggedStudent.grade || "Não informado",
      student_2_id: member2 ? normalizeStudentId(member2.id) : null,
      member_2_name: member2?.name || null,
      member_2_series: member2?.grade || null,
      student_3_id: member3 ? normalizeStudentId(member3.id) : null,
      member_3_name: member3?.name || null,
      member_3_series: member3?.grade || null,
      student_4_id: member4 ? normalizeStudentId(member4.id) : null,
      member_4_name: member4?.name || null,
      member_4_series: member4?.grade || null,
      student_5_id: member5 ? normalizeStudentId(member5.id) : null,
      member_5_name: member5?.name || null,
      member_5_series: member5?.grade || null,
      theme: generatedGroupName,
      description: null,
      status: "planejamento",
    });

    revalidatePath("/groups");
    revalidatePath(STUDENT_ROUTES.HOME);
    revalidatePath(STUDENT_ROUTES.GROUP_STATUS);
    revalidatePath(STUDENT_ROUTES.LEGACY_NAMESPACE_HOME);
    revalidatePath(STUDENT_ROUTES.LEGACY_GROUP_STATUS);
    redirect(`${STUDENT_ROUTES.GROUP_STATUS}?created=1`);
  }

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold tca-title-guide">Criar grupo</h1>
          <p className="text-gray-600 mt-2">
            O representante inicia o grupo e adiciona colegas por RA ou nome completo e ano.
          </p>
          <p className="text-sm text-gray-500 mt-1">Ordem geral atual: <strong>Grupo {nextGroupNumber}</strong></p>
        </header>

        <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
          <form action={handleCreateStudentGroup} className="space-y-5">
            <StudentGroupMembersBuilder
              representative={
                currentStudent
                  ? {
                      id: currentStudent.id,
                      name: currentStudent.name,
                      registration_code: currentStudent.registration_code,
                      grade: currentStudent.grade,
                    }
                  : null
              }
              students={allStudents
                .filter((student) => student.active !== false && student.profile_id !== user.id)
                .map((student) => ({
                  id: student.id,
                  name: student.name,
                  registration_code: student.registration_code,
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

              <Link
                href={STUDENT_ROUTES.HOME}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
              >
                Voltar para início do estudante
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
