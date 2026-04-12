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

export interface ImportStudentRow {
	name: string;
	email: string;
	registration_code?: string | null;
	school?: string | null;
	grade?: string | null;
}

export interface ImportStudentsResult {
	importedCount: number;
	skippedCount: number;
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
 * Resolve um estudante a partir do profile autenticado.
 *
 * Estratégia:
 * 1. tenta localizar pelo `profile_id`
 * 2. se não encontrar, tenta localizar pelo email
 * 3. se encontrar por email, sincroniza `profile_id` para evitar novas falhas
 */
export async function resolveStudentByAuthIdentity(params: {
	profileId: string;
	email?: string | null;
	name?: string | null;
	allowCreateIfMissing?: boolean;
}): Promise<Student | null> {
	const supabase = await createClient();
	const normalizedEmail = params.email?.trim().toLowerCase() || "";
	const normalizedName = params.name?.trim() || "Usuário";

	const { data: linkedStudent, error: linkedStudentError } = await supabase
		.from("students")
		.select("*")
		.eq("profile_id", params.profileId)
		.maybeSingle();

	if (linkedStudentError) {
		if (isStudentsTableMissing(linkedStudentError.message)) {
			throw new Error(
				"Tabela students ainda não existe no Supabase. Estruture a tabela para o cadastro institucional antes de usar o módulo."
			);
		}

		if (isStudentsPermissionDenied(linkedStudentError.message, linkedStudentError.code)) {
			throw new Error(
				"Leitura de students bloqueada por policy/RLS no Supabase. Garanta uma policy SELECT para usuários autenticados."
			);
		}

		throw new Error(`Erro ao localizar estudante pelo profile autenticado: ${linkedStudentError.message}`);
	}

	if (linkedStudent) {
		return linkedStudent as Student;
	}

	if (!normalizedEmail) {
		return null;
	}

	const { data: studentByEmail, error: studentByEmailError } = await supabase
		.from("students")
		.select("*")
		.eq("email", normalizedEmail)
		.maybeSingle();

	if (studentByEmailError) {
		if (isStudentsTableMissing(studentByEmailError.message)) {
			throw new Error(
				"Tabela students ainda não existe no Supabase. Estruture a tabela para o cadastro institucional antes de usar o módulo."
			);
		}

		if (isStudentsPermissionDenied(studentByEmailError.message, studentByEmailError.code)) {
			throw new Error(
				"Leitura de students bloqueada por policy/RLS no Supabase. Garanta uma policy SELECT para usuários autenticados."
			);
		}

		throw new Error(`Erro ao localizar estudante pelo email autenticado: ${studentByEmailError.message}`);
	}

	if (!studentByEmail) {
		if (!params.allowCreateIfMissing || !normalizedEmail) {
			return null;
		}

		const { data: createdStudent, error: createStudentError } = await supabase
			.from("students")
			.insert({
				name: normalizedName,
				email: normalizedEmail,
				profile_id: params.profileId,
				active: true,
			})
			.select("*")
			.single();

		if (createStudentError) {
			if (isStudentsPermissionDenied(createStudentError.message, createStudentError.code)) {
				throw new Error(
					"Criação automática do cadastro de estudante bloqueada por policy/RLS no Supabase. Garanta policies INSERT para usuários autenticados."
				);
			}

			throw new Error(`Erro ao criar cadastro automático do estudante: ${createStudentError.message}`);
		}

		return createdStudent as Student;
	}

	if (studentByEmail.profile_id === params.profileId) {
		return studentByEmail as Student;
	}

	const { data: updatedStudent, error: updateStudentError } = await supabase
		.from("students")
		.update({
			profile_id: params.profileId,
		})
		.eq("id", normalizeStudentId(studentByEmail.id))
		.select("*")
		.single();

	if (updateStudentError) {
		if (isStudentsPermissionDenied(updateStudentError.message, updateStudentError.code)) {
			throw new Error(
				"Vinculação de students ao profile bloqueada por policy/RLS no Supabase. Garanta policies UPDATE para usuários autenticados."
			);
		}

		throw new Error(`Erro ao sincronizar profile_id do estudante: ${updateStudentError.message}`);
	}

	return updatedStudent as Student;
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

/**
 * Importa estudantes por arquivo (CSV), fazendo upsert por e-mail.
 */
export async function importStudents(rows: ImportStudentRow[]): Promise<ImportStudentsResult> {
	const supabase = await createClient();

	const normalizedRows = rows
		.map((row) => ({
			name: row.name.trim(),
			email: row.email.trim().toLowerCase(),
			registration_code: row.registration_code?.trim() || null,
			school: row.school?.trim() || null,
			grade: row.grade?.trim() || null,
		}))
		.filter((row) => row.name.length >= 2 && row.email.length > 0);

	if (normalizedRows.length === 0) {
		return { importedCount: 0, skippedCount: rows.length };
	}

	const uniqueByEmail = new Map<string, ImportStudentRow>();
	for (const row of normalizedRows) {
		uniqueByEmail.set(row.email, row);
	}

	const payload = Array.from(uniqueByEmail.values()).map((row) => ({
		name: row.name,
		email: row.email,
		registration_code: row.registration_code ?? null,
		school: row.school ?? null,
		grade: row.grade ?? null,
		active: true,
	}));

	const { error } = await supabase
		.from("students")
		.upsert(payload, { onConflict: "email" });

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
				"Estrutura de students incompleta no Supabase. Adicione as colunas registration_code, school e grade antes da importação."
			);
		}

		if (isStudentsPermissionDenied(error.message, error.code)) {
			throw new Error(
				"Importação de students bloqueada por policy/RLS no Supabase. Garanta policies INSERT e UPDATE para usuários autenticados."
			);
		}

		throw new Error(`Erro ao importar estudantes: ${error.message}`);
	}

	return {
		importedCount: payload.length,
		skippedCount: rows.length - payload.length,
	};
}
