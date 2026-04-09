import { createClient } from "@/lib/supabase/server";
import type { AdvisorIndicationStatus, Group, GroupStatus } from "@/types/group";

function isGroupsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.groups'");
}

function isStatusColumnMissing(message: string) {
	return message.includes("status") && message.includes("schema cache");
}

function isStudentLinkColumnMissing(message: string) {
	return (
		(message.includes("student_1_id") ||
			message.includes("student_2_id") ||
			message.includes("student_3_id")) &&
		message.includes("schema cache")
	);
}

function isIndicationColumnMissing(message: string) {
	return (
		(message.includes("indicated_advisor_id") ||
			message.includes("indication_status") ||
			message.includes("indication_updated_at")) &&
		message.includes("schema cache")
	);
}

function mapSupabaseErrorToIndicationMessage(message: string) {
	if (isIndicationColumnMissing(message)) {
		return "Fluxo de indicação ainda não está preparado no Supabase. Execute o arquivo local database/009_add_advisor_indication_flow.sql no SQL Editor.";
	}

	return null;
}

async function recalculateAdvisorIndicationQueue(excludedGroupId?: string): Promise<void> {
	const supabase = await createClient();

	const { data: advisorsData, error: advisorsError } = await supabase
		.from("advisors")
		.select("id, active, max_orientacoes")
		.eq("active", true);

	if (advisorsError) {
		throw new Error(`Erro ao buscar orientadores para recálculo da fila: ${advisorsError.message}`);
	}

	const advisorCapacityMap = new Map<string, number>();
	for (const advisor of advisorsData || []) {
		advisorCapacityMap.set(String(advisor.id), advisor.max_orientacoes ?? 5);
	}

	const { data: occupiedGroups, error: occupiedGroupsError } = await supabase
		.from("groups")
		.select("primary_advisor_id")
		.not("primary_advisor_id", "is", null);

	if (occupiedGroupsError) {
		throw new Error(`Erro ao calcular carga dos orientadores: ${occupiedGroupsError.message}`);
	}

	const loadMap = new Map<string, number>();
	for (const row of occupiedGroups || []) {
		const advisorId = String(row.primary_advisor_id ?? "");
		if (!advisorId) continue;
		loadMap.set(advisorId, (loadMap.get(advisorId) ?? 0) + 1);
	}

	let openGroupsQuery = supabase
		.from("groups")
		.select("id, indicated_advisor_id, indication_status, primary_advisor_id, created_at")
		.is("primary_advisor_id", null)
		.order("created_at", { ascending: true });

	if (excludedGroupId) {
		openGroupsQuery = openGroupsQuery.neq("id", excludedGroupId);
	}

	const { data: openGroups, error: openGroupsError } = await openGroupsQuery;

	if (openGroupsError) {
		const indicationMessage = mapSupabaseErrorToIndicationMessage(openGroupsError.message);
		if (indicationMessage) {
			throw new Error(indicationMessage);
		}

		throw new Error(`Erro ao buscar grupos para recálculo da fila: ${openGroupsError.message}`);
	}

	const { data: preferencesRows, error: preferencesError } = await supabase
		.from("group_advisor_preferences")
		.select("group_id, advisor_id, preference_order")
		.order("group_id", { ascending: true })
		.order("preference_order", { ascending: true });

	if (preferencesError) {
		throw new Error(`Erro ao buscar preferências para recálculo da fila: ${preferencesError.message}`);
	}

	const preferencesMap = new Map<string, Array<{ advisor_id: string }>>();
	for (const row of preferencesRows || []) {
		const groupId = String(row.group_id);
		const list = preferencesMap.get(groupId) ?? [];
		list.push({ advisor_id: String(row.advisor_id) });
		preferencesMap.set(groupId, list);
	}

	for (const group of openGroups || []) {
		const groupId = String(group.id);
		const preferences = preferencesMap.get(groupId) ?? [];

		let nextIndicatedAdvisorId: string | null = null;

		for (const pref of preferences) {
			const advisorId = String(pref.advisor_id);
			const maxOrientacoes = advisorCapacityMap.get(advisorId);

			if (!maxOrientacoes) {
				continue;
			}

			const currentLoad = loadMap.get(advisorId) ?? 0;
			if (currentLoad < maxOrientacoes) {
				nextIndicatedAdvisorId = advisorId;
				loadMap.set(advisorId, currentLoad + 1);
				break;
			}
		}

		const currentIndicatedAdvisorId = group.indicated_advisor_id ? String(group.indicated_advisor_id) : null;
		const currentStatus = group.indication_status ? String(group.indication_status) : null;

		const nextStatus = nextIndicatedAdvisorId ? "pendente" : null;

		const shouldUpdate =
			currentIndicatedAdvisorId !== nextIndicatedAdvisorId ||
			currentStatus !== nextStatus;

		if (!shouldUpdate) {
			continue;
		}

		const { error: updateError } = await supabase
			.from("groups")
			.update({
				indicated_advisor_id: nextIndicatedAdvisorId,
				indication_status: nextStatus,
				indication_updated_at: new Date().toISOString(),
			})
			.eq("id", groupId);

		if (updateError) {
			const indicationMessage = mapSupabaseErrorToIndicationMessage(updateError.message);
			if (indicationMessage) {
				throw new Error(indicationMessage);
			}

			throw new Error(`Erro ao atualizar fila de indicação para o grupo ${groupId}: ${updateError.message}`);
		}
	}
}

