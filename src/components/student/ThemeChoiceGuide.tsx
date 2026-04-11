"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ThemeGuideSuggestionResult } from "@/types/group-theme-guide-state";

interface ThemeChoiceGuideProps {
  targetHref: string;
  suggestionsEndpoint: string;
  saveEndpoint: string;
  initialState?: ThemeChoiceGuideInitialState | null;
}

interface ThemeChoiceGuideInitialState {
  checks?: boolean[];
  selectedCategory?: string;
  selectedInterestTags?: string[];
  draftNotes?: string;
  aiSuggestions?: ThemeGuideSuggestionResult | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ThemeGuideStateResponse {
  state?: {
    checks?: boolean[];
    selected_category?: string | null;
    selected_interest_tags?: string[];
    draft_notes?: string | null;
    ai_suggestions?: ThemeGuideSuggestionResult | null;
  } | null;
  message?: string;
}

const inspirationCategories = [
  {
    title: "Ciência no cotidiano",
    examples: [
      "você já se perguntou se a física ajuda a explicar o skate, o futebol ou a bicicleta?",
      "você já se perguntou se luz, som e temperatura mudam o jeito como o corpo reage?",
      "você já se perguntou se aquilo que parece mágica no dia a dia é, na verdade, ciência acontecendo?",
    ],
  },
  {
    title: "Sociedade sem piloto automático",
    examples: [
      "você já se perguntou se alguns espaços fazem certas pessoas se sentirem invisíveis?",
      "você já se perguntou se consumo, moda e status influenciam escolhas sem a gente perceber?",
      "você já se perguntou se a sociologia ajuda a enxergar coisas do cotidiano que passam batido?",
    ],
  },
  {
    title: "Internet, influência e algoritmos",
    examples: [
      "você já se perguntou se um meme viraliza só porque é engraçado?",
      "você já se perguntou se a internet molda opiniões e comportamentos mais do que parece?",
      "você já se perguntou se o algoritmo mostra algumas coisas e esconde outras de propósito?",
    ],
  },
  {
    title: "Cidade, território e geopolítica",
    examples: [
      "você já se perguntou se alguns bairros sofrem mais com enchentes por decisões humanas e não só pela chuva?",
      "você já se perguntou se guerras e fronteiras afetam a vida de quem está longe delas?",
      "você já se perguntou se o preço das coisas muda por causas globais que quase ninguém percebe?",
    ],
  },
  {
    title: "Curiosidades que viram investigação",
    examples: [
      "você já se perguntou por que uma música gruda na cabeça?",
      "você já se perguntou se cores e espaços mudam o humor?",
      "você já se perguntou por que o tempo parece passar diferente em certas situações?",
      "você já se perguntou se memes moldam opiniões?",
      "você já se perguntou o que faz uma tendência viralizar?",
      "você já se perguntou por que certas modas voltam depois de um tempo?",
      "você já se perguntou como o cérebro reage a sustos, suspense e expectativa?",
      "você já se perguntou por que algumas pessoas aprendem melhor ouvindo, vendo ou fazendo?",
      "você já se perguntou se cheiros e sons despertam memórias de um jeito especial?",
    ],
  },
  {
    title: "Temas clássicos também valem",
    examples: [
      "você já se perguntou se lixo e reciclagem são só responsabilidade individual?",
      "você já se perguntou o que realmente afeta a saúde mental e o bem-estar dos adolescentes?",
      "você já se perguntou como convivência, bullying, celular e escola se conectam?",
    ],
  },
  {
    title: "Cinema, artes e narrativas",
    examples: [
      "você já se perguntou se filmes, séries, músicas e peças mudam o jeito como a gente vê o mundo?",
      "você já se perguntou por que algumas histórias representam certos grupos e apagam outros?",
      "você já se perguntou se arte também pode denunciar problemas sociais e transformar opiniões?",
    ],
  },
  {
    title: "Invenções, cientistas e descobertas",
    examples: [
      "você já se perguntou por que algumas descobertas científicas mudaram tanto a vida das pessoas?",
      "você já se perguntou quem ganha destaque quando se fala em ciência e quem quase nunca aparece?",
      "você já se perguntou se grandes invenções nasceram de erros, testes e curiosidades improváveis?",
    ],
  },
];

const readinessChecks = [
  "Nosso grupo realmente se importa com esse assunto.",
  "Esse tema aparece na escola, no bairro ou no dia a dia.",
  "Dá para investigar com observações, perguntas ou pesquisa.",
];

const aiInterestTags = [
  "música",
  "cinema",
  "teatro",
  "arte",
  "ciência",
  "cientistas",
  "invenções",
  "memes",
  "internet",
  "algoritmos",
  "esportes",
  "emoções",
  "corpo",
  "cidade",
  "periferia",
  "natureza",
  "clima",
  "espaço",
  "física",
  "química",
  "história",
  "sociologia",
  "identidade",
  "comportamento",
  "futuro",
  "mobilidade",
  "saúde mental",
  "tecnologia",
];

const draftPrompts = [
  "O que mais chamou atenção na conversa até agora?",
  "Que problema, curiosidade ou incômodo apareceu?",
  "Qual assunto parece mais a cara do grupo?",
];

function isThemeIdeaSuggestionResult(value: unknown): value is ThemeGuideSuggestionResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as ThemeGuideSuggestionResult;

