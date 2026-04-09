import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/types/student";

function isStudentsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.students'");
}

function isStudentsPermissionDenied(message: string, code?: string) {
	const normalizedMessage = message.toLowerCase();
	return (
		code === "42501" ||
		normalizedMessage.includes("permission denied") ||
		normalizedMessage.includes("row-level security")
	);
}

function isStudentsColumnMissing(message: string, columnName: string) {
	return message.includes(columnName) && message.includes("schema cache");
}

function isStudentsActiveColumnMissing(message: string) {
	return message.includes("active") && message.includes("schema cache");
}

function normalizeStudentId(id: string | number) {
	if (typeof id === "number") {
		return id;
	}

	const trimmedId = id.trim();
	return /^\d+$/.test(trimmedId) ? Number(trimmedId) : trimmedId;
}

export interface CreateStudentData {
	name: string;
	email: string;
	registration_code?: string | null;
	school?: string | null;
	grade?: string | null;
	profile_id?: string | null;
}

export interface UpdateStudentData {
	name: string;
	email: string;
	registration_code?: string | null;
	school?: string | null;
	grade?: string | null;
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
		if (isStudentsPermissionDenied(error.message, error.code)) {
			throw new Error(
				"Leitura de students bloqueada por policy/RLS no Supabase. Garanta uma policy SELECT para usuários autenticados."
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

		if (
			isStudentsColumnMissing(error.message, "registration_code") ||
			isStudentsColumnMissing(error.message, "school") ||
			isStudentsColumnMissing(error.message, "grade") ||
			isStudentsColumnMissing(error.message, "profile_id")
		) {
			throw new Error(
				"Estrutura de students incompleta no Supabase. Adicione as colunas registration_code, school, grade e profile_id antes de usar o cadastro institucional."
			);
		}

		if (isStudentsPermissionDenied(error.message, error.code)) {
			throw new Error(
				"Cadastro de students bloqueado por policy/RLS no Supabase. Garanta policies INSERT para usuários autenticados."
			);
		}
		throw new Error(`Erro ao cadastrar estudante: ${error.message}`);
	}

	return inserted as Student;
}

/**
 * Atualiza os dados de um estudante já cadastrado.
 */
export async function updateStudent(
	studentId: string | number,
	data: UpdateStudentData
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("students")
		.update({
			name: data.name,
			email: data.email,
			registration_code: data.registration_code ?? null,
			school: data.school ?? null,
			grade: data.grade ?? null,
		})
		.eq("id", normalizeStudentId(studentId));

	if (error) {
		if (isStudentsTableMissing(error.message)) {
			throw new Error(
				"Tabela students ainda não existe no Supabase. Estruture a tabela para o cadastro institucional antes de usar o módulo."
			);
		}

		if (
			isStudentsColumnMissing(error.message, "registration_code") ||
			isStudentsColumnMissing(error.message, "school") ||
			isStudentsColumnMissing(error.message, "grade")
		) {
			throw new Error(
				"Estrutura de students incompleta no Supabase. Adicione as colunas registration_code, school e grade antes de editar estudantes."
			);
		}

		if (isStudentsPermissionDenied(error.message, error.code)) {
			throw new Error(
				"Edição de students bloqueada por policy/RLS no Supabase. Garanta policies UPDATE para usuários autenticados."
			);
		}

		throw new Error(`Erro ao atualizar estudante: ${error.message}`);
	}
}

/**
 * Inativa um estudante sem remover o histórico do cadastro.
 */
export async function deactivateStudent(studentId: string | number): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("students")
		.update({ active: false })
		.eq("id", normalizeStudentId(studentId));

	if (error) {
		if (isStudentsActiveColumnMissing(error.message)) {
			throw new Error(
				"Coluna active ainda não existe em students. No Supabase SQL Editor, execute: alter table public.students add column if not exists active boolean not null default true;"
			);
		}

		if (isStudentsTableMissing(error.message)) {
			throw new Error(
				"Tabela students ainda não existe no Supabase. Estruture a tabela para o cadastro institucional antes de usar o módulo."
			);
		}

		if (isStudentsPermissionDenied(error.message, error.code)) {
			throw new Error(
				"Inativação de students bloqueada por policy/RLS no Supabase. Garanta policies UPDATE para usuários autenticados."
			);
		}

		throw new Error(`Erro ao inativar estudante: ${error.message}`);
	}
}
