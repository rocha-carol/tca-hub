"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ThemeGuideSuggestionResult } from "@/types/group-theme-guide-state";

interface StudentWaitingStudyCardProps {
  groupId?: string;
  themeText: string | null;
  themeGuideSuggestions: ThemeGuideSuggestionResult | null;
}

interface QuizFeedback {
  badgeVariant: "green" | "yellow" | "gray";
  title: string;
  summary: string;
  tips: string[];
}

interface QuizOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  feedback: QuizFeedback;
}

interface QuizStep {
  type: "quiz";
  id: string;
  title: string;
  explanation: string;
  source: string;
  question: string;
  options: QuizOption[];
}

interface ExerciseStep {
  type: "exercise";
  id: string;
  title: string;
  explanation: string;
  source: string;
  prompt: string;
  referenceText: string;
  placeholder: string;
}

type StudyStep = QuizStep | ExerciseStep;

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

function resolveThemeReference(themeText: string | null, themeGuideSuggestions: ThemeGuideSuggestionResult | null) {
  const normalizedTheme = normalizeText(themeText);
  const normalizedSummary = normalizeText(themeGuideSuggestions?.interest_summary);
  const firstPossiblePath = normalizeText(themeGuideSuggestions?.possible_paths?.[0]);

  return normalizedTheme || normalizedSummary || firstPossiblePath || "tema do grupo";
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

function buildExerciseSourceText(themeReference: string, themeGuideSuggestions: ThemeGuideSuggestionResult | null) {
  const summary = normalizeText(themeGuideSuggestions?.interest_summary);

  return (
    summary ||
    `Pesquisar sobre ${themeReference} exige comparar fontes confiáveis, anotar referências, compreender as ideias principais e reescrever o que foi aprendido com palavras do próprio grupo.`
  );
}

function evaluateRewriting(sourceText: string, rewrittenText: string): QuizFeedback {
  const normalizedRewrite = normalizeText(rewrittenText);

  if (normalizedRewrite.length < 60) {
    return {
      badgeVariant: "yellow",
      title: "Texto ainda curto",
      summary: "A reescrita ainda está pequena demais para mostrar compreensão e autoria com clareza.",
      tips: [
        "Explique a ideia principal com pelo menos duas frases curtas.",
        "Mostre o que foi entendido e como isso se conecta ao tema do grupo.",
      ],
    };
  }

  const sourceWords = Array.from(new Set(tokenizeRelevantWords(sourceText)));
  const rewriteWords = tokenizeRelevantWords(normalizedRewrite);
  const rewriteWordSet = new Set(rewriteWords);
  const overlapCount = sourceWords.filter((word) => rewriteWordSet.has(word)).length;
  const overlapRatio = sourceWords.length > 0 ? overlapCount / sourceWords.length : 0;

  if (overlapRatio >= 0.72) {
    return {
      badgeVariant: "yellow",
      title: "Muito próxima do texto-base",
      summary: "A ideia apareceu, mas a formulação ainda está muito colada ao texto de apoio.",
      tips: [
        "Feche o texto-base e tente explicar a ideia como o próprio grupo falaria.",
        "Troque a ordem das ideias e use exemplos ligados ao tema escolhido.",
      ],
    };
  }

  return {
    badgeVariant: "green",
    title: "Boa autoria em construção",
    summary: "A reescrita já mostra compreensão e um movimento consistente de transformar leitura em texto próprio.",
    tips: [
      "Na próxima versão, vale acrescentar a referência da leitura usada como apoio.",
      "Se quiser fortalecer ainda mais a autoria, conecte a ideia ao problema investigado pelo grupo.",
    ],
  };
}

function buildStudySteps(themeReference: string, themeGuideSuggestions: ThemeGuideSuggestionResult | null): StudyStep[] {
  const exerciseSourceText = buildExerciseSourceText(themeReference, themeGuideSuggestions);

  return [
    {
      type: "quiz",
      id: "fontes",
      title: "Você sabe como fazer pesquisas?",
      explanation: "Para fazer uma boa pesquisa sobre seu tema, alguns pontos são essenciais: escolher fontes confiáveis, comparar mais de uma referência, anotar autoria e data do material consultado, identificar a ideia principal de cada leitura e só depois escrever com palavras do próprio grupo. Pesquisar bem não é juntar textos prontos — é compreender, selecionar e transformar leitura em conhecimento autoral.",
      source: "Fonte usada: síntese pedagógica simulada do TCA Hub, construída a partir do tema registrado pelo grupo e de orientações de pesquisa escolar trabalhadas na própria plataforma.",
      question: "Pensando na explicação acima, qual atitude combina melhor com uma boa pesquisa escolar?",
      options: [
        {
          id: "fontes-a",
          label: "A",
          text: "Usar artigos, instituições reconhecidas e comparar diferentes fontes.",
          isCorrect: true,
          feedback: {
            badgeVariant: "green",
            title: "Acerto importante",
            summary: "Esse é um bom começo, porque pesquisar bem exige selecionar fontes confiáveis e não depender de uma leitura isolada.",
            tips: [
              "Registrar autor, título, ano e link já ajuda a preparar futuras referências.",
              "Comparar abordagens evita conclusões apressadas e amplia o repertório do grupo.",
            ],
          },
        },
        {
          id: "fontes-b",
          label: "B",
          text: "Ficar apenas com o primeiro resultado encontrado na internet, se ele parecer convincente.",
          isCorrect: false,
          feedback: {
            badgeVariant: "yellow",
            title: "Quase, mas ainda não",
            summary: "Confiar só no primeiro resultado pode limitar a pesquisa e aumentar o risco de usar informação frágil ou incompleta.",
            tips: [
              "Vale comparar autores, datas, instituições e diferentes pontos de vista.",
              "Pesquisar bem é confirmar, relacionar e selecionar — não apenas aceitar a primeira resposta.",
            ],
          },
        },
        {
          id: "fontes-c",
          label: "C",
          text: "Escolher o texto com a linguagem mais fácil e copiar as ideias principais para não esquecer.",
          isCorrect: false,
          feedback: {
            badgeVariant: "yellow",
            title: "Ainda precisa ajustar",
            summary: "Linguagem acessível ajuda, mas copiar ideias diretamente não garante compreensão nem autoria.",
            tips: [
              "O ideal é ler, entender e registrar com palavras do próprio grupo.",
              "Fontes precisam ser escolhidas pela confiabilidade, não só pela facilidade de leitura.",
            ],
          },
        },
      ],
    },
    {
      type: "quiz",
      id: "plagio",
      title: "Como usar referências sem virar cópia?",
      explanation:
        "Pesquisar não significa reproduzir trechos prontos. A fonte serve como base para pensar, e não como um texto para ser apenas transportado para o trabalho.",
      source: "Fonte usada: síntese pedagógica simulada do TCA Hub sobre autoria, referência e escrita escolar.",
      question: "Qual atitude mostra mais autoria na escrita do grupo?",
      options: [
        {
          id: "plagio-a",
          label: "A",
          text: "Trocar algumas palavras do texto original e manter a mesma estrutura do autor.",
          isCorrect: false,
          feedback: {
            badgeVariant: "yellow",
            title: "Ainda muito próximo do original",
            summary: "Trocar poucas palavras não basta quando a estrutura e a lógica do texto continuam praticamente iguais.",
            tips: [
              "Feche a fonte, pense no que foi entendido e explique do jeito que o grupo realmente falaria.",
              "Sempre que uma leitura sustentar a ideia, vale guardar os dados básicos da referência.",
            ],
          },
        },
        {
          id: "plagio-b",
          label: "B",
          text: "Explicar a ideia com palavras próprias e registrar de onde veio a leitura usada como apoio.",
          isCorrect: true,
          feedback: {
            badgeVariant: "green",
            title: "Boa prática de autoria",
            summary: "Esse caminho mostra compreensão, respeita a fonte consultada e fortalece a voz do próprio grupo.",
            tips: [
              "Referenciar é mostrar a origem da base usada para pensar.",
              "Autoria aparece quando o grupo interpreta, conecta e reescreve a ideia com intenção própria.",
            ],
          },
        },
        {
          id: "plagio-c",
          label: "C",
          text: "Copiar o trecho mais completo e deixar para mudar depois, se sobrar tempo.",
          isCorrect: false,
          feedback: {
            badgeVariant: "yellow",
            title: "Esse caminho enfraquece a pesquisa",
            summary: "Quando a escrita começa pela cópia, o risco de plágio aumenta e o grupo deixa de registrar o próprio entendimento.",
            tips: [
              "É melhor anotar a ideia central em tópicos e reescrever depois com linguagem própria.",
              "A escrita do TCA precisa mostrar percurso, escolhas e compreensão, não apenas transcrição.",
            ],
          },
        },
      ],
    },
    {
      type: "quiz",
      id: "produto",
      title: "Pesquisa não precisa virar só texto",
      explanation:
        "O texto continua importante, mas ele registra o processo. O produto final pode assumir formatos diferentes, desde que dialogue com o problema investigado.",
      source: "Fonte usada: síntese pedagógica simulada do TCA Hub sobre produto final e escrita como registro do processo.",
      question: "Qual afirmação está mais alinhada ao TCA?",
      options: [
        {
          id: "produto-a",
          label: "A",
          text: "Se houver texto escrito, o grupo não precisa pensar em outras formas de apresentar o que descobriu.",
          isCorrect: false,
          feedback: {
            badgeVariant: "yellow",
            title: "Ainda não é isso",
            summary: "O texto é parte do percurso, mas não precisa limitar a forma como o resultado final se materializa.",
            tips: [
              "Campanha, vídeo, cartilha, intervenção, protótipo ou exposição podem surgir como produto final.",
              "A escrita ajuda a documentar por que esse produto faz sentido no processo do grupo.",
            ],
          },
        },
        {
          id: "produto-b",
          label: "B",
          text: "O produto final pode ter outros formatos, e a escrita funciona como registro do processo investigativo.",
          isCorrect: true,
          feedback: {
            badgeVariant: "green",
            title: "Visão correta do processo",
            summary: "Esse entendimento é central: o texto registra descobertas e decisões, enquanto o produto final pode ganhar a forma mais coerente com a investigação.",
            tips: [
              "Vale sempre conectar o produto ao problema inicial e às evidências levantadas.",
              "Registrar o processo ajuda o grupo a explicar suas escolhas no encontro com o orientador.",
            ],
          },
        },
        {
          id: "produto-c",
          label: "C",
          text: "O melhor é decidir primeiro um formato visual chamativo e depois adaptar qualquer pesquisa para caber nele.",
          isCorrect: false,
          feedback: {
            badgeVariant: "yellow",
            title: "A ordem precisa mudar",
            summary: "No TCA, o produto nasce da investigação. Ele não deve ser escolhido só por parecer mais bonito ou mais fácil de apresentar.",
            tips: [
              "Primeiro o grupo entende o problema e o percurso; depois decide qual forma comunica melhor o resultado.",
              "O produto final precisa dialogar com as descobertas, não apenas com a estética.",
            ],
          },
        },
      ],
    },
    {
      type: "exercise",
      id: "autoria",
      title: "Treino de autoria",
      explanation:
        "Agora é hora de praticar. Leia o texto-base abaixo e reescreva a ideia com palavras do próprio grupo, mostrando compreensão sem copiar a estrutura original.",
      source: "Fonte usada: síntese pedagógica simulada do TCA Hub para treino final de reescrita autoral.",
      prompt: "Reescreva a ideia abaixo com linguagem própria do grupo.",
      referenceText: exerciseSourceText,
      placeholder:
        "Exemplo: nosso grupo entendeu que pesquisar bem sobre esse tema exige comparar fontes, identificar ideias principais e transformar a leitura em um texto próprio...",
    },
  ];
}

export function StudentWaitingStudyCard({
  groupId,
  themeText,
  themeGuideSuggestions,
}: StudentWaitingStudyCardProps) {
  const [hasStartedStudySupport, setHasStartedStudySupport] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [rewrittenText, setRewrittenText] = useState("");
  const [activeFeedback, setActiveFeedback] = useState<QuizFeedback | null>(null);
  const themeReference = resolveThemeReference(themeText, themeGuideSuggestions);
  const themePreview = shortenText(themeReference, 170);
  const studySteps = buildStudySteps(themePreview, themeGuideSuggestions);
  const currentStep = studySteps[currentStepIndex];
  const selectedOption = currentStep.type === "quiz"
    ? currentStep.options.find((option) => option.id === selectedOptionId) ?? null
    : null;
  const isLastStep = currentStepIndex === studySteps.length - 1;
  const themeGuideHref = groupId ? `/estudante/groups/${groupId}/theme-guide` : null;

  function handleChooseOption(optionId: string) {
    if (currentStep.type !== "quiz") {
      return;
    }

    const selectedOption = currentStep.options.find((option) => option.id === optionId);

    if (!selectedOption) {
      return;
    }

    setSelectedOptionId(optionId);
    setActiveFeedback(selectedOption.feedback);
  }

  function handleNextStep() {
    if (isLastStep) {
      return;
    }

    setCurrentStepIndex((currentValue) => currentValue + 1);
    setSelectedOptionId(null);
    setRewrittenText("");
    setActiveFeedback(null);
  }

  function handleRetryStep() {
    setSelectedOptionId(null);
    setActiveFeedback(null);
  }

  function handleEvaluateRewriting() {
    if (currentStep.type !== "exercise") {
      return;
    }

    setActiveFeedback(evaluateRewriting(currentStep.referenceText, rewrittenText));
  }

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

            {!hasStartedStudySupport ? (
              <button
                type="button"
                onClick={() => setHasStartedStudySupport(true)}
                className="mt-4 inline-flex rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
              >
                Vamos lá
              </button>
            ) : null}
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

        {hasStartedStudySupport ? (
          <div className="rounded-xl border border-[#D7E6FF] bg-white/80 px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#1D4ED8]">{currentStep.title}</p>
                  <Badge variant="blue">Card {currentStepIndex + 1} de {studySteps.length}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#374151]">
                  {currentStep.explanation}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                  {currentStep.source}
                </p>
              </div>

              <Badge variant="blue">Preparação para a orientação</Badge>
            </div>

            {currentStep.type === "quiz" ? (
              <div className="mt-4 rounded-xl border border-[#D7E6FF] bg-[#F8FBFF] px-4 py-4">
                <p className="text-sm font-semibold text-[#1F2937]">Pergunta de fixação</p>
                <p className="mt-2 text-sm leading-relaxed text-[#374151]">{currentStep.question}</p>

                <div className="mt-4 space-y-3">
                  {currentStep.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleChooseOption(option.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-[#93C5FD] bg-white shadow-sm" : "border-[#D6E4FF] bg-white hover:border-[#AFCBFF] hover:bg-[#F8FBFF]"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F1FF] text-sm font-semibold text-[#1D4ED8]">
                            {option.label}
                          </span>
                          <span className="text-sm leading-relaxed text-[#1F2937]">{option.text}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-[#D7E6FF] bg-[#F8FBFF] px-4 py-4">
                <p className="text-sm font-semibold text-[#1F2937]">{currentStep.prompt}</p>

                <div className="mt-4 rounded-xl border border-[#CFE8C8] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6F35]">Texto-base para reescrever</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#374151]">{currentStep.referenceText}</p>
                </div>

                <label className="mt-4 block text-sm font-medium text-[#1F2937]" htmlFor="simulador-reescrita">
                  Reescreva com palavras do próprio grupo
                </label>
                <textarea
                  id="simulador-reescrita"
                  value={rewrittenText}
                  onChange={(event) => setRewrittenText(event.target.value)}
                  placeholder={currentStep.placeholder}
                  className="mt-2 min-h-[140px] w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm leading-relaxed text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#93C5FD]"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleEvaluateRewriting}
                    className="inline-flex rounded-lg bg-[#2F6F35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#275B2C]"
                  >
                    Avaliar minha reescrita
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRewrittenText("");
                      setActiveFeedback(null);
                    }}
                    className="inline-flex rounded-lg border border-[#CFE8C8] bg-white px-4 py-2 text-sm font-medium text-[#2F6F35] transition-colors hover:bg-[#F6FBF4]"
                  >
                    Limpar exercício
                  </button>
                </div>
              </div>
            )}

            {activeFeedback ? (
              <div className="mt-4 rounded-xl border border-[#DCEBD5] bg-white px-4 py-4 transition-all duration-300">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">Leitura simulada da sua resposta</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#374151]">{activeFeedback.summary}</p>
                  </div>
                  <Badge variant={activeFeedback.badgeVariant}>{activeFeedback.title}</Badge>
                </div>

                <ul className="mt-3 space-y-2">
                  {activeFeedback.tips.map((tip) => (
                    <li key={tip} className="text-sm leading-relaxed text-[#4B5563]">
                      • {tip}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                  {currentStep.type === "quiz" ? (
                    selectedOption?.isCorrect ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={isLastStep}
                        className="inline-flex rounded-lg bg-[#2F6F35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#275B2C] disabled:cursor-default disabled:bg-[#9BC79F]"
                      >
                        {isLastStep ? "Sequência concluída" : "Próximo card"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRetryStep}
                        className="inline-flex rounded-lg border border-[#D6E4FF] bg-white px-4 py-2 text-sm font-medium text-[#1D4ED8] transition-colors hover:bg-[#F8FBFF]"
                      >
                        Tentar novamente
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex rounded-lg bg-[#2F6F35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#275B2C] disabled:cursor-default disabled:bg-[#9BC79F]"
                    >
                      Sequência concluída
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-center gap-2">
              {studySteps.map((step, index) => (
                <span
                  key={step.id}
                  className={`h-2.5 rounded-full transition-all duration-300 ${index === currentStepIndex ? "w-8 bg-[#1D4ED8]" : "w-2.5 bg-[#C7D7F7]"}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}