"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ThemeGuideSuggestionResult } from "@/types/group-theme-guide-state";

interface StudentWaitingStudyCardProps {
  groupId?: string;
  themeText: string | null;
  themeGuideSuggestions: ThemeGuideSuggestionResult | null;
}

interface StudyLinkSuggestion {
  title: string;
  description: string;
  href: string;
  sourceLabel: string;
}

interface GuidanceCardItem {
  title: string;
  description: string;
}

interface RewritingFeedback {
  badgeVariant: "green" | "yellow" | "gray";
  title: string;
  summary: string;
  tips: string[];
}

const STOP_WORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "e",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "para",
  "por",
  "com",
  "sem",
  "que",
  "como",
  "mais",
  "sobre",
  "ao",
  "aos",
  "à",
  "às",
  "se",
  "ser",
  "sua",
  "suas",
  "seu",
  "seus",
  "tema",
  "grupo",
]);

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

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildSearchHref(baseUrl: string, query: string) {
  return `${baseUrl}${encodeURIComponent(query)}`;
}

function resolveThemeReference(themeText: string | null, themeGuideSuggestions: ThemeGuideSuggestionResult | null) {
  const normalizedTheme = normalizeText(themeText);
  const normalizedSummary = normalizeText(themeGuideSuggestions?.interest_summary);
  const firstPossiblePath = normalizeText(themeGuideSuggestions?.possible_paths?.[0]);

  return normalizedTheme || normalizedSummary || firstPossiblePath || "tema do grupo";
}

function buildStudyLinks(
  themeReference: string,
  themeGuideSuggestions: ThemeGuideSuggestionResult | null
): StudyLinkSuggestion[] {
  const possiblePaths = (themeGuideSuggestions?.possible_paths ?? [])
    .map((item) => normalizeText(item))
    .filter(Boolean);
  const conversationStarter = normalizeText(themeGuideSuggestions?.conversation_starters?.[0]);

  const introductoryQuery = `${themeReference} introdução panorama conceitos principais`;
  const academicQuery = `${possiblePaths[0] || themeReference} pesquisa artigo estudo`;
  const portugueseQuery = `${possiblePaths[1] || themeReference} scielo educação brasil`;

  return [
    {
      title: "Leitura introdutória",
      description:
        themeGuideSuggestions?.interest_summary ||
        "Uma busca inicial para ampliar repertório e chegar ao encontro com mais clareza sobre o tema.",
      href: buildSearchHref("https://www.google.com/search?q=", introductoryQuery),
      sourceLabel: "Busca guiada",
    },
    {
      title: "Estudos e artigos",
      description:
        possiblePaths[0] ||
        "Um caminho de aprofundamento para localizar pesquisas, conceitos e materiais mais densos.",
      href: buildSearchHref("https://scholar.google.com/scholar?q=", academicQuery),
      sourceLabel: "Google Acadêmico",
    },
    {
      title: "Leituras em português",
      description:
        possiblePaths[1] || conversationStarter || "Uma trilha para encontrar textos e referências acessíveis em português.",
      href: buildSearchHref("https://search.scielo.org/?q=", portugueseQuery),
      sourceLabel: "SciELO",
    },
  ];
}

function buildReliableSourceTips(themeReference: string): GuidanceCardItem[] {
  return [
    {
      title: "Comece por fontes confiáveis",
      description: `Ao pesquisar sobre ${themeReference}, vale priorizar artigos, revistas científicas, instituições educacionais, órgãos públicos e portais especializados.`,
    },
    {
      title: "Compare mais de uma fonte",
      description: "Não ficar com o primeiro resultado ajuda a perceber diferenças de abordagem, confirmar informações e ampliar repertório.",
    },
    {
      title: "Anote o que pode virar referência",
      description: "Título, autoria, ano, link e ideia principal já bastam para começar a organizar futuras referências do trabalho.",
    },
  ];
}

