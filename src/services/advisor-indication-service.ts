import { createClient } from "@/lib/supabase/server";
import type { Advisor } from "@/types/advisor";
import { fetchGroupAdvisorPreferences } from "./group-advisor-preference-service";
import { fetchAllAdvisors } from "./advisor-service";

export interface AdvisorIndicationCheck {
  advisor: Advisor;
  currentCount: number;
  maxOrientacoes: number;
  available: boolean;
}

export interface AdvisorIndicationResult {
  /** Primeiro orientador disponível na lista de preferências. Null se nenhum estiver disponível. */
  suggested: Advisor | null;
  /** Detalhe de cada orientador verificado na ordem de preferência. */
  checked: AdvisorIndicationCheck[];
}

interface SuggestPrimaryAdvisorOptions {
  minimumPreferenceOrder?: number;
  skipAdvisorIds?: string[];
  skipRefusedPreferences?: boolean;
}

/**
 * Percorre a lista ordenada de preferências de orientadores do grupo e retorna
 * o primeiro orientador que ainda tem vagas disponíveis (count < max_orientacoes).
 *
 * Ignora orientadores inativos.
 */
export async function suggestPrimaryAdvisorByPreference(
  groupId: string,
  options: SuggestPrimaryAdvisorOptions = {}
): Promise<AdvisorIndicationResult> {
  const supabase = await createClient();
  const minimumPreferenceOrder = options.minimumPreferenceOrder ?? 1;
  const skippedAdvisorIds = new Set((options.skipAdvisorIds ?? []).map((id) => String(id)));

  const preferences = await fetchGroupAdvisorPreferences(groupId);

  if (preferences.length === 0) {
    return { suggested: null, checked: [] };
  }

  const allAdvisors = await fetchAllAdvisors();
  const advisorMap = new Map(allAdvisors.map((a) => [String(a.id), a]));

  const checked: AdvisorIndicationCheck[] = [];

  for (const pref of preferences) {
    if (pref.preference_order < minimumPreferenceOrder) {
      continue;
    }

    if (options.skipRefusedPreferences && pref.indication_status === "recusada") {
      continue;
    }

    if (skippedAdvisorIds.has(String(pref.advisor_id))) {
      continue;
    }

    const advisor = advisorMap.get(String(pref.advisor_id));

    if (!advisor || advisor.active === false) {
      continue;
    }

    const maxOrientacoes = advisor.max_orientacoes ?? 5;

    const { count, error } = await supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("primary_advisor_id", pref.advisor_id);

    const currentCount = error ? 0 : (count ?? 0);
    const available = !error && currentCount < maxOrientacoes;

    checked.push({ advisor, currentCount, maxOrientacoes, available });

    if (available) {
      return { suggested: advisor, checked };
    }
  }

  return { suggested: null, checked };
}
