import { createClient } from "@/lib/supabase/server";
import type { Advisor } from "@/types/advisor";

function isAdvisorsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.advisors'");
}

export interface CreateAdvisorData {
	name: string;
	email: string;
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
		.insert({ name: data.name, email: data.email })
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
