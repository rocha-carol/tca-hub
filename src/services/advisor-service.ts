import { createClient } from "@/lib/supabase/server";
import type { Advisor } from "@/types/advisor";

function isAdvisorsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.advisors'");
}

function isAdvisorsActiveColumnMissing(message: string) {
	return message.includes("active") && message.includes("schema cache");
}

function normalizeAdvisorId(id: string | number) {
	if (typeof id === "number") {
		return id;
	}

	const trimmedId = id.trim();
	return /^\d+$/.test(trimmedId) ? Number(trimmedId) : trimmedId;
}

export interface CreateAdvisorData {
	name: string;
	email: string;
	profile_id?: string | null;
	role_title?: string | null;
	employee_code?: string | null;
	school?: string | null;
	area_of_activity?: string | null;
}

export interface UpdateAdvisorData {
	name: string;
	email: string;
	role_title?: string | null;
	employee_code?: string | null;
	school?: string | null;
	area_of_activity?: string | null;
}

/**
 * Busca todos os orientadores cadastrados.
 *
 * MVP: listagem simples sem paginação.
 */
export async function fetchAllAdvisors(): Promise<Advisor[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("advisors")
		.select("*")
		.order("name", { ascending: true });

	if (error) {
		if (isAdvisorsTableMissing(error.message)) {
			throw new Error(
				"Tabela advisors ainda não existe no Supabase. Execute o script database/003_create_advisors_table.sql no SQL Editor."
			);
		}
		throw new Error(`Erro ao buscar orientadores: ${error.message}`);
	}

	return (data || []) as Advisor[];
}

/**
 * Cadastra um novo orientador.
 */
export async function createAdvisor(data: CreateAdvisorData): Promise<Advisor> {
	const supabase = await createClient();

	const { data: inserted, error } = await supabase
		.from("advisors")
		.insert({
			name: data.name,
			email: data.email,
			profile_id: data.profile_id ?? null,
			role_title: data.role_title ?? null,
			employee_code: data.employee_code ?? null,
			school: data.school ?? null,
			area_of_activity: data.area_of_activity ?? null,
		})
		.select("*")
		.single();

	if (error) {
		if (isAdvisorsTableMissing(error.message)) {
			throw new Error(
				"Tabela advisors ainda não existe no Supabase. Execute o script database/003_create_advisors_table.sql no SQL Editor."
			);
		}
		throw new Error(`Erro ao cadastrar orientador: ${error.message}`);
	}

	return inserted as Advisor;
}

/**
 * Atualiza os dados de um orientador já cadastrado.
 */
export async function updateAdvisor(
	advisorId: string | number,
	data: UpdateAdvisorData
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("advisors")
		.update({
			name: data.name,
			email: data.email,
			role_title: data.role_title ?? null,
			employee_code: data.employee_code ?? null,
			school: data.school ?? null,
			area_of_activity: data.area_of_activity ?? null,
		})
		.eq("id", normalizeAdvisorId(advisorId));

	if (error) {
		if (isAdvisorsTableMissing(error.message)) {
			throw new Error(
				"Tabela advisors ainda não existe no Supabase. Execute o script database/003_create_advisors_table.sql no SQL Editor."
			);
		}

		throw new Error(`Erro ao atualizar orientador: ${error.message}`);
	}
}

/**
 * Inativa um orientador sem remover o cadastro do sistema.
 */
export async function deactivateAdvisor(advisorId: string | number): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("advisors")
		.update({ active: false })
		.eq("id", normalizeAdvisorId(advisorId));

	if (error) {
		if (isAdvisorsActiveColumnMissing(error.message)) {
			throw new Error(
				"Coluna active ainda não existe em advisors. No Supabase SQL Editor, execute: alter table public.advisors add column if not exists active boolean not null default true;"
			);
		}

		if (isAdvisorsTableMissing(error.message)) {
			throw new Error(
				"Tabela advisors ainda não existe no Supabase. Execute o script database/003_create_advisors_table.sql no SQL Editor."
			);
		}

		throw new Error(`Erro ao inativar orientador: ${error.message}`);
	}
}