  return (
    typeof candidate.interest_summary === "string" &&
    Array.isArray(candidate.possible_paths) &&
    Array.isArray(candidate.conversation_starters) &&
    typeof candidate.model_name === "string"
  );
}

function normalizeChecks(checks?: boolean[]) {
  if (!Array.isArray(checks) || checks.length !== readinessChecks.length) {
    return readinessChecks.map(() => false);
  }

  return checks.map((item) => Boolean(item));
}

function normalizeSelectedCategory(selectedCategory?: string) {
  if (
    typeof selectedCategory === "string" &&
    inspirationCategories.some((category) => category.title === selectedCategory)
  ) {
    return selectedCategory;
  }

  return inspirationCategories[0]?.title ?? "";
}

function normalizeSelectedInterestTags(selectedInterestTags?: string[]) {
  if (!Array.isArray(selectedInterestTags)) {
    return [] as string[];
  }

  return selectedInterestTags.filter((tag): tag is string => typeof tag === "string" && aiInterestTags.includes(tag));
}

function normalizeDraftNotes(draftNotes?: string) {
  return typeof draftNotes === "string" ? draftNotes : "";
}

function normalizeAiSuggestions(aiSuggestions?: ThemeGuideSuggestionResult | null) {
  if (aiSuggestions === null) {
    return null;
  }

  return isThemeIdeaSuggestionResult(aiSuggestions) ? aiSuggestions : null;
}

function buildShadowStorageKey(saveEndpoint: string) {
  return `theme-guide-shadow:${saveEndpoint}`;
}

function normalizeInitialState(initialState?: ThemeChoiceGuideInitialState | null): ThemeChoiceGuideInitialState {
  return {
    checks: normalizeChecks(initialState?.checks),
    selectedCategory: normalizeSelectedCategory(initialState?.selectedCategory),
    selectedInterestTags: normalizeSelectedInterestTags(initialState?.selectedInterestTags),
    draftNotes: normalizeDraftNotes(initialState?.draftNotes),
    aiSuggestions: normalizeAiSuggestions(initialState?.aiSuggestions),
  };
}

