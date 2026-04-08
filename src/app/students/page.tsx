import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStudent, fetchAllStudents } from "@/services/student-service";
import type { Student } from "@/types/student";

/**
 * Página de estudantes (Etapa 6).
 *
 * Estrutura cadastro institucional de estudantes para etapas seguintes.
 */
export default async function StudentsPage() {
  let students: Student[] = [];
  let studentsError: string | null = null;

  async function handleCreateStudent(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const registrationCode = String(formData.get("registration_code") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const grade = String(formData.get("grade") ?? "").trim();

    if (!name || name.length < 2 || !email) {
      redirect("/students");
    }

    await createStudent({
      name,
      email,
      registration_code: registrationCode || null,
      school: school || null,
      grade: grade || null,
    });

    revalidatePath("/students");
    redirect("/students");
  }

  try {
    students = await fetchAllStudents();
  } catch (error) {
    studentsError = error instanceof Error ? error.message : "Erro desconhecido ao carregar estudantes.";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Estudantes</h1>
          <p className="text-gray-600 mt-2">Cadastro institucional de estudantes do TCA.</p>
        </header>

        {studentsError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-medium mb-1">Configuração pendente do módulo de estudantes</p>
            <p className="text-amber-800 text-sm">{studentsError}</p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cadastrar estudante</h2>

          <form action={handleCreateStudent} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex.: Maria da Silva"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Ex.: maria.silva@escola.edu.br"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="registration_code" className="block text-sm font-medium text-gray-700 mb-1">Código de matrícula</label>
                <input
                  id="registration_code"
                  name="registration_code"
                  type="text"
                  placeholder="Ex.: 202600123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Série/Ano</label>
                <input
                  id="grade"
                  name="grade"
                  type="text"
                  placeholder="Ex.: 9º ano"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1">Escola</label>
              <input
                id="school"
                name="school"
                type="text"
                placeholder="Ex.: EMEF Exemplo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
              >
                Cadastrar estudante
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

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estudantes cadastrados</h2>
          <p className="text-sm text-gray-600 mb-3">
            Total de estudantes cadastrados: <strong>{students.length}</strong>
          </p>

          {students.length === 0 ? (
            <p className="text-gray-700">Nenhum estudante cadastrado ainda.</p>
          ) : (
            <div className="space-y-4 mt-4">
              {students.map((student) => (
                <article key={student.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                    </div>
                    <span className="text-xs text-gray-400">ID: {student.id.slice(0, 8)}…</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <p className="text-gray-700">
                      <strong>Matrícula:</strong> {student.registration_code || "Não informada"}
                    </p>
                    <p className="text-gray-700">
                      <strong>Série/Ano:</strong> {student.grade || "Não informado"}
                    </p>
                    <p className="text-gray-700 md:col-span-2">
                      <strong>Escola:</strong> {student.school || "Não informada"}
                    </p>
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
