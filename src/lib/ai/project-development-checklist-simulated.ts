type ChecklistSectionStatus = "nao_iniciado" | "em_andamento" | "concluido";

type ChecklistSectionInput = {
  id: string | number;
  section_key: string;
  section_title: string;
  status: ChecklistSectionStatus;
  content?: string | null;
};

type ExistingChecklistItemInput = {
  item_text: string;
};

export type SimulatedChecklistSuggestion = {
  section_id: string | number | null;
  item_text: string;
  priority: "alta" | "media" | "baixa";
};

interface GenerateSimulatedChecklistInput {
  sections: ChecklistSectionInput[];
  existingItems: ExistingChecklistItemInput[];
}

type SectionChecklistTemplate = {
  start: string;
  deepen: string;
  review: string;
};

const SECTION_TEMPLATES: Record<string, SectionChecklistTemplate> = {
  tema_contexto: {
    start: "Esboçar a contextualização do tema, destacando território, relevância e motivação inicial do grupo.",
    deepen: "Aprofundar a contextualização do tema com evidências do território e exemplos concretos observados pelo grupo.",
    review: "Revisar se a contextualização do tema deixa claro por que esse recorte importa para a comunidade escolar.",
  },
  problema_justificativa: {
    start: "Definir o problema investigado, indicando quem é afetado e por que esse recorte merece investigação.",
    deepen: "Fortalecer a justificativa do problema com impactos, sinais concretos e relevância pedagógica do recorte.",
    review: "Revisar se problema e justificativa estão coerentes com a realidade observada e com a proposta do TCA.",
  },
  objetivos: {
    start: "Registrar um objetivo geral claro e pelo menos dois objetivos específicos acionáveis para o projeto.",
    deepen: "Refinar objetivos para que fiquem mensuráveis, coerentes com o problema e viáveis para o grupo.",
    review: "Verificar se os objetivos dialogam com o problema e orientam corretamente o percurso investigativo.",
  },
  metodologia_plano: {
    start: "Descrever a metodologia inicial, definindo etapas, responsáveis e recursos necessários para a investigação.",
    deepen: "Detalhar o plano metodológico com sequência de ações, fontes, instrumentos e divisão de responsabilidades.",
    review: "Revisar se a metodologia explica com clareza como o grupo vai investigar, registrar e validar o percurso.",
  },
  desenvolvimento_registros: {
    start: "Começar o registro do desenvolvimento, reunindo evidências, decisões do grupo e aprendizados do processo.",
    deepen: "Ampliar os registros do desenvolvimento com evidências concretas, revisões de rota e avanços da investigação.",
    review: "Revisar se os registros do desenvolvimento mostram autoria, processo e aprendizados do grupo com clareza.",
  },
  resultado_produto_final: {
    start: "Estruturar os resultados esperados e a relação deles com o produto final do projeto.",
    deepen: "Conectar resultados parciais ao produto final, explicando impacto, aplicabilidade e continuidade do trabalho.",
    review: "Revisar se resultados e produto final respondem ao problema inicial e mostram o valor do percurso realizado.",
  },
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getContentLength(content?: string | null) {
  return (content ?? "").replace(/\s+/g, " ").trim().length;
}

function resolveTemplate(sectionKey: string, sectionTitle: string): SectionChecklistTemplate {
  const template = SECTION_TEMPLATES[sectionKey];
  if (template) {
    return template;
  }

  return {
    start: `Começar a desenvolver a seção “${sectionTitle}” com uma primeira versão autoral do conteúdo.`,
    deepen: `Aprofundar a seção “${sectionTitle}” com exemplos, evidências e maior clareza argumentativa.`,
    review: `Revisar a seção “${sectionTitle}” para garantir coerência, clareza e relação com o restante do projeto.`,
  };
}

function buildSuggestionForSection(section: ChecklistSectionInput): SimulatedChecklistSuggestion | null {
  const template = resolveTemplate(section.section_key, section.section_title);
  const contentLength = getContentLength(section.content);

  if (section.status === "nao_iniciado" || contentLength === 0) {
    return {
      section_id: section.id,
      item_text: template.start,
      priority: "alta",
    };
  }

  if (section.status === "em_andamento" || contentLength < 180) {
    return {
      section_id: section.id,
      item_text: template.deepen,
      priority: "media",
    };
  }

  if (contentLength < 420) {
    return {
      section_id: section.id,
      item_text: template.review,
      priority: "baixa",
    };
  }

  return null;
}

function buildGeneralSuggestions(sections: ChecklistSectionInput[]): SimulatedChecklistSuggestion[] {
  const notStarted = sections.filter((section) => section.status === "nao_iniciado").length;
  const inProgress = sections.filter((section) => section.status === "em_andamento").length;
  const completed = sections.filter((section) => section.status === "concluido").length;

  const suggestions: SimulatedChecklistSuggestion[] = [];

  if (notStarted >= 2) {
    suggestions.push({
      section_id: null,
      item_text: "Organizar a sequência de escrita das próximas etapas, distribuindo responsáveis e prazos internos entre os integrantes.",
      priority: "alta",
    });
  }

  if (inProgress >= 2) {
    suggestions.push({
      section_id: null,
      item_text: "Registrar o que já avançou, o que ainda precisa de revisão e quais entregas devem ser priorizadas no próximo encontro.",
      priority: "media",
    });
  }

  if (sections.length > 0 && completed === sections.length) {
    suggestions.push({
      section_id: null,
      item_text: "Fazer uma revisão final de coerência entre problema, objetivos, metodologia, desenvolvimento e produto final antes da apresentação.",
      priority: "baixa",
    });
  }

  return suggestions;
}

export function generateProjectDevelopmentChecklistSimulated(
  input: GenerateSimulatedChecklistInput
): SimulatedChecklistSuggestion[] {
  const existingTexts = new Set(input.existingItems.map((item) => normalizeText(item.item_text)).filter(Boolean));
  const generatedTexts = new Set<string>();

  const sectionSuggestions = input.sections
    .map((section) => buildSuggestionForSection(section))
    .filter((suggestion): suggestion is SimulatedChecklistSuggestion => suggestion !== null);

  const generalSuggestions = buildGeneralSuggestions(input.sections);

  const ordered = [...sectionSuggestions, ...generalSuggestions].sort((left, right) => {
    const priorities = { alta: 0, media: 1, baixa: 2 } as const;
    return priorities[left.priority] - priorities[right.priority];
  });

  const uniqueSuggestions: SimulatedChecklistSuggestion[] = [];

  for (const suggestion of ordered) {
    const normalized = normalizeText(suggestion.item_text);
    if (!normalized || existingTexts.has(normalized) || generatedTexts.has(normalized)) {
      continue;
    }

    generatedTexts.add(normalized);
    uniqueSuggestions.push(suggestion);
  }

  return uniqueSuggestions.slice(0, 6);
}
