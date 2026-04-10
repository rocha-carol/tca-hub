import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { StudentWelcome } from "@/components/student/StudentWelcome";
import { TcaIntroduction } from "@/components/student/TcaIntroduction";
import { TcaStepsGuide } from "@/components/student/TcaStepsGuide";
import { StudentStatus } from "@/components/student/StudentStatus";
import { StudentActions } from "@/components/student/StudentActions";

interface StudentPageProps {
  searchParams?: Promise<{ modo?: string }>;
}

/**
 * Página inicial do estudante.
 *
 * Esta tela é o ponto de entrada antes da fase de escrita,
 * com foco em acolhimento, onboarding e decisão inicial.
 */
export default async function StudentPage({ searchParams }: StudentPageProps) {
  const params = searchParams ? await searchParams : {};

  if (params.modo === "provisorio") {
    redirect("/groups");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();

  if (profile?.role === "coordinator") {
    redirect("/coordinator/dashboard");
  }

  if (profile?.role === "advisor") {
    redirect("/advisor/dashboard");
  }

  const context = await resolveStudentGroupContext(user.id);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="tca-stripes h-1.5 w-full rounded-md" />

        <header>
          <h1 className="text-3xl font-bold tca-title-guide">Área do estudante</h1>
          <p className="text-gray-600 mt-2">Seu ponto de partida no TCA Hub.</p>
        </header>

        <StudentWelcome />
        <TcaIntroduction />
        <TcaStepsGuide />
        <StudentStatus
          group={context.group}
          studentName={profile?.name || user.email || "Estudante"}
          studentsError={context.studentsError}
          groupsError={context.groupsError}
        />
        <StudentActions hasGroup={Boolean(context.group)} groupId={context.group?.id} />
      </section>
    </main>
  );
}
