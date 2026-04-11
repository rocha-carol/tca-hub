import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentGroupStatusPageProps {
  searchParams?: Promise<{ created?: string }>;
}

export default async function StudentGroupStatusPage({ searchParams }: StudentGroupStatusPageProps) {
  const params = searchParams ? await searchParams : {};

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();
  if (profile?.role !== "student") {
    redirect("/dashboard");
  }

  const context = await resolveStudentGroupContext(user.id);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold tca-title-guide">Verificar meu grupo</h1>
          <p className="text-gray-600 mt-2">Consulta rápida do seu vínculo de grupo no TCA Hub.</p>
        </header>

        {params.created === "1" && (
          <div className="mb-6 rounded-lg border border-lime-200 bg-lime-50 px-4 py-3 text-lime-900">
            Grupo salvo com sucesso. Agora confirme abaixo o vínculo do seu grupo.
          </div>
        )}

        {!context.group ? (
          <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum grupo encontrado</h2>
            <p className="text-gray-700 mb-4">
              Ainda não localizamos vínculo de grupo para o seu perfil.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={STUDENT_ROUTES.GROUP_CREATE}
                className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
              >
                Começar um grupo
              </Link>
              <Link
                href={STUDENT_ROUTES.HOME}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        ) : (
          <div className="tca-soft-surface rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Grupo encontrado</h2>
            <p className="text-gray-700">Você já está cadastrado no grupo:</p>

            <p className="mt-2 font-semibold text-[#1F2937]">
              {context.group.theme || `Grupo ${String(context.group.id).slice(0, 8)}`}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`${STUDENT_ROUTES.GROUP}/${context.group.id}`}
                className="bg-[#2F80ED] hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
              >
                Ir para o grupo
              </Link>
              <Link
                href={STUDENT_ROUTES.HOME}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-md"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
