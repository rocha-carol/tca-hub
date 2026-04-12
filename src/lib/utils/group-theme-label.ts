import { parseGeneratedGroupNumber } from "@/lib/utils/group-number";

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function shortenText(value: string, maxLength = 120) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeStoredTheme(theme: string | null | undefined) {
  const normalizedTheme = normalizeText(theme);

  if (!normalizedTheme) {
    return "";
  }

  if (parseGeneratedGroupNumber(normalizedTheme) !== null) {
    return "";
  }

  return normalizedTheme;
}

export function extractThemeLabelFromSectionContent(sectionContent: string | null | undefined) {
  const normalizedSectionText = normalizeText(sectionContent);

  if (!normalizedSectionText) {
    return "";
  }

  const themeMatch = normalizedSectionText.match(/tema escolhido pelo grupo:\s*(.+?)(?:contexto inicial:|$)/i);
  if (themeMatch?.[1]) {
    return shortenText(normalizeText(themeMatch[1]));
  }

  const cleaned = normalizedSectionText
    .replace(/tema escolhido pelo grupo:/gi, "")
    .replace(/contexto inicial:/gi, "")
    .trim();

  return shortenText(cleaned);
}

export function resolveDisplayedGroupTheme(params: {
  storedTheme?: string | null;
  themeSectionContent?: string | null;
  emptyLabel?: string;
}) {
  const { storedTheme, themeSectionContent, emptyLabel = "a definir" } = params;

  const themeFromSection = extractThemeLabelFromSectionContent(themeSectionContent);
  if (themeFromSection) {
    return themeFromSection;
  }

  const normalizedStoredTheme = normalizeStoredTheme(storedTheme);
  if (normalizedStoredTheme) {
    return normalizedStoredTheme;
  }

  return emptyLabel;
}