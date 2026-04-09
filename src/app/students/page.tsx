import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createStudent,
  deactivateStudent,
  fetchAllStudents,
  importStudents,
  updateStudent,
} from "@/services/student-service";
import { parseCsvText } from "@/lib/import/csv";
import type { Student } from "@/types/student";

/**
 * Página de estudantes (Etapa 6).
 *
 * Estrutura cadastro institucional de estudantes para etapas seguintes.
 */
interface StudentsPageProps {
  searchParams: Promise<{ import_status?: string; import_count?: string; import_skipped?: string }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const { import_status, import_count, import_skipped } = await searchParams;

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

  async function handleUpdateStudent(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const registrationCode = String(formData.get("registration_code") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const grade = String(formData.get("grade") ?? "").trim();

    if (!id || !name || name.length < 2 || !email) {
      redirect("/students");
    }

    await updateStudent(id, {
      name,
      email,
      registration_code: registrationCode || null,
      school: school || null,
      grade: grade || null,
    });

    revalidatePath("/students");
    redirect("/students");
  }

  async function handleDeactivateStudent(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      redirect("/students");
    }

    await deactivateStudent(id);

    revalidatePath("/students");
    redirect("/students");
  }

  async function handleImportStudents(formData: FormData) {
    "use server";

    const file = formData.get("import_file");
    if (!(file instanceof File) || file.size === 0) {
      redirect("/students?import_status=invalid_file");
    }

    let text = "";
    try {
      text = await file.text();
    } catch {
      redirect("/students?import_status=invalid_file");
    }

    let rows: ReturnType<typeof parseCsvText>["rows"] = [];
    try {
      rows = parseCsvText(text).rows;
    } catch {
      redirect("/students?import_status=invalid_csv");
    }

    const mappedRows = rows.map((row) => ({
      name: row.name || row.nome || "",
      email: row.email || row.e_mail || "",
      registration_code: row.registration_code || row.matricula || row.codigo_matricula || null,
      school: row.school || row.escola || null,
      grade: row.grade || row.serie || row.ano || null,
    }));

    try {
      const result = await importStudents(mappedRows);
      revalidatePath("/students");
      redirect(
        `/students?import_status=success&import_count=${result.importedCount}&import_skipped=${result.skippedCount}`
      );
    } catch {
      redirect("/students?import_status=error");
    }
  }

  try {
    students = await fetchAllStudents();
  } catch (error) {
    studentsError = error instanceof Error ? error.message : "Erro desconhecido ao carregar estudantes.";
  }

  const activeStudentsCount = students.filter((student) => student.active !== false).length;
  const inactiveStudentsCount = students.length - activeStudentsCount;

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

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Importar estudantes por arquivo</h2>
          <p className="text-sm text-gray-600 mb-4">
            Envie um CSV com colunas como: <code>name,email,registration_code,school,grade</code>
            {" "}(também aceitamos: <code>nome,matricula,escola,serie</code>).
          </p>

          <form action={handleImportStudents} className="flex flex-col sm:flex-row gap-3 sm:items-end">
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md"
            >
              Importar CSV
            </button>
          </form>
        </div>

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
          <p className="text-sm text-gray-600">
            Total de estudantes cadastrados: <strong>{students.length}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-3">
            Ativos: <strong>{activeStudentsCount}</strong> • Inativos: <strong>{inactiveStudentsCount}</strong>
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
                    <div className="text-right">
                      <span className="block text-xs text-gray-400">ID: {String(student.id).slice(0, 8)}…</span>
                      <span
                        className={`inline-flex mt-2 rounded-full px-2 py-1 text-xs font-semibold ${
                          student.active === false
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {student.active === false ? "Inativo" : "Ativo"}
                      </span>
                    </div>
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

                  <form action={handleUpdateStudent} className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                    <input type="hidden" name="id" value={String(student.id)} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`student-name-${student.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Nome completo
                        </label>
                        <input
                          id={`student-name-${student.id}`}
                          name="name"
                          type="text"
                          defaultValue={student.name}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor={`student-email-${student.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          E-mail
                        </label>
                        <input
                          id={`student-email-${student.id}`}
                          name="email"
                          type="email"
                          defaultValue={student.email}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor={`student-registration-${student.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Código de matrícula
                        </label>
                        <input
                          id={`student-registration-${student.id}`}
                          name="registration_code"
                          type="text"
                          defaultValue={student.registration_code ?? ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor={`student-grade-${student.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Série/Ano
                        </label>
                        <input
                          id={`student-grade-${student.id}`}
                          name="grade"
                          type="text"
                          defaultValue={student.grade ?? ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`student-school-${student.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Escola
                      </label>
                      <input
                        id={`student-school-${student.id}`}
                        name="school"
                        type="text"
                        defaultValue={student.school ?? ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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

                  {student.active !== false && (
                    <form action={handleDeactivateStudent} className="mt-3">
                      <input type="hidden" name="id" value={String(student.id)} />
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