function buildAuthorshipTips(): GuidanceCardItem[] {
  return [
    {
      title: "Cópia não é pesquisa",
      description: "Copiar trechos prontos sem transformação autoral enfraquece a investigação e impede que o grupo demonstre compreensão real do tema.",
    },
    {
      title: "Plágio acontece quando a ideia alheia aparece como se fosse sua",
      description: "Mesmo ao trocar poucas palavras, ainda pode existir plágio se a fonte não for reconhecida e se o texto continuar preso à formulação original.",
    },
    {
      title: "Referenciar é mostrar de onde veio a base",
      description: "Uma boa prática inicial é registrar autor, título, ano e link da leitura para usar a fonte como apoio na escrita do próprio grupo.",
    },
  ];
}

function buildWritingTips(themeReference: string): GuidanceCardItem[] {
  return [
    {
      title: "Leia, destaque, feche a fonte e explique com suas palavras",
      description: `Depois de ler um texto sobre ${themeReference}, o ideal é resumir a ideia central sem olhar para o original, usando o vocabulário do próprio grupo.`,
    },
    {
      title: "Escrita é registro do processo",
      description: "O texto não serve só para entregar um produto final: ele guarda hipóteses, mudanças de rota, descobertas e decisões tomadas ao longo da jornada.",
    },
    {
      title: "O produto final pode assumir diferentes formas",
      description: "Pesquisa também pode resultar em campanha, protótipo, cartilha, intervenção, vídeo, podcast ou exposição — e a escrita documenta esse percurso.",
    },
  ];
}

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function tokenizeRelevantWords(value: string) {
  return value
    .split(/\s+/)
    .map(normalizeWord)
    .filter((item) => item.length >= 4 && !STOP_WORDS.has(item));
}

function buildExerciseSourceText(
  themeReference: string,
  themeGuideSuggestions: ThemeGuideSuggestionResult | null
) {
  const summary = normalizeText(themeGuideSuggestions?.interest_summary);
  const firstPath = normalizeText(themeGuideSuggestions?.possible_paths?.[0]);

  return (
    summary ||
    `Pesquisar sobre ${themeReference} envolve buscar fontes confiáveis, comparar ideias de diferentes autores e transformar a leitura em um texto próprio, que registre o processo e as escolhas do grupo.`
  );
    }

function evaluateRewriting(sourceText: string, rewrittenText: string): RewritingFeedback {
  const normalizedRewrite = normalizeText(rewrittenText);

  if (normalizedRewrite.length < 40) {
    return {
      badgeVariant: "yellow",
      title: "Esboço muito curto",
      summary: "A reescrita ainda está pequena demais para mostrar compreensão do texto-base.",
      tips: [
        "Explique a ideia central com pelo menos duas frases curtas.",
        "Inclua o que o grupo entendeu sobre pesquisa, autoria ou escrita.",
      ],
    };
  }

  const sourceWords = Array.from(new Set(tokenizeRelevantWords(sourceText)));
  const rewriteWords = tokenizeRelevantWords(normalizedRewrite);
  const rewriteWordSet = new Set(rewriteWords);
  const overlapCount = sourceWords.filter((word) => rewriteWordSet.has(word)).length;
  const overlapRatio = sourceWords.length > 0 ? overlapCount / sourceWords.length : 0;
  const uniqueRatio = rewriteWords.length > 0 ? rewriteWordSet.size / rewriteWords.length : 0;

  if (overlapRatio >= 0.72) {
    return {
      badgeVariant: "yellow",
      title: "Muito próxima do texto-base",
      summary: "A ideia principal apareceu, mas a formulação ainda está muito colada ao texto de apoio.",
      tips: [
        "Feche o texto-base e tente explicar a ideia como se estivesse conversando com o orientador.",
        "Troque a ordem das ideias e use palavras que o próprio grupo realmente usaria.",
        "Acrescente uma conexão com o tema escolhido para deixar a autoria mais evidente.",
      ],
    };
  }

  if (uniqueRatio < 0.55) {
    return {
      badgeVariant: "yellow",
      title: "Boa tentativa, mas ainda repetitiva",
      summary: "Há compreensão inicial, porém o texto ainda repete muitas palavras e estruturas próximas do original.",
      tips: [
        "Tente usar exemplos do tema escolhido para tornar a explicação mais própria.",
        "Prefira frases menores e mais diretas em vez de reproduzir o ritmo do texto-base.",
      ],
    };
  }

  return {
    badgeVariant: "green",
    title: "Boa autoria em construção",
    summary: "A reescrita já mostra compreensão e um movimento consistente de colocar a ideia em palavras do próprio grupo.",
    tips: [
      "Na próxima versão, vale citar de onde veio a leitura para transformar isso em referência de pesquisa.",
      "Você pode conectar essa ideia ao possível produto final ou ao problema investigado pelo grupo.",
    ],
  };
}

