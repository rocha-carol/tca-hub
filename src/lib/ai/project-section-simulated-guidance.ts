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

function toSentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[\s,;:.!?]+$/g, "").trim();
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
      : `O grupo percebeu que ${problemReference}. Esse cenário chama atenção porque afeta a vivência de estudantes e da comunidade, revelando uma situação que precisa ser compreendida com mais cuidado. Por isso, investigar esse problema no TCA pode ajudar o grupo a analisar causas, impactos e possibilidades de transformação.` ,
    themeReferenceLabel: resolveThemeReferenceLabel(input, focusLabel),
  };
}