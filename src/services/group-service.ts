import { createClient } from "@/lib/supabase/server";
import type { Group, GroupStatus } from "@/types/group";

function isGroupsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.groups'");
}

function isStatusColumnMissing(message: string) {
	return message.includes("status") && message.includes("schema cache");
}

export interface CreateGroupData {
	member_1_name: string;
	member_1_series: string;
	member_2_name?: string | null;
	member_2_series?: string | null;
	member_3_name?: string | null;
	member_3_series?: string | null;
	theme?: string | null;
	description?: string | null;
	status?: GroupStatus;
}

/**
 * Busca todos os grupos cadastrados.
 *
 * MVP: listagem simples sem paginação.
 */
export async function fetchAllGroups(): Promise<Group[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("groups")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		if (isGroupsTableMissing(error.message)) {
			throw new Error(
				"Tabela groups ainda não existe no Supabase. Execute o script database/001_create_groups_table.sql no SQL Editor."
			);
		}

		throw new Error(`Erro ao buscar grupos: ${error.message}`);
	}

	return (data || []) as Group[];
}

/**
 * Cria um novo grupo.
 *
 * MVP: criação com até 3 integrantes e suas respectivas séries.
 */
export async function createGroup(data: CreateGroupData): Promise<Group> {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Usuário não autenticado para criação de grupo.");
	}

	const payload = {
		owner_id: user.id,
		member_1_name: data.member_1_name,
		member_1_series: data.member_1_series,
		member_2_name: data.member_2_name ?? null,
		member_2_series: data.member_2_series ?? null,
		member_3_name: data.member_3_name ?? null,
		member_3_series: data.member_3_series ?? null,
		theme: data.theme ?? null,
		description: data.description ?? null,
		status: data.status ?? "planejamento",
		primary_advisor_id: null,
		co_advisor_id: null,
	};

	const { data: inserted, error } = await supabase
		.from("groups")
		.insert(payload)
		.select("*")
		.single();

	if (error) {
		if (isStatusColumnMissing(error.message)) {
			throw new Error(
				"Coluna status ainda não existe em groups. Execute: alter table public.groups add column if not exists status text not null default 'planejamento';"
			);
		}

		if (isGroupsTableMissing(error.message)) {
			throw new Error(
				"Tabela groups ainda não existe no Supabase. Execute o script database/001_create_groups_table.sql no SQL Editor."
			);
		}

		throw new Error(`Erro ao criar grupo: ${error.message}`);
	}

	return inserted as Group;
}

/**
 * Busca um grupo pelo ID.
 *
 * Retorna null se o grupo não for encontrado.
 */
export async function fetchGroupById(id: string): Promise<Group | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("groups")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// Nenhuma linha encontrada
			return null;
		}
		if (isGroupsTableMissing(error.message)) {
			throw new Error(
				"Tabela groups ainda não existe no Supabase. Execute o script database/001_create_groups_table.sql no SQL Editor."
			);
		}
		throw new Error(`Erro ao buscar grupo: ${error.message}`);
	}

	return data as Group;
}

/**
 * Atualiza os orientadores de um grupo.
 *
 * Passa null para remover o vínculo.
 */
export async function updateGroupAdvisors(
	groupId: string,
	primaryAdvisorId: string | null,
	coAdvisorId: string | null
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("groups")
		.update({
			primary_advisor_id: primaryAdvisorId,
			co_advisor_id: coAdvisorId,
		})
		.eq("id", groupId);

	if (error) {
		throw new Error(`Erro ao atualizar orientadores: ${error.message}`);
	}
}

/**
 * Atualiza o status de um grupo.
 */
export async function updateGroupStatus(groupId: string, status: GroupStatus): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("groups")
		.update({ status })
		.eq("id", groupId);

	if (error) {
		if (isStatusColumnMissing(error.message)) {
			throw new Error(
				"Coluna status ainda não existe em groups. Execute: alter table public.groups add column if not exists status text not null default 'planejamento';"
			);
		}

		throw new Error(`Erro ao atualizar status do grupo: ${error.message}`);
	}
}