export function StudentWaitingStudyCard({
  groupId,
  themeText,
  themeGuideSuggestions,
}: StudentWaitingStudyCardProps) {
  const [rewrittenText, setRewrittenText] = useState("");
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const themeReference = resolveThemeReference(themeText, themeGuideSuggestions);
  const themePreview = shortenText(themeReference, 170);
  const studyLinks = buildStudyLinks(themeReference, themeGuideSuggestions);
  const reliableSourceTips = buildReliableSourceTips(themePreview);
  const authorshipTips = buildAuthorshipTips();
  const writingTips = buildWritingTips(themePreview);
  const exerciseSourceText = buildExerciseSourceText(themePreview, themeGuideSuggestions);
  const rewritingFeedback = useMemo(
    () => evaluateRewriting(exerciseSourceText, rewrittenText),
    [exerciseSourceText, rewrittenText]
  );
  const themeGuideHref = groupId ? `/estudante/groups/${groupId}/theme-guide` : null;

  return (
    <Card className="mt-4 border border-[#D7E6FF] bg-[linear-gradient(180deg,#F8FBFF_0%,#EEF5FF_100%)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue">Apoio de IA simulada</Badge>
              <Badge variant="yellow">Enquanto a resposta não chega</Badge>
            </div>

            <h3 className="mt-3 text-lg font-semibold text-[#1F2937]">
              Enquanto você aguarda a próxima etapa, que tal aprender a pesquisar melhor sobre seu tema?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#374151]">
              A plataforma aproveitou o tema já registrado pelo grupo para reunir fontes de partida, orientações
              sobre autoria e dicas de escrita que ajudam a transformar pesquisa em construção real de conhecimento.
            </p>
          </div>

          {themeGuideHref ? (
            <Link
              href={themeGuideHref}
              className="inline-flex rounded-lg border border-[#BFDBFE] bg-white px-4 py-2 text-sm font-medium text-[#1D4ED8] transition-colors hover:border-[#93C5FD] hover:bg-[#F8FBFF]"
            >
              Revisar escolha do tema
            </Link>
          ) : null}
        </div>

        <div className="rounded-xl border border-[#DBEAFE] bg-white/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">Tema de referência</p>
          <p className="mt-1 text-sm leading-relaxed text-[#374151]">{themePreview}</p>
        </div>

        <div className="rounded-xl border border-[#D7E6FF] bg-white/80 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#1D4ED8]">Você sabe como fazer pesquisas?</p>
              <p className="mt-1 text-sm leading-relaxed text-[#374151]">
                Pesquisar bem não significa copiar textos prontos. Significa localizar fontes confiáveis, compreender
                ideias importantes, fazer conexões com o tema escolhido e registrar esse processo com autoria.
              </p>
            </div>

            <Badge variant="blue">Preparação para a orientação</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {studyLinks.map((linkSuggestion) => (
            <a
              key={linkSuggestion.title}
              href={linkSuggestion.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[#D6E4FF] bg-white px-4 py-4 transition-colors hover:border-[#AFCBFF] hover:bg-[#F8FBFF]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1F2937]">{linkSuggestion.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{linkSuggestion.description}</p>
                </div>
                <Badge variant="blue">{linkSuggestion.sourceLabel}</Badge>
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-[#1D4ED8]">
                Abrir sugestão de estudo ↗
              </p>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-xl border border-[#D6E4FF] bg-white px-4 py-4">
            <p className="text-sm font-semibold text-[#1D4ED8]">Como escolher fontes confiáveis</p>
            <ul className="mt-3 space-y-3">
              {reliableSourceTips.map((tip) => (
                <li key={tip.title}>
                  <p className="text-sm font-semibold text-[#1F2937]">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">{tip.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#E7E2B4] bg-[#FFFDF3] px-4 py-4">
            <p className="text-sm font-semibold text-[#8A6A00]">Como usar referências sem virar cópia</p>
            <ul className="mt-3 space-y-3">
              {authorshipTips.map((tip) => (
                <li key={tip.title}>
                  <p className="text-sm font-semibold text-[#1F2937]">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">{tip.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#D7E6FF] bg-white px-4 py-4">
            <p className="text-sm font-semibold text-[#1D4ED8]">Escrita e produto final</p>
            <ul className="mt-3 space-y-3">
              {writingTips.map((tip) => (
                <li key={tip.title}>
                  <p className="text-sm font-semibold text-[#1F2937]">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">{tip.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {themeGuideSuggestions?.conversation_starters?.length ? (
          <div className="rounded-xl border border-[#D7E6FF] bg-white/80 px-4 py-3">
            <p className="text-sm font-semibold text-[#1D4ED8]">Pergunta para levar ao orientador</p>
            <p className="mt-1 text-sm leading-relaxed text-[#374151]">
              {themeGuideSuggestions.conversation_starters[0]}
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-[#DCEBD5] bg-[#F8FBF6] px-4 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#2F6F35]">Exercício de reescrita com apoio de IA simulada</p>
              <p className="mt-1 text-sm leading-relaxed text-[#374151]">
                Leia o texto-base e reescreva a ideia com suas próprias palavras, pensando em como o grupo explicaria isso ao orientador.
              </p>
            </div>

            <Badge variant="green">Treino de autoria</Badge>
          </div>

          <div className="mt-4 rounded-xl border border-[#CFE8C8] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6F35]">Texto-base para reescrever</p>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">{exerciseSourceText}</p>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-[#1F2937]" htmlFor="simulador-reescrita">
              Reescreva com palavras do próprio grupo
            </label>
            <textarea
              id="simulador-reescrita"
              value={rewrittenText}
              onChange={(event) => setRewrittenText(event.target.value)}
              placeholder="Exemplo: nosso grupo entendeu que pesquisar sobre esse tema exige comparar fontes confiáveis e transformar a leitura em ideias próprias..."
              className="min-h-[140px] w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm leading-relaxed text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#93C5FD]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHasEvaluated(true)}
                className="inline-flex rounded-lg bg-[#2F6F35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#275B2C]"
              >
                Avaliar minha reescrita
              </button>

              <button
                type="button"
                onClick={() => {
                  setRewrittenText("");
                  setHasEvaluated(false);
                }}
                className="inline-flex rounded-lg border border-[#CFE8C8] bg-white px-4 py-2 text-sm font-medium text-[#2F6F35] transition-colors hover:bg-[#F6FBF4]"
              >
                Limpar exercício
              </button>
            </div>
          </div>

          {hasEvaluated ? (
            <div className="mt-4 rounded-xl border border-[#DCEBD5] bg-white px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1F2937]">Leitura simulada da sua reescrita</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#374151]">{rewritingFeedback.summary}</p>
                </div>
                <Badge variant={rewritingFeedback.badgeVariant}>{rewritingFeedback.title}</Badge>
              </div>

              <ul className="mt-3 space-y-2">
                {rewritingFeedback.tips.map((tip) => (
                  <li key={tip} className="text-sm leading-relaxed text-[#4B5563]">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}