export function ThemeChoiceGuide({
  targetHref,
  suggestionsEndpoint,
  saveEndpoint,
  initialState,
}: ThemeChoiceGuideProps) {
  const normalizedInitialState = useMemo(() => normalizeInitialState(initialState), [initialState]);
  const [checks, setChecks] = useState<boolean[]>(() => normalizedInitialState.checks ?? readinessChecks.map(() => false));
  const [selectedCategory, setSelectedCategory] = useState(normalizedInitialState.selectedCategory ?? inspirationCategories[0]?.title ?? "");
  const [selectedInterestTags, setSelectedInterestTags] = useState<string[]>(() => normalizedInitialState.selectedInterestTags ?? []);
  const [draftNotes, setDraftNotes] = useState(() => normalizedInitialState.draftNotes ?? "");
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<ThemeGuideSuggestionResult | null>(() => normalizedInitialState.aiSuggestions ?? null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasMountedRef = useRef(false);
  const shadowStorageKey = useMemo(() => buildShadowStorageKey(saveEndpoint), [saveEndpoint]);

  const selectedExamples = useMemo(
    () => inspirationCategories.find((category) => category.title === selectedCategory)?.examples ?? [],
    [selectedCategory]
  );

  const allChecked = checks.every(Boolean);

  const stateToPersist = useMemo(
    () => ({
      checks,
      selectedCategory,
      selectedInterestTags,
      draftNotes,
      aiSuggestions,
    }),
    [aiSuggestions, checks, draftNotes, selectedCategory, selectedInterestTags]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsHydrated(true);
      return;
    }

    let isCancelled = false;

    try {
      const rawShadowState = window.localStorage.getItem(shadowStorageKey);
      if (rawShadowState) {
        const parsedShadowState = JSON.parse(rawShadowState) as ThemeChoiceGuideInitialState;
        const normalizedShadowState = normalizeInitialState(parsedShadowState);

        setChecks(normalizedShadowState.checks ?? readinessChecks.map(() => false));
        setSelectedCategory(normalizedShadowState.selectedCategory ?? inspirationCategories[0]?.title ?? "");
        setSelectedInterestTags(normalizedShadowState.selectedInterestTags ?? []);
        setDraftNotes(normalizedShadowState.draftNotes ?? "");
        setAiSuggestions(normalizedShadowState.aiSuggestions ?? null);
      }
    } catch {
      window.localStorage.removeItem(shadowStorageKey);
    }

    async function hydrateFromDatabase() {
      try {
        const response = await fetch(saveEndpoint, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as ThemeGuideStateResponse | null;

        if (!response.ok || !payload?.state || isCancelled) {
          return;
        }

        const normalizedDatabaseState = normalizeInitialState({
          checks: payload.state.checks,
          selectedCategory: payload.state.selected_category ?? undefined,
          selectedInterestTags: payload.state.selected_interest_tags,
          draftNotes: payload.state.draft_notes ?? "",
          aiSuggestions: payload.state.ai_suggestions ?? null,
        });

        setChecks(normalizedDatabaseState.checks ?? readinessChecks.map(() => false));
        setSelectedCategory(normalizedDatabaseState.selectedCategory ?? inspirationCategories[0]?.title ?? "");
        setSelectedInterestTags(normalizedDatabaseState.selectedInterestTags ?? []);
        setDraftNotes(normalizedDatabaseState.draftNotes ?? "");
        setAiSuggestions(normalizedDatabaseState.aiSuggestions ?? null);
      } catch {
        // Falha silenciosa: mantém o estado local/sombra para não bloquear a experiência.
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    }

    void hydrateFromDatabase();

    return () => {
      isCancelled = true;
    };
  }, [saveEndpoint, shadowStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(shadowStorageKey, JSON.stringify(stateToPersist));
  }, [shadowStorageKey, stateToPersist]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!isHydrated) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setSaveStatus("saving");
        setSaveError(null);

        const response = await fetch(saveEndpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stateToPersist),
          signal: controller.signal,
          keepalive: true,
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Não foi possível salvar o guia de tema do grupo agora."
          );
        }

        setSaveStatus("saved");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSaveStatus("error");
        setSaveError(
          error instanceof Error ? error.message : "Não foi possível salvar o guia de tema do grupo agora."
        );
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isHydrated, saveEndpoint, stateToPersist]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const flushPendingState = () => {
      const payload = JSON.stringify(stateToPersist);

      void fetch(saveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Mantém o shadow cache local como rede de segurança para a próxima abertura.
      });
    };

    const handlePageHide = () => {
      flushPendingState();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [saveEndpoint, stateToPersist]);

  const saveStatusMessage =
    saveStatus === "saving"
      ? "Salvando para todo o grupo..."
      : saveStatus === "saved"
        ? "Tudo salvo no banco para o grupo."
        : saveStatus === "error"
          ? saveError || "Não foi possível salvar no banco agora."
          : "As alterações desta página ficam compartilhadas com todo o grupo.";

  function handleToggleCheck(index: number) {
    setChecks((current) => current.map((value, currentIndex) => (currentIndex === index ? !value : value)));
  }

  function handleToggleInterestTag(tag: string) {
    setSelectedInterestTags((current) => {
      const next = current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag];

      return next;
    });

    setSuggestionError(null);
    setAiSuggestions(null);
  }

  function handleClearInterestTags() {
    setSelectedInterestTags([]);
    setSuggestionError(null);
    setAiSuggestions(null);
  }

  function handleAddDraftPrompt(prompt: string) {
    setDraftNotes((current) => {
      if (!current.trim()) {
        return `${prompt}\n`;
      }

      return `${current.trim()}\n- ${prompt}\n`;
    });
  }

  async function handleGenerateSuggestions() {
    if (selectedInterestTags.length === 0) {
      setSuggestionError("Selecione pelo menos um assunto para receber sugestões.");
      return;
    }

    try {
      setIsGeneratingSuggestions(true);
      setSuggestionError(null);

      const response = await fetch(suggestionsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedTopics: selectedInterestTags }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "Não foi possível gerar sugestões agora."
        );
      }

      setAiSuggestions(payload as ThemeGuideSuggestionResult);
    } catch (error) {
      setAiSuggestions(null);
      setSuggestionError(
        error instanceof Error ? error.message : "Não foi possível gerar sugestões agora."
      );
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-[#F4FBF2] to-[#FFF9E8] border border-[#DCEBD5]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Badge variant="yellow">Missão preparatória</Badge>
            <div>
              <h1 className="text-2xl font-bold text-[#1F2937]">Antes de escolher o tema, bora entender o jogo</h1>
              <p className="text-sm text-[#4B5563] mt-1 max-w-2xl">
                Um tema forte nasce de algo que faz sentido para o grupo, aparece na realidade e dá para investigar de verdade.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white/80 border border-[#E5E7EB] px-4 py-3 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Estado do grupo</p>
            <p className="text-sm text-[#1F2937] mt-1">{saveStatusMessage}</p>
          </div>
        </div>
      </Card>

      {saveStatus === "error" ? (
        <div className="rounded-xl border border-[#F5C2C7] bg-[#FFF5F5] px-4 py-3 text-sm text-[#9B1C1C]">
          {saveError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card accent="green" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#1F2937]">1. O que faz um tema ser bom?</h2>
            <Badge variant="green">Essencial</Badge>
          </div>

          <p className="text-sm text-[#374151] leading-relaxed">
            Tema não é só um assunto solto. É um recorte que conecta o grupo com uma situação real da escola, do bairro ou da comunidade.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#cfe8c8] bg-[#f3fbf1] px-3 py-3">
              <p className="text-sm font-semibold text-[#2F6F35]">Vale apostar em temas como</p>
              <ul className="mt-2 space-y-1 text-sm text-[#374151] list-disc list-inside">
                <li>descarte de lixo na escola</li>
                <li>uso do celular em sala</li>
                <li>convivência entre turmas</li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#F2C94C] bg-[#FFF9E8] px-3 py-3">
              <p className="text-sm font-semibold text-[#8A6A00]">Ainda está amplo demais quando vira</p>
              <ul className="mt-2 space-y-1 text-sm text-[#374151] list-disc list-inside">
                <li>meio ambiente</li>
                <li>tecnologia</li>
                <li>educação</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card accent="blue" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#1F2937]">2. Como escolher sem travar?</h2>
            <Badge variant="blue">Dica rápida</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-[#DBEAFE] bg-[#F5F9FF] px-3 py-3">
              <p className="text-sm font-semibold text-[#1D4ED8]">Interessa ao grupo?</p>
              <p className="text-sm text-[#374151] mt-1">Se ninguém se importa com o assunto, a energia do projeto cai rápido.</p>
            </div>

            <div className="rounded-xl border border-[#DBEAFE] bg-[#F5F9FF] px-3 py-3">
              <p className="text-sm font-semibold text-[#1D4ED8]">Tem ligação com a realidade?</p>
              <p className="text-sm text-[#374151] mt-1">Tema bom conversa com algo que vocês conseguem ver, ouvir ou perceber no dia a dia.</p>
            </div>

            <div className="rounded-xl border border-[#DBEAFE] bg-[#F5F9FF] px-3 py-3">
              <p className="text-sm font-semibold text-[#1D4ED8]">Dá para investigar de verdade?</p>
              <p className="text-sm text-[#374151] mt-1">Precisa render perguntas, observações, entrevistas ou pesquisa — não só opinião solta.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card accent="yellow" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-[#1F2937]">3. Você já pensou em pesquisar sobre...</h2>
          <Badge variant="yellow">Explorar possibilidades</Badge>
        </div>

        <div className="rounded-xl border border-[#F3E2A3] bg-[#FFFDF5] px-4 py-4">
          <p className="text-sm text-[#374151] leading-relaxed">
            Tema de pesquisa Vale ser criado a partir de uma dúvida, de uma curiosidade, de algo estranho no cotidiano,
            de uma injustiça que incomoda ou até de uma pergunta que parece improvável à primeira vista.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {inspirationCategories.map((category) => {
            const isSelected = category.title === selectedCategory;

            return (
              <button
                key={category.title}
                type="button"
                onClick={() => setSelectedCategory(category.title)}
                className={`w-full rounded-full px-2.5 py-1.5 text-xs leading-tight border transition-colors ${
                  isSelected
                    ? "bg-[#4CAF50] text-white border-[#4CAF50]"
                    : "bg-white text-[#374151] border-[#D1D5DB] hover:border-[#4CAF50] hover:text-[#2F6F35]"
                }`}
              >
                {category.title}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#F2C94C] bg-[#FFF9E8] px-4 py-4">
          <p className="text-sm font-semibold text-[#8A6A00]">Você já se perguntou se...</p>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-[#374151]">
            {selectedExamples.map((example) => (
              <li key={example} className="rounded-lg bg-white/80 px-3 py-2 border border-[#F3E2A3]">
                {example}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-[#4B5563] leading-relaxed">
          Não existe uma lista fechada de temas certos. O importante é que a escolha faça sentido para o grupo e possa ser investigada de verdade.
        </p>
      </Card>

      <Card accent="blue" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">4. Ainda não escolheram um tema? Talvez eu possa ajudar ✨</h2>
            <p className="text-sm text-[#4B5563] mt-1">
              Selecionem assuntos que vocês gostam ou gostariam de conhecer melhor. A ferramenta sugere caminhos — não escolhe por vocês.
            </p>
          </div>
          <Badge variant="blue">Modo simulado</Badge>
        </div>

        <div className="rounded-xl border border-[#DBEAFE] bg-[#F5F9FF] px-4 py-4 space-y-3">
          <p className="text-sm font-semibold text-[#1D4ED8]">
            Selecione abaixo os assuntos que despertam curiosidade no grupo
          </p>

          <div className="flex flex-wrap gap-2">
            {aiInterestTags.map((tag) => {
              const isSelected = selectedInterestTags.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleInterestTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
                    isSelected
                      ? "bg-[#2F80ED] text-white border-[#2F80ED]"
                      : "bg-white text-[#374151] border-[#BFDBFE] hover:border-[#2F80ED] hover:text-[#1D4ED8]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[#4B5563]">
              {selectedInterestTags.length > 0
                ? `${selectedInterestTags.length} assunto${selectedInterestTags.length > 1 ? "s" : ""} selecionado${selectedInterestTags.length > 1 ? "s" : ""}.`
                : "Nenhum assunto selecionado ainda."}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClearInterestTags}
                disabled={isGeneratingSuggestions || selectedInterestTags.length === 0}
              >
                Limpar seleções
              </Button>

              <Button
                type="button"
                onClick={handleGenerateSuggestions}
                disabled={isGeneratingSuggestions || selectedInterestTags.length === 0}
              >
                {isGeneratingSuggestions ? "Conectando ideias..." : "Ver possibilidades"}
              </Button>
            </div>
          </div>
        </div>

        {suggestionError ? (
          <div className="rounded-xl border border-[#F5C2C7] bg-[#FFF5F5] px-4 py-3 text-sm text-[#9B1C1C]">
            {suggestionError}
          </div>
        ) : null}

        {aiSuggestions ? (
          <div className="rounded-xl border border-[#D6E4FF] bg-white px-4 py-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#1D4ED8]">O que as escolhas de vocês mostram</p>
              <p className="text-sm text-[#374151] mt-1 leading-relaxed">{aiSuggestions.interest_summary}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1D4ED8]">Possíveis caminhos de pesquisa</p>
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-[#374151]">
                {aiSuggestions.possible_paths.map((path) => (
                  <li key={path} className="rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] px-3 py-3">
                    {path}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1D4ED8]">Perguntas para começar a conversa no grupo</p>
              <ul className="mt-2 space-y-2 text-sm text-[#374151] list-disc list-inside">
                {aiSuggestions.conversation_starters.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Card>

      <Card accent="yellow" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">5. Rascunho de ideias do grupo</h2>
            <p className="text-sm text-[#4B5563] mt-1">
              Espaço opcional para anotar palavras, perguntas, conexões ou temas que aparecerem durante a conversa.
            </p>
          </div>
          <Badge variant="yellow">Opcional</Badge>
        </div>

        <div className="rounded-xl border border-[#F3E2A3] bg-[#FFFDF5] px-4 py-4 space-y-3">
          <p className="text-sm text-[#8A6A00] leading-relaxed">
            Rascunho não precisa estar bonito — ele só precisa guardar boas pistas.
          </p>

          <div className="flex flex-wrap gap-2">
            {draftPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleAddDraftPrompt(prompt)}
                className="rounded-full border border-[#F3E2A3] bg-white px-3 py-1.5 text-xs text-[#8A6A00] hover:border-[#E6B93C] hover:text-[#7A5B00] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          <textarea
            value={draftNotes}
            onChange={(event) => setDraftNotes(event.target.value)}
            placeholder="Ex.: a gente curtiu falar sobre música e cidade... também apareceu a ideia de investigar como o algoritmo influencia o gosto das pessoas."
            className="min-h-32 w-full rounded-xl border border-[#F3E2A3] bg-white px-4 py-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#F2C94C]"
          />
        </div>
      </Card>

      <Card className="border border-[#DCEBD5] bg-[#F8FBF6] space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">6. Check final do grupo</h2>
            <p className="text-sm text-[#4B5563] mt-1">Marquem os três pontos antes de avançar para a escrita do tema.</p>
          </div>
          <Badge variant={allChecked ? "green" : "gray"}>
            {allChecked ? "Prontos para avançar" : "Falta revisar"}
          </Badge>
        </div>

        <div className="space-y-2">
          {readinessChecks.map((label, index) => (
            <label
              key={label}
              className="flex items-start gap-3 rounded-xl border border-[#D1E7D3] bg-white px-3 py-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checks[index]}
                onChange={() => handleToggleCheck(index)}
                className="mt-1 h-4 w-4 rounded border-[#9CA3AF] text-[#4CAF50] focus:ring-[#4CAF50]"
              />
              <span className="text-sm text-[#374151] leading-relaxed">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[#4B5563]">
            Quando o check estiver completo, o grupo já entra na etapa de tema com mais clareza e menos chute.
          </p>

          {allChecked ? (
            <Link
              href={targetHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#4CAF50] hover:bg-[#43A047] text-white font-semibold px-5 py-2.5"
            >
              Agora sim: escolher nosso tema
            </Link>
          ) : (
            <Button type="button" variant="secondary" className="cursor-default">
              Complete o check para avançar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}