async function ensureAdvisorAvailableForPrimaryAssignment(
	advisorId: string,
	groupId: string
): Promise<void> {
	const supabase = await createClient();

	const { data: advisorData, error: advisorError } = await supabase
		.from("advisors")
		.select("id, active, max_orientacoes")
		.eq("id", advisorId)
		.single();

	if (advisorError) {
		throw new Error(`Erro ao validar disponibilidade do orientador: ${advisorError.message}`);
	}

	if (!advisorData || advisorData.active === false) {
		throw new Error("Orientador indisponível para assumir como principal.");
	}

	const maxOrientacoes = advisorData.max_orientacoes ?? 5;

	const { count, error: countError } = await supabase
		.from("groups")
		.select("id", { count: "exact", head: true })
		.eq("primary_advisor_id", advisorId)
		.neq("id", groupId);

	if (countError) {
		throw new Error(`Erro ao calcular carga atual do orientador: ${countError.message}`);
	}

	const currentCount = count ?? 0;
	if (currentCount >= maxOrientacoes) {
		throw new Error(
			`Orientador indisponível: limite de orientações atingido (${currentCount}/${maxOrientacoes}).`
		);
	}
}

export interface CreateGroupData {
	student_1_id?: string | number | null;
	member_1_name: string;
	member_1_series: string;
	student_2_id?: string | number | null;
	member_2_name?: string | null;
	member_2_series?: string | null;
	student_3_id?: string | number | null;
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
		student_1_id: data.student_1_id ?? null,
		member_1_name: data.member_1_name,
		member_1_series: data.member_1_series,
		student_2_id: data.student_2_id ?? null,
		member_2_name: data.member_2_name ?? null,
		member_2_series: data.member_2_series ?? null,
		student_3_id: data.student_3_id ?? null,
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
		if (isStudentLinkColumnMissing(error.message)) {
			throw new Error(
				"Vínculo entre groups e students ainda não existe no Supabase. Execute o arquivo local database/006_link_groups_students.sql no SQL Editor."
			);
		}

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
	if (primaryAdvisorId) {
		await ensureAdvisorAvailableForPrimaryAssignment(primaryAdvisorId, groupId);
	}

	const supabase = await createClient();

	const { error } = await supabase
		.from("groups")
		.update({
			primary_advisor_id: primaryAdvisorId,
			co_advisor_id: coAdvisorId,
			indicated_advisor_id: null,
			indication_status: null,
			indication_updated_at: new Date().toISOString(),
		})
		.eq("id", groupId);

	if (error) {
		const indicationMessage = mapSupabaseErrorToIndicationMessage(error.message);
		if (indicationMessage) {
			throw new Error(indicationMessage);
		}

		throw new Error(`Erro ao atualizar orientadores: ${error.message}`);
	}

	await recalculateAdvisorIndicationQueue(groupId);
}

/**
 * Inicia o fluxo de indicação de orientador principal para um grupo.
 */
export async function initiateAdvisorIndication(
	groupId: string,
	indicatedAdvisorId: string
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("groups")
		.update({
			indicated_advisor_id: indicatedAdvisorId,
			indication_status: "pendente",
			indication_updated_at: new Date().toISOString(),
		})
		.eq("id", groupId);

	if (error) {
		const indicationMessage = mapSupabaseErrorToIndicationMessage(error.message);
		if (indicationMessage) {
			throw new Error(indicationMessage);
		}

		throw new Error(`Erro ao iniciar indicação de orientador: ${error.message}`);
	}
}

/**
 * Registra resposta da indicação de orientador principal (aceite ou recusa).
 */
export async function respondAdvisorIndication(
	groupId: string,
	decision: Exclude<AdvisorIndicationStatus, "pendente">,
	coAdvisorId?: string | null
): Promise<void> {
	const group = await fetchGroupById(groupId);
	if (!group) {
		throw new Error("Grupo não encontrado para responder indicação.");
	}

	if (!group.indicated_advisor_id) {
		throw new Error("Não existe indicação pendente para este grupo.");
	}

	const normalizedCoAdvisorId = coAdvisorId?.trim() ? coAdvisorId.trim() : null;
	if (decision === "aceita" && normalizedCoAdvisorId === group.indicated_advisor_id) {
		throw new Error("Coorientador não pode ser o mesmo orientador principal indicado.");
	}

	if (decision === "aceita") {
		await ensureAdvisorAvailableForPrimaryAssignment(group.indicated_advisor_id, groupId);
	}

	const supabase = await createClient();

	const updatePayload =
		decision === "aceita"
			? {
				primary_advisor_id: group.indicated_advisor_id,
				co_advisor_id: normalizedCoAdvisorId,
				indication_status: "aceita",
				indication_updated_at: new Date().toISOString(),
			}
			: {
				indicated_advisor_id: null,
				indication_status: "recusada",
				indication_updated_at: new Date().toISOString(),
			};

	const { error } = await supabase
		.from("groups")
		.update(updatePayload)
		.eq("id", groupId);

	if (error) {
		const indicationMessage = mapSupabaseErrorToIndicationMessage(error.message);
		if (indicationMessage) {
			throw new Error(indicationMessage);
		}

		throw new Error(`Erro ao registrar resposta da indicação: ${error.message}`);
	}

	if (decision === "aceita") {
		await recalculateAdvisorIndicationQueue(groupId);
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
