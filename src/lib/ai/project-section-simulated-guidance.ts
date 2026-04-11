import type { ThemeGuideSuggestionResult } from "@/types/group-theme-guide-state";

interface GenerateProblemJustificationGuidanceInput {
  groupTheme?: string | null;
  themeSectionContent?: string | null;
  currentSectionContent?: string | null;
  selectedInterestTags?: string[];
  themeGuideDraftNotes?: string | null;
  themeGuideSuggestions?: ThemeGuideSuggestionResult | null;
}

export interface SimulatedProblemJustificationGuidance {
  objective: string;
  guidingQuestions: string[];
  howToWrite: string;
  writingSupportTitle: string;
  writingSupportTips: string[];
  starterText: string;
  themeReferenceLabel: string;
}

export interface WritingGuidanceReference {
  guidingQuestions: string[];
  howToWrite: string;
}

export interface SimulatedWritingAnalysis {
  score: number;
  level: "inicio" | "rascunho" | "desenvolvimento" | "consistente" | "forte";
  levelLabel: string;
  levelDescription: string;
  encouragement: string;
  feedbackPhrases: string[];
  improvementTips: string[];
  metrics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    keywordCoverage: number;
  };
}

function normalizeText(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function countSentences(value: string): number {
  return value
    .split(/[.!?]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
}

function countParagraphs(value: string): number {
  return value
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
}

const STOPWORDS = new Set([
  "como", "qual", "quais", "porque", "por", "para", "com", "sem", "uma", "umas", "uns", "um",
  "dos", "das", "que", "quem", "mais", "menos", "sobre", "esse", "essa", "esses", "essas",
  "este", "esta", "isto", "ser", "estar", "são", "foi", "sua", "seu", "suas", "seus", "tem",
  "também", "pode", "podem", "muito", "muita", "muitas", "muitos", "grupo", "texto", "seção",
  "tca", "território", "comunidade", "escola", "escrever", "investigar", "investigado",
]);

function extractRelevantKeywords(value: string): string[] {
  return uniqueValues(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 5 && !STOPWORDS.has(word))
  );
}

function calculateKeywordCoverage(text: string, referenceKeywords: string[]): number {
  if (referenceKeywords.length === 0) {
    return 0;
  }

  const normalizedText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const matches = referenceKeywords.filter((keyword) => normalizedText.includes(keyword));
  return Math.min(100, Math.round((matches.length / referenceKeywords.length) * 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toSentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[\s,;:.!?]+$/g, "").trim();
}

function startsWithConnectorClause(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("como ") ||
    normalized.startsWith("que ") ||
    normalized.startsWith("por que ") ||
    normalized.startsWith("de que forma ") ||
    normalized.startsWith("quais ") ||
    normalized.startsWith("qual ")
  );
}

function buildProblemLead(problemReference: string): string {
  const normalized = stripTrailingPunctuation(problemReference);

  if (!normalized) {
    return "O grupo percebeu um problema que merece investigação";
  }

  if (startsWithConnectorClause(normalized)) {
    return `O grupo percebeu ${normalized}`;
  }

  return `O grupo percebeu que ${normalized}`;
}

function extractFirstMeaningfulSentence(value?: string | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const [firstSentence] = normalized.split(/(?<=[.!?])\s+/);
  const candidate = stripTrailingPunctuation(firstSentence || normalized);
  return candidate.length > 0 ? candidate : null;
}

function summarizeInterestTags(tags?: string[]): string | null {
  const normalizedTags = uniqueValues((tags ?? []).map((tag) => tag.toLowerCase()));

  if (normalizedTags.length === 0) {
    return null;
  }

  if (normalizedTags.length === 1) {
    return normalizedTags[0];
  }

  if (normalizedTags.length === 2) {
    return `${normalizedTags[0]} e ${normalizedTags[1]}`;
  }

  return `${normalizedTags.slice(0, 2).join(", ")} e ${normalizedTags[2]}`;
}

function resolveFocusLabel(input: GenerateProblemJustificationGuidanceInput): string {
  const directTheme = normalizeText(input.groupTheme);
  if (directTheme) {
    return stripTrailingPunctuation(directTheme);
  }

  const possiblePath = normalizeText(input.themeGuideSuggestions?.possible_paths?.[0] ?? null);
  if (possiblePath) {
    return stripTrailingPunctuation(possiblePath);
  }

  const interestSummary = summarizeInterestTags(input.selectedInterestTags);
  if (interestSummary) {
    return `os interesses do grupo em ${interestSummary}`;
  }

  const themeNotes = extractFirstMeaningfulSentence(input.themeGuideDraftNotes);
  if (themeNotes) {
    return themeNotes;
  }

  const themeSection = extractFirstMeaningfulSentence(input.themeSectionContent);
  if (themeSection) {
    return themeSection;
  }

  return "o tema escolhido pelo grupo";
}

function resolveObservedContext(input: GenerateProblemJustificationGuidanceInput): string {
  const themeSection = extractFirstMeaningfulSentence(input.themeSectionContent);
  if (themeSection) {
    return themeSection;
  }

  const draftNotes = extractFirstMeaningfulSentence(input.themeGuideDraftNotes);
  if (draftNotes) {
    return draftNotes;
  }

  const starterQuestion = normalizeText(input.themeGuideSuggestions?.conversation_starters?.[0] ?? null);
  if (starterQuestion) {
    return stripTrailingPunctuation(starterQuestion);
  }

  return "uma situação observada na escola, no bairro ou na comunidade";
}

function resolveThemeReferenceLabel(input: GenerateProblemJustificationGuidanceInput, focusLabel: string): string {
  const tags = summarizeInterestTags(input.selectedInterestTags);
  if (tags) {
    return `Tema base: ${focusLabel} · interesses do grupo: ${tags}`;
  }

  return `Tema base: ${focusLabel}`;
}

export function generateProblemJustificationGuidanceSimulated(
  input: GenerateProblemJustificationGuidanceInput
): SimulatedProblemJustificationGuidance {
  const focusLabel = toSentenceCase(resolveFocusLabel(input));
  const observedContext = stripTrailingPunctuation(resolveObservedContext(input));
  const currentSectionSentence = extractFirstMeaningfulSentence(input.currentSectionContent);
  const hasDraft = Boolean(normalizeText(input.currentSectionContent));
  const problemReference = currentSectionSentence
    ? stripTrailingPunctuation(currentSectionSentence)
    : `${focusLabel.toLowerCase()} aparece ligado a ${observedContext.toLowerCase()}`;
  const problemLead = buildProblemLead(problemReference);

  return {
    objective: `Transformar o tema “${focusLabel}” em um problema investigável e justificar por que ele merece atenção no TCA.`,
    guidingQuestions: [
      `Qual recorte de “${focusLabel}” mais aparece em ${observedContext.toLowerCase()} e pode ser investigado com mais profundidade?`,
      `Quem é afetado por esse problema relacionado a ${focusLabel.toLowerCase()} e quais sinais concretos mostram esse impacto?`,
      `Por que compreender esse problema pode gerar aprendizagem, reflexão ou alguma melhoria para a escola, o território ou a comunidade?`,
    ],
    howToWrite:
      "Comece nomeando o problema em linguagem direta. Depois explique quem é afetado, apresente sinais observados pelo grupo e feche justificando por que investigar isso faz sentido no contexto do TCA.",
    writingSupportTitle: hasDraft
      ? "IA simulada — como aprofundar o texto que já existe"
      : "IA simulada — um jeito simples de começar a escrita",
    writingSupportTips: [
      `Abra o texto com uma frase que mostre o problema de forma objetiva, sem começar ainda pela solução.`,
      `Use pelo menos um exemplo real, observado pelo grupo, que conecte o tema a ${observedContext.toLowerCase()}.`,
      "Finalize explicando por que esse problema merece ser estudado agora e o que o grupo espera compreender melhor ao investigá-lo.",
    ],
    starterText: hasDraft
      ? `O texto já aponta que ${problemReference}. Para fortalecer a justificativa, vale explicitar melhor quais pessoas ou espaços são mais afetados e por que esse recorte merece investigação no TCA.`
      : `${problemLead}. Esse cenário chama atenção porque afeta a vivência de estudantes e da comunidade, revelando uma situação que precisa ser compreendida com mais cuidado. Por isso, investigar esse problema no TCA pode ajudar o grupo a analisar causas, impactos e possibilidades de transformação.`,
    themeReferenceLabel: resolveThemeReferenceLabel(input, focusLabel),
  };
}

export function analyzeSectionWritingSimulated(input: {
  text: string;
  sectionTitle: string;
  sectionKey: string;
  guidance: WritingGuidanceReference;
  writingSupportTips?: string[];
}): SimulatedWritingAnalysis {
  const text = normalizeWhitespace(input.text);
  const wordCount = countWords(text);
  const sentenceCount = countSentences(text);
  const paragraphCount = text ? countParagraphs(input.text) : 0;

  const referenceKeywords = uniqueValues([
    ...extractRelevantKeywords(input.sectionTitle),
    ...extractRelevantKeywords(input.guidance.guidingQuestions.join(" ")),
    ...extractRelevantKeywords(input.guidance.howToWrite),
    ...extractRelevantKeywords((input.writingSupportTips ?? []).join(" ")),
  ]).slice(0, 12);

  const keywordCoverage = calculateKeywordCoverage(text, referenceKeywords);
  const connectorMatches = (text.toLowerCase().match(/\b(porque|por isso|assim|desse modo|al[eé]m disso|portanto|ou seja|isso mostra|isso revela)\b/g) ?? []).length;

  const wordScore = clamp(Math.round((Math.min(wordCount, 180) / 180) * 35), 0, 35);
  const sentenceScore = clamp(Math.round((Math.min(sentenceCount, 6) / 6) * 20), 0, 20);
  const paragraphScore = clamp(Math.round((Math.min(paragraphCount, 3) / 3) * 10), 0, 10);
  const keywordScore = clamp(Math.round((keywordCoverage / 100) * 20), 0, 20);
  const cohesionScore = clamp(Math.min(connectorMatches, 3) * 5, 0, 15);
  const score = clamp(wordScore + sentenceScore + paragraphScore + keywordScore + cohesionScore, 0, 100);

  let level: SimulatedWritingAnalysis["level"] = "inicio";
  let levelLabel = "Começando";
  let levelDescription = "O texto ainda está no ponto de partida.";
  let encouragement = `Vale começar registrando a ideia principal de ${input.sectionTitle.toLowerCase()} com uma frase simples e direta.`;
  let feedbackPhrases = [
    "O campo ainda está vazio ou muito curto para o termômetro perceber um argumento completo.",
    "Começar com uma frase imperfeita já ajuda a IA simulada a oferecer dicas mais úteis.",
  ];

  if (score >= 80) {
    level = "forte";
    levelLabel = "Muito consistente";
    levelDescription = "O texto já mostra autoria, desenvolvimento e boa direção argumentativa.";
    encouragement = "A escrita já está bem estruturada. Agora vale revisar precisão, fluidez e força dos exemplos.";
    feedbackPhrases = [
      "O argumento já aparece com boa consistência e transmite com clareza o que o grupo quer defender.",
      "Há sinais de desenvolvimento autoral: o texto explica, conecta ideias e sustenta melhor o raciocínio.",
    ];
  } else if (score >= 60) {
    level = "consistente";
    levelLabel = "Bem encaminhado";
    levelDescription = "O texto já tem base sólida, mas ainda pode ganhar mais profundidade e acabamento.";
    encouragement = "O caminho está bom. Falta lapidar melhor os exemplos e deixar a justificativa mais convincente.";
    feedbackPhrases = [
      "Já existe um núcleo argumentativo perceptível e o texto começa a se sustentar sozinho.",
      "A escrita está deixando de ser só rascunho e entrando numa versão mais consciente e explicativa.",
    ];
  } else if (score >= 35) {
    level = "desenvolvimento";
    levelLabel = "Em desenvolvimento";
    levelDescription = "Há conteúdo relevante, mas ainda faltam detalhes para o texto ganhar força.";
    encouragement = "O texto já saiu do começo. Agora o mais importante é explicar melhor as relações entre problema, impacto e justificativa.";
    feedbackPhrases = [
      "A ideia principal começou a aparecer, mas ainda pode ficar mais específica e melhor conectada.",
      "O termômetro percebe avanço, porém o texto ainda pede mais desenvolvimento para convencer de verdade.",
    ];
  } else if (score >= 15) {
    level = "rascunho";
    levelLabel = "Rascunho inicial";
    levelDescription = "Já existe ponto de partida, mas o texto ainda está bem curto ou fragmentado.";
    encouragement = "Ótimo começo. Vale transformar as frases soltas em uma explicação mais completa.";
    feedbackPhrases = [
      "O texto começou a nascer e já oferece material para aprofundar a escrita.",
      "Ainda está curto, mas o foco inicial já permite orientar os próximos passos com mais precisão.",
    ];
  }

  const improvementTips: string[] = [];

  if (wordCount < 45) {
    improvementTips.push("Escreva um pouco mais: explique a ideia principal com pelo menos duas ou três frases conectadas.");
  }

  if (sentenceCount < 3) {
    improvementTips.push("Transforme o rascunho em um pequeno bloco argumentativo: apresente o problema, explique o impacto e justifique por que investigar.");
  }

  if (paragraphCount < 2 && wordCount >= 70) {
    improvementTips.push("Divida o texto em dois momentos: primeiro o problema, depois a justificativa. Isso melhora a organização da leitura.");
  }

  if (keywordCoverage < 35) {
    improvementTips.push("Retome as perguntas norteadoras e use no texto palavras-chave da seção para deixar o foco mais claro.");
  }

  if (connectorMatches === 0) {
    improvementTips.push("Inclua conectores como “porque”, “por isso” ou “isso mostra” para deixar o raciocínio mais encadeado.");
  }

  if (input.sectionKey === "problema_justificativa" && !/\b(afeta|impacta|impacto|atinge|atingidos|relevante|importante|justifica|merece)\b/i.test(text)) {
    improvementTips.push("Explique com mais nitidez quem é afetado e por que esse problema merece ser investigado no TCA.");
  }

  const fallbackTip = input.writingSupportTips?.[0] ?? `Retome a orientação principal da seção e revise se o texto responde ao que ${input.sectionTitle.toLowerCase()} precisa comunicar.`;

  return {
    score,
    level,
    levelLabel,
    levelDescription,
    encouragement,
    feedbackPhrases,
    improvementTips: uniqueValues(improvementTips).slice(0, 3).length > 0
      ? uniqueValues(improvementTips).slice(0, 3)
      : [fallbackTip],
    metrics: {
      wordCount,
      sentenceCount,
      paragraphCount,
      keywordCoverage,
    },
  };
}