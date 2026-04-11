import { fetchAllGroups } from "@/services/group-service";
import { fetchAllStudents } from "@/services/student-service";
import type { Group } from "@/types/group";
import type { Student } from "@/types/student";

export interface StudentGroupContext {
  student: Student | null;
  group: Group | null;
  studentsError: string | null;
  groupsError: string | null;
}

/**
 * Resolve o estudante autenticado e verifica se ele já pertence a algum grupo.
 *
 * Mantém a lógica local do módulo de estudante para evitar impacto em serviços estáveis.
 */
export async function resolveStudentGroupContext(profileId: string): Promise<StudentGroupContext> {
  let studentsError: string | null = null;
  let groupsError: string | null = null;

  let allStudents: Student[] = [];
  try {
    allStudents = await fetchAllStudents();
  } catch (error) {
    studentsError = error instanceof Error ? error.message : "Não foi possível carregar estudantes.";
  }

  const student = allStudents.find((item) => item.profile_id === profileId) ?? null;

  let allGroups: Group[] = [];
  try {
    allGroups = await fetchAllGroups();
  } catch (error) {
    groupsError = error instanceof Error ? error.message : "Não foi possível carregar grupos.";
  }

  const group =
    student
      ? allGroups.find((item) => {
          const studentId = String(student.id);
          return (
            String(item.student_1_id ?? "") === studentId ||
            String(item.student_2_id ?? "") === studentId ||
            String(item.student_3_id ?? "") === studentId ||
            String(item.student_4_id ?? "") === studentId ||
            String(item.student_5_id ?? "") === studentId
          );
        }) ?? null
      : null;

  return {
    student,
    group,
    studentsError,
    groupsError,
  };
}