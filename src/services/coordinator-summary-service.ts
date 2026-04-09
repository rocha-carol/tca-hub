import { createClient } from "@/lib/supabase/server";
import type { Advisor } from "@/types/advisor";
import type { Group } from "@/types/group";

export interface AdvisorLoad {
  advisor: Advisor;
  currentCount: number;
  maxOrientacoes: number;
  available: boolean;
}

export interface GroupIndicationStatus {
  group: Group;
  hasPrimaryAdvisor: boolean;
  hasPreferences: boolean;
}

export interface CoordinatorSummary {
  advisorLoads: AdvisorLoad[];
  groupIndicationStatuses: GroupIndicationStatus[];
  /** Grupos sem orientador principal */
  groupsWithoutAdvisor: number;
  /** Grupos que possuem lista de preferências mas sem orientador ainda */
  groupsPendingIndication: number;
  /** Orientadores com vagas disponíveis */
  advisorsAvailableCount: number;
  /** Orientadores sem nenhuma vaga */
  advisorsFullCount: number;
}

export async function fetchCoordinatorSummary(): Promise<CoordinatorSummary> {
  const supabase = await createClient();

  // Busca todos os grupos
  const { data: groupsData } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  const groups = (groupsData || []) as Group[];

  // Busca todos os orientadores ativos
  const { data: advisorsData } = await supabase
    .from("advisors")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  const advisors = (advisorsData || []) as Advisor[];

  // Conta quantos grupos cada orientador orienta como principal
  const loadMap = new Map<string, number>();
  for (const group of groups) {
    if (group.primary_advisor_id) {
      const key = String(group.primary_advisor_id);
      loadMap.set(key, (loadMap.get(key) ?? 0) + 1);
    }
  }

  const advisorLoads: AdvisorLoad[] = advisors.map((advisor) => {
    const currentCount = loadMap.get(String(advisor.id)) ?? 0;
    const maxOrientacoes = advisor.max_orientacoes ?? 5;
    return {
      advisor,
      currentCount,
      maxOrientacoes,
      available: currentCount < maxOrientacoes,
    };
  });

  // Verifica quais grupos têm preferências registradas
  let preferenceGroupIds = new Set<string>();
  try {
    const { data: prefsData } = await supabase
      .from("group_advisor_preferences")
      .select("group_id");

    for (const row of prefsData || []) {
      preferenceGroupIds.add(String(row.group_id));
    }
  } catch {
    // tabela pode não existir ainda
  }

  const groupIndicationStatuses: GroupIndicationStatus[] = groups.map((group) => ({
    group,
    hasPrimaryAdvisor: !!group.primary_advisor_id,
    hasPreferences: preferenceGroupIds.has(String(group.id)),
  }));

  const groupsWithoutAdvisor = groupIndicationStatuses.filter((g) => !g.hasPrimaryAdvisor).length;
  const groupsPendingIndication = groupIndicationStatuses.filter(
    (g) => !g.hasPrimaryAdvisor && g.hasPreferences
  ).length;
  const advisorsAvailableCount = advisorLoads.filter((a) => a.available).length;
  const advisorsFullCount = advisorLoads.filter((a) => !a.available).length;

  return {
    advisorLoads,
    groupIndicationStatuses,
    groupsWithoutAdvisor,
    groupsPendingIndication,
    advisorsAvailableCount,
    advisorsFullCount,
  };
}
