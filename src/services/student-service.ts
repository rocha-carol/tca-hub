import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/types/student";

function isStudentsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.students'");
}

export interface CreateStudentData {
	name: string;
	email: string;
	registration_code?: string | null;
	school?: string | null;
	grade?: string | null;
	profile_id?: string | null;
}

/**
 * Busca estudantes cadastrados.
 *
 * Etapa 6: suporte à estrutura institucional de cadastro.
 */
export async function fetchAllStudents(): Promise<Student[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("students")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		if (isStudentsTableMissing(error.message)) {
			throw new Error(
				"Tabela students ainda não existe no Supabase. Estruture a tabela para o cadastro institucional antes de usar o módulo."
			);
		}
		throw new Error(`Erro ao buscar estudantes: ${error.message}`);
	}

	return (data || []) as Student[];
}

/**
 * Cadastra um novo estudante.
 */
export async function createStudent(data: CreateStudentData): Promise<Student> {
	const supabase = await createClient();

	const { data: inserted, error } = await supabase
		.from("students")
		.insert({
			name: data.name,
			email: data.email,
			registration_code: data.registration_code ?? null,
			school: data.school ?? null,
			grade: data.grade ?? null,
			profile_id: data.profile_id ?? null,
		})
		.select("*")
		.single();

	if (error) {
		if (isStudentsTableMissing(error.message)) {
			throw new Error(
				"Tabela students ainda não existe no Supabase. Estruture a tabela para o cadastro institucional antes de usar o módulo."
			);
		}
		throw new Error(`Erro ao cadastrar estudante: ${error.message}`);
	}

	return inserted as Student;
}
