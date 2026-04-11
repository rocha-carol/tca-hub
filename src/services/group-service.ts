import { createClient } from "@/lib/supabase/server";
import type { AdvisorIndicationStatus, Group, GroupStatus } from "@/types/group";
import type { Profile } from "@/types/profile";
import { fetchGroupAdvisorPreferences } from "@/services/group-advisor-preference-service";
import { suggestPrimaryAdvisorByPreference } from "@/services/advisor-indication-service";
import { createGroupInternalNotification } from "@/services/group-internal-notification-service";

function isGroupsTableMissing(message: string) {
	return message.includes("Could not find the table 'public.groups'");
}

function isStatusColumnMissing(message: string) {
	return message.includes("status") && message.includes("schema cache");
}

function isStudentLinkColumnMissing(message: string) {
	return (
		(
			message.includes("student_1_id") ||
			message.includes("student_2_id") ||
			message.includes("student_3_id") ||
			message.includes("student_4_id") ||
			message.includes("student_5_id")
		) &&
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

function isOptionalAdvisorQueueInfrastructureError(message: string) {
	const normalizedMessage = message.toLowerCase();

	return (
		normalizedMessage.includes("group_advisor_preferences") ||
		normalizedMessage.includes("preferências de orientadores") ||
		normalizedMessage.includes("fila de indicação") ||
		normalizedMessage.includes("fluxo de indicação ainda não está preparado")
	);
}

function getGroupDisplayLabel(group: Pick<Group, "id" | "theme">) {
	return group.theme?.trim() || `Grupo ${String(group.id).slice(0, 8)}`;
}

async function createAdvisorIndicationSystemNotification(params: {
	group: Group;
	preferenceOrder: number;
	isAutomaticForward?: boolean;
}): Promise<void> {
	const { group, preferenceOrder, isAutomaticForward = false } = params;
	const groupLabel = getGroupDisplayLabel(group);
	const preferenceLabel = `${preferenceOrder}ª preferência`;

	const title = isAutomaticForward
		? "Nova solicitação automática de orientação"
		: "Nova solicitação de orientação";

	const message = isAutomaticForward
		? `O grupo ${groupLabel} avançou automaticamente para ${preferenceLabel} e agora aguarda sua resposta como orientador indicado.`
		: `O grupo ${groupLabel} enviou uma solicitação de orientação para ${preferenceLabel} e aguarda sua resposta.`;

	await createGroupInternalNotification({
		group_id: String(group.id),
		section_id: null,
		title,
		message,
		notification_type: "orientacao",
		author_profile_id: null,
		author_role: "coordinator",
		author_name: "TCA Hub",
	});
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
		.select("group_id, advisor_id, preference_order, indication_status")
		.order("group_id", { ascending: true })
		.order("preference_order", { ascending: true });

	if (preferencesError) {
		throw new Error(`Erro ao buscar preferências para recálculo da fila: ${preferencesError.message}`);
	}

	const preferencesMap = new Map<string, Array<{ advisor_id: string }>>();
	for (const row of preferencesRows || []) {
		const groupId = String(row.group_id);
		if (String(row.indication_status ?? "") === "recusada") {
			continue;
		}

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

async function clearPendingAdvisorPreferenceStatuses(groupId: string): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("group_advisor_preferences")
		.update({
			indication_status: null,
			indication_updated_at: new Date().toISOString(),
		})
		.eq("group_id", groupId)
		.eq("indication_status", "pendente");

	if (error) {
		throw new Error(`Erro ao limpar status pendente das preferências: ${error.message}`);
	}
}

async function updateAdvisorPreferenceIndicationStatus(
	groupId: string,
	advisorId: string,
	status: Exclude<AdvisorIndicationStatus, null>
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from("group_advisor_preferences")
		.update({
			indication_status: status,
			indication_updated_at: new Date().toISOString(),
		})
		.eq("group_id", groupId)
		.eq("advisor_id", advisorId);

	if (error) {
		throw new Error(`Erro ao atualizar status da preferência de orientador: ${error.message}`);
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
	student_4_id?: string | number | null;
	member_4_name?: string | null;
	member_4_series?: string | null;
	student_5_id?: string | number | null;
	member_5_name?: string | null;
	member_5_series?: string | null;
	theme?: string | null;
	description?: string | null;
	status?: GroupStatus;
}

async function fetchAdvisorIdForProfileId(profileId: string): Promise<string | number | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("advisors")
		.select("id")
		.eq("profile_id", profileId)
		.maybeSingle();

	if (error) {
		throw new Error(`Erro ao buscar orientador vinculado ao perfil: ${error.message}`);
	}

	return data?.id ?? null;
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
 * Busca os grupos visíveis para o perfil autenticado no contexto do MVP.
 *
 * Regras atuais:
 * - coordenador vê todos os grupos;
 * - orientador vê apenas grupos já aceitos/vinculados a ele;
 * - estudante não usa esta listagem geral.
 */
export async function fetchGroupsVisibleToProfile(profile: Pick<Profile, "id" | "role">): Promise<Group[]> {
	if (profile.role === "coordinator") {
		return fetchAllGroups();
	}

	if (profile.role !== "advisor") {
		return [];
	}

	const advisorId = await fetchAdvisorIdForProfileId(profile.id);
	if (advisorId === null) {
		return [];
	}

	const supabase = await createClient();
	const advisorIdValue = String(advisorId);

	const { data, error } = await supabase
		.from("groups")
		.select("*")
		.or(`primary_advisor_id.eq.${advisorIdValue},co_advisor_id.eq.${advisorIdValue}`)
		.order("created_at", { ascending: false });

	if (error) {
		if (isGroupsTableMissing(error.message)) {
			throw new Error(
				"Tabela groups ainda não existe no Supabase. Execute o script database/001_create_groups_table.sql no SQL Editor."
			);
		}

		throw new Error(`Erro ao buscar grupos visíveis para o perfil: ${error.message}`);
	}

	return (data || []) as Group[];
}

/**
 * Cria um novo grupo.
 *
 * MVP: criação com até 5 integrantes e suas respectivas séries.
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
		student_4_id: data.student_4_id ?? null,
		member_4_name: data.member_4_name ?? null,
		member_4_series: data.member_4_series ?? null,
		student_5_id: data.student_5_id ?? null,
		member_5_name: data.member_5_name ?? null,
		member_5_series: data.member_5_series ?? null,
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
				"Vínculo entre groups e students ainda não está completo no Supabase. Se integrantes 4 e 5 ainda não funcionarem, execute o arquivo local database/027_add_members_4_5_to_groups.sql no SQL Editor."
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

	const fullUpdatePayload = {
		primary_advisor_id: primaryAdvisorId,
		co_advisor_id: coAdvisorId,
		indicated_advisor_id: null,
		indication_status: null,
		indication_updated_at: new Date().toISOString(),
	};

	const { error } = await supabase
		.from("groups")
		.update(fullUpdatePayload)
		.eq("id", groupId);

	if (error) {
		const indicationMessage = mapSupabaseErrorToIndicationMessage(error.message);

		if (indicationMessage) {
			const { error: fallbackError } = await supabase
				.from("groups")
				.update({
					primary_advisor_id: primaryAdvisorId,
					co_advisor_id: coAdvisorId,
				})
				.eq("id", groupId);

			if (fallbackError) {
				throw new Error(`Erro ao atualizar orientadores: ${fallbackError.message}`);
			}

			return;
		}

		throw new Error(`Erro ao atualizar orientadores: ${error.message}`);
	}

	try {
		await recalculateAdvisorIndicationQueue(groupId);
	} catch (queueError) {
		const message = queueError instanceof Error ? queueError.message : String(queueError ?? "");

		if (!isOptionalAdvisorQueueInfrastructureError(message)) {
			throw queueError;
		}
	}
}

/**
 * Inicia o fluxo de indicação de orientador principal para um grupo.
 */
export async function initiateAdvisorIndication(
	groupId: string,
	indicatedAdvisorId: string
): Promise<void> {
	const group = await fetchGroupById(groupId);
	if (!group) {
		throw new Error("Grupo não encontrado para iniciar indicação.");
	}

	const supabase = await createClient();

	await clearPendingAdvisorPreferenceStatuses(groupId);

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

	await updateAdvisorPreferenceIndicationStatus(groupId, indicatedAdvisorId, "pendente");
	await createAdvisorIndicationSystemNotification({
		group,
		preferenceOrder: 1,
	});
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

	const indicatedAdvisorId = String(group.indicated_advisor_id);
	const preferences = await fetchGroupAdvisorPreferences(groupId);
	const currentPreference = preferences.find((preference) => String(preference.advisor_id) === indicatedAdvisorId) ?? null;

	const supabase = await createClient();

	if (decision === "aceita") {
		const { error } = await supabase
			.from("groups")
			.update({
				primary_advisor_id: group.indicated_advisor_id,
				co_advisor_id: normalizedCoAdvisorId,
				indication_status: "aceita",
				indication_updated_at: new Date().toISOString(),
			})
			.eq("id", groupId);

		if (error) {
			const indicationMessage = mapSupabaseErrorToIndicationMessage(error.message);
			if (indicationMessage) {
				throw new Error(indicationMessage);
			}

			throw new Error(`Erro ao registrar resposta da indicação: ${error.message}`);
		}

		await clearPendingAdvisorPreferenceStatuses(groupId);
		await updateAdvisorPreferenceIndicationStatus(groupId, indicatedAdvisorId, "aceita");
		await recalculateAdvisorIndicationQueue(groupId);
		return;
	}

	await clearPendingAdvisorPreferenceStatuses(groupId);
	await updateAdvisorPreferenceIndicationStatus(groupId, indicatedAdvisorId, "recusada");

	const nextPreferenceStartOrder = currentPreference ? currentPreference.preference_order + 1 : 1;
	const nextAdvisor = await suggestPrimaryAdvisorByPreference(groupId, {
		minimumPreferenceOrder: nextPreferenceStartOrder,
		skipAdvisorIds: [indicatedAdvisorId],
		skipRefusedPreferences: true,
	});

	const nextAdvisorId = nextAdvisor.suggested ? String(nextAdvisor.suggested.id) : null;
	const { error } = await supabase
		.from("groups")
		.update({
			indicated_advisor_id: nextAdvisorId,
			indication_status: nextAdvisorId ? "pendente" : "recusada",
			indication_updated_at: new Date().toISOString(),
		})
		.eq("id", groupId);

	if (error) {
		const indicationMessage = mapSupabaseErrorToIndicationMessage(error.message);
		if (indicationMessage) {
			throw new Error(indicationMessage);
		}

		throw new Error(`Erro ao registrar resposta da indicação: ${error.message}`);
	}

	if (nextAdvisorId) {
		await updateAdvisorPreferenceIndicationStatus(groupId, nextAdvisorId, "pendente");
		const nextPreference = preferences.find((preference) => String(preference.advisor_id) === nextAdvisorId) ?? null;
		await createAdvisorIndicationSystemNotification({
			group,
			preferenceOrder: nextPreference?.preference_order ?? nextPreferenceStartOrder,
			isAutomaticForward: true,
		});
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

export async function addStudentToGroup(groupId: string, studentId: string | number): Promise<void> {
	const group = await fetchGroupById(groupId);

	if (!group) {
		throw new Error("Grupo não encontrado para adicionar integrante.");
	}

	const supabase = await createClient();
	const normalizedStudentId = typeof studentId === "number" ? studentId : /^\d+$/.test(String(studentId)) ? Number(studentId) : String(studentId).trim();

	const existingStudentIds = [group.student_1_id, group.student_2_id, group.student_3_id, group.student_4_id, group.student_5_id]
		.map((value) => String(value ?? ""))
		.filter(Boolean);

	if (existingStudentIds.includes(String(normalizedStudentId))) {
		throw new Error("Este estudante já faz parte deste grupo.");
	}

	const { data: studentData, error: studentError } = await supabase
		.from("students")
		.select("id, name, grade, active")
		.eq("id", normalizedStudentId)
		.single();

	if (studentError || !studentData) {
		throw new Error(`Erro ao buscar estudante para inclusão no grupo: ${studentError?.message || "Estudante não encontrado."}`);
	}

	if (studentData.active === false) {
		throw new Error("Estudante inativo não pode ser adicionado ao grupo.");
	}

	const { data: groupsData, error: groupsError } = await supabase
		.from("groups")
		.select("id, student_1_id, student_2_id, student_3_id, student_4_id, student_5_id");

	if (groupsError) {
		throw new Error(`Erro ao validar vínculo atual do estudante: ${groupsError.message}`);
	}

	const isLinkedToAnotherGroup = (groupsData || []).some((currentGroup) => {
		if (String(currentGroup.id) === String(groupId)) {
			return false;
		}

		return [currentGroup.student_1_id, currentGroup.student_2_id, currentGroup.student_3_id, currentGroup.student_4_id, currentGroup.student_5_id]
			.some((value) => String(value ?? "") === String(normalizedStudentId));
	});

	if (isLinkedToAnotherGroup) {
		throw new Error("Este estudante já está vinculado a outro grupo.");
	}

	const nextSlot = [2, 3, 4, 5].find((slot) => {
		const studentId = group[`student_${slot}_id` as keyof Group];
		const memberName = group[`member_${slot}_name` as keyof Group];

		return !studentId && !memberName;
	});

	if (!nextSlot) {
		throw new Error("Este grupo já possui 5 integrantes.");
	}

	const payload = {
		[`student_${nextSlot}_id`]: normalizedStudentId,
		[`member_${nextSlot}_name`]: studentData.name,
		[`member_${nextSlot}_series`]: studentData.grade || "Série não informada",
	};

	const { error: updateError } = await supabase
		.from("groups")
		.update(payload)
		.eq("id", groupId);

	if (updateError) {
		throw new Error(`Erro ao adicionar integrante ao grupo: ${updateError.message}`);
	}
}
