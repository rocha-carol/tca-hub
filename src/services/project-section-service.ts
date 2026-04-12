import { createClient } from "@/lib/supabase/server";
import type {
  GroupProjectSection,
  ProjectSectionStatus,
  ProjectSectionTemplate,
} from "@/types/project-section";

export const DEFAULT_TCA_PROJECT_SECTIONS: ProjectSectionTemplate[] = [
  {
    section_key: "tema_contexto",
    section_title: "Tema e contexto",
    section_description: "Apresenta o tema, contexto da turma/escola e recorte inicial.",
    section_order: 1,
  },
  {
    section_key: "problema_justificativa",
    section_title: "Problema e justificativa",
    section_description: "Define o problema investigado e justifica sua relevância.",
    section_order: 2,
  },
  {
    section_key: "objetivos",
    section_title: "Objetivos",
    section_description: "Registra objetivo geral e objetivos específicos do projeto.",
    section_order: 3,
  },
  {
    section_key: "metodologia_plano",
    section_title: "Metodologia e plano de ação",
    section_description: "Detalha estratégias, cronograma inicial e divisão de tarefas.",
    section_order: 4,
  },
  {
    section_key: "desenvolvimento_registros",
    section_title: "Desenvolvimento e registros",
    section_description: "Consolida execução, evidências, ajustes e aprendizados do processo.",
    section_order: 5,
  },
  {
    section_key: "resultado_produto_final",
    section_title: "Resultados e produto final",
    section_description: "Apresenta resultados, produto final e avaliação geral do TCA.",
    section_order: 6,
  },
];

function isProjectSectionsTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_project_sections'");
}

function isProjectSectionsPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapProjectSectionsErrorMessage(message: string, code?: string) {
  if (isProjectSectionsTableMissing(message)) {
    return "Tabela group_project_sections ainda não existe no Supabase. Execute o arquivo local database/010_create_group_project_sections.sql no SQL Editor.";
  }

  if (isProjectSectionsPermissionDenied(message, code)) {
    return "Acesso às seções de projeto bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupProjectSections(groupId: string): Promise<GroupProjectSection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_sections")
    .select("*")
    .eq("group_id", groupId)
    .order("section_order", { ascending: true });

  if (error) {
    const mapped = mapProjectSectionsErrorMessage(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar seções do projeto: ${error.message}`);
  }

  return (data || []) as GroupProjectSection[];
}

export async function fetchThemeSectionContentMap(groupIds: string[]): Promise<Map<string, string | null>> {
  if (groupIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_project_sections")
    .select("group_id, content")
    .eq("section_key", "tema_contexto")
    .in("group_id", groupIds);

  if (error) {
    const mapped = mapProjectSectionsErrorMessage(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar seções de tema dos grupos: ${error.message}`);
  }

  return new Map((data || []).map((item) => [String(item.group_id), item.content ?? null]));
}

export async function ensureGroupProjectSectionsStructure(groupId: string): Promise<GroupProjectSection[]> {
  const existingSections = await fetchGroupProjectSections(groupId);
  const existingKeys = new Set(existingSections.map((section) => section.section_key));

  const missingTemplates = DEFAULT_TCA_PROJECT_SECTIONS.filter(
    (section) => !existingKeys.has(section.section_key)
  );

  if (missingTemplates.length === 0) {
    return existingSections;
  }

  const supabase = await createClient();

  const payload = missingTemplates.map((section) => ({
    group_id: groupId,
    section_key: section.section_key,
    section_title: section.section_title,
    section_description: section.section_description,
    section_order: section.section_order,
    content: null,
    status: "nao_iniciado",
  }));

  const { error } = await supabase
    .from("group_project_sections")
    .insert(payload);

  if (error) {
    const mapped = mapProjectSectionsErrorMessage(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao estruturar seções do projeto: ${error.message}`);
  }

  return fetchGroupProjectSections(groupId);
}

export async function updateGroupProjectSection(
  sectionId: string | number,
  data: {
    content: string | null;
    status: ProjectSectionStatus;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_project_sections")
    .update({
      content: data.content,
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sectionId);

  if (error) {
    const mapped = mapProjectSectionsErrorMessage(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao atualizar seção do projeto: ${error.message}`);
  }
}
