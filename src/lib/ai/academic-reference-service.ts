import type { ThemeGuideSuggestionResult } from "@/types/group-theme-guide-state";
import type { AcademicReferenceResult } from "@/types/academic-reference";

interface FindAcademicReferenceInput {
  theme: string;
  sectionText?: string | null;
  selectedInterestTags?: string[] | null;
  themeGuideSuggestions?: ThemeGuideSuggestionResult | null;
}

interface OpenAlexWork {
  title?: string;
  publication_year?: number;
  doi?: string | null;
  ids?: {
    openalex?: string | null;
  };
  primary_location?: {
    landing_page_url?: string | null;
    source?: {
      display_name?: string | null;
    } | null;
  } | null;
  authorships?: Array<{
    author?: {
      display_name?: string | null;
    } | null;
  }>;
  abstract_inverted_index?: Record<string, number[]> | null;
}

interface OpenAlexResponse {
  results?: OpenAlexWork[];
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function shortenText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getAccessDateLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function extractSearchableThemeText(sectionText: string | null | undefined, fallbackTheme: string) {
  const normalizedSectionText = normalizeText(sectionText);

  if (!normalizedSectionText) {
    return normalizeText(fallbackTheme);
  }

  const themeMatch = normalizedSectionText.match(/tema escolhido pelo grupo:\s*(.+?)(?:contexto inicial:|$)/i);
  if (themeMatch?.[1]) {
    return shortenText(normalizeText(themeMatch[1]), 220);
  }

  const cleaned = normalizedSectionText
    .replace(/tema escolhido pelo grupo:/gi, "")
    .replace(/contexto inicial:/gi, "")
    .trim();

  return shortenText(cleaned || normalizeText(fallbackTheme), 220);
}

function buildFallbackExcerpt(sectionText: string | null | undefined, fallbackTheme: string) {
  const searchableText = extractSearchableThemeText(sectionText, fallbackTheme);

  return shortenText(
    `Com base no texto salvo pelo grupo sobre ${searchableText}, a IA simulada identificou um caminho de pesquisa que pode ser aprofundado com fontes acadêmicas confiáveis. O foco da reescrita deve ser compreender a ideia principal, relacioná-la ao problema investigado e registrá-la com palavras do próprio grupo, sem copiar a formulação original.`,
    600
  );
}

function buildAcademicQuery(input: FindAcademicReferenceInput) {
  const searchableThemeText = extractSearchableThemeText(input.sectionText, input.theme);
  const parts = [
    searchableThemeText,
    ...((input.selectedInterestTags ?? []).map((tag) => normalizeText(tag)).filter(Boolean).slice(0, 3)),
    ...((input.themeGuideSuggestions?.possible_paths ?? [])
      .map((path) => normalizeText(path))
      .filter(Boolean)
      .slice(0, 1)),
  ].filter(Boolean);

  return parts.join(" ");
}

function reconstructAbstract(abstractInvertedIndex: Record<string, number[]> | null | undefined) {
  if (!abstractInvertedIndex) {
    return null;
  }

  const orderedWords: string[] = [];

  for (const [word, positions] of Object.entries(abstractInvertedIndex)) {
    for (const position of positions) {
      orderedWords[position] = word;
    }
  }

  const abstract = orderedWords.filter(Boolean).join(" ").replace(/\s+([.,;:!?])/g, "$1").trim();
  return abstract.length > 0 ? abstract : null;
}

function formatAuthors(work: OpenAlexWork) {
  const authors = (work.authorships ?? [])
    .map((item) => normalizeText(item.author?.display_name))
    .filter(Boolean)
    .slice(0, 3);

  if (authors.length === 0) {
    return "Autoria não identificada";
  }

  if ((work.authorships ?? []).length > 3) {
    return `${authors.join(", ")} et al.`;
  }

  return authors.join(", ");
}

function buildWorkUrl(work: OpenAlexWork) {
  const doi = normalizeText(work.doi);

  if (doi) {
    return doi.startsWith("http") ? doi : `https://doi.org/${doi.replace(/^https?:\/\/doi.org\//, "")}`;
  }

  const landingPage = normalizeText(work.primary_location?.landing_page_url);
  if (landingPage) {
    return landingPage;
  }

  const openAlexId = normalizeText(work.ids?.openalex);
  return openAlexId || "https://openalex.org";
}

function buildCitation(work: OpenAlexWork, workUrl: string) {
  const authors = formatAuthors(work);
  const year = work.publication_year ? String(work.publication_year) : "s.d.";
  const title = normalizeText(work.title) || "Título não identificado";
  const sourceName = normalizeText(work.primary_location?.source?.display_name) || "Fonte acadêmica";
  const accessDate = getAccessDateLabel();

  return `${authors}. ${title}. ${sourceName}, ${year}. Disponível em: <${workUrl}>. Acesso em: ${accessDate}.`;
}

function selectBestWork(results: OpenAlexWork[]) {
  const withAbstract = results.find((item) => reconstructAbstract(item.abstract_inverted_index));
  return withAbstract || results[0] || null;
}

export function buildFallbackAcademicReference(input: FindAcademicReferenceInput): AcademicReferenceResult {
  const query = buildAcademicQuery(input);
  const searchableText = extractSearchableThemeText(input.sectionText, input.theme);
  const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query || searchableText)}`;
  const accessDate = getAccessDateLabel();

  return {
    provider: "IA simulada local com fallback pedagógico baseado no texto salvo da seção",
    query: query || searchableText,
    title: "Referência pedagógica simulada",
    authors: "TCA Hub",
    year: null,
    sourceName: "Texto da seção Tema e contexto",
    excerpt: buildFallbackExcerpt(input.sectionText, input.theme),
    citation:
      `TCA HUB. Referência pedagógica simulada. Texto da seção Tema e contexto, s.d. Disponível em: <${scholarUrl}>. Acesso em: ${accessDate}.`,
    url: scholarUrl,
    scholarUrl,
  };
}

export async function findAcademicReferenceSimulated(
  input: FindAcademicReferenceInput
): Promise<AcademicReferenceResult> {
  const query = buildAcademicQuery(input);

  if (!query) {
    throw new Error("Não foi possível montar uma busca acadêmica a partir do tema do grupo.");
  }

  const response = await fetch(
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=8`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao consultar base acadêmica: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as OpenAlexResponse;
  const selectedWork = selectBestWork(payload.results ?? []);

  if (!selectedWork) {
    throw new Error("Nenhuma referência acadêmica foi encontrada para o tema do grupo.");
  }

  const abstract = reconstructAbstract(selectedWork.abstract_inverted_index);
  if (!abstract) {
    throw new Error("A referência encontrada não trouxe resumo suficiente para gerar o treino de autoria.");
  }

  const workUrl = buildWorkUrl(selectedWork);
  const title = normalizeText(selectedWork.title) || "Título não identificado";
  const authors = formatAuthors(selectedWork);
  const year = selectedWork.publication_year ? String(selectedWork.publication_year) : null;
  const sourceName = normalizeText(selectedWork.primary_location?.source?.display_name) || "Fonte acadêmica";
  const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;

  return {
    provider: "Busca acadêmica simulada com base OpenAlex + link de conferência no Google Acadêmico",
    query,
    title,
    authors,
    year,
    sourceName,
    excerpt: shortenText(abstract, 600),
    citation: buildCitation(selectedWork, workUrl),
    url: workUrl,
    scholarUrl,
  };
}
