import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";

export type RewardTier = "silver" | "gold" | "emerald" | "violet" | "ultra";

export interface RewardMetrics {
  hasGroup: boolean;
  memberCount: number;
  totalWords: number;
  themeWords: number;
  processPhotosCount: number;
  repertoryItemsCount: number;
  activeMinutes: number;
  themeStarted: boolean;
  advisorRequested: boolean;
  advisorConfirmed: boolean;
  problemStarted: boolean;
  objectivesStarted: boolean;
  methodologyStarted: boolean;
  planningCompleted: boolean;
  developmentStarted: boolean;
  resultStarted: boolean;
  journeyCompleted: boolean;
  platformCompleted: boolean;
  waitingStudyCompleted: boolean;
}

export interface RewardDefinition {
  id: string;
  title: string;
  description: string;
  flavor: string;
  icon: string;
  tier: RewardTier;
  points: number;
  unlocked: (metrics: RewardMetrics) => boolean;
}

export interface RewardState extends RewardDefinition {
  achieved: boolean;
}

interface BuildRewardMetricsInput {
  group: Group | null;
  projectSections: GroupProjectSection[];
  processPhotosCount: number;
  repertoryItemsCount: number;
  activeMinutes: number;
  waitingStudyCompleted: boolean;
}

export const MAX_REWARD_POINTS = 2;

function findSection(projectSections: GroupProjectSection[], sectionKey: string) {
  return projectSections.find((section) => section.section_key === sectionKey) ?? null;
}

function sectionHasProgress(section?: GroupProjectSection | null) {
  if (!section) {
    return false;
  }

  return section.status !== "nao_iniciado" || Boolean(section.content?.trim());
}

function countWords(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function countGroupMembers(group: Group | null) {
  if (!group) {
    return 0;
  }

  return [
    group.member_1_name,
    group.member_2_name,
    group.member_3_name,
    group.member_4_name,
    group.member_5_name,
  ].filter((memberName) => typeof memberName === "string" && memberName.trim().length > 0).length;
}

export function formatRewardPoints(points: number) {
  return points.toFixed(2).replace(".", ",");
}

export function buildRewardDefinitions(): RewardDefinition[] {
  return [
    {
      id: "first-visit",
      title: "Primeiro passo",
      description: "A área de jornada foi aberta e a aventura no TCA Hub começou oficialmente.",
      flavor: "Toda coleção começa com a primeira carta descoberta.",
      icon: "🌱",
      tier: "silver",
      points: 0.03,
      unlocked: () => true,
    },
    {
      id: "group-formed",
      title: "Grupo formado",
      description: "O grupo já existe e liberou a trilha principal do projeto.",
      flavor: "Sem equipe não existe guilda, sem guilda não existe jornada.",
      icon: "🤝",
      tier: "silver",
      points: 0.05,
      unlocked: (metrics) => metrics.hasGroup,
    },
    {
      id: "team-expanded",
      title: "Equipe ampliada",
      description: "Três ou mais integrantes já estão envolvidos na construção coletiva.",
      flavor: "A carta ganha força quando a inteligência deixa de ser solitária.",
      icon: "👥",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.memberCount >= 3,
    },
    {
      id: "theme-started",
      title: "Tema em construção",
      description: "A seção de tema já ganhou os primeiros registros do grupo.",
      flavor: "Toda grande investigação nasce de uma centelha bem guardada.",
      icon: "💡",
      tier: "silver",
      points: 0.05,
      unlocked: (metrics) => metrics.themeStarted,
    },
    {
      id: "theme-deepened",
      title: "Tema aprofundado",
      description: "O grupo já escreveu um recorte mais consistente para o tema investigado.",
      flavor: "Quando a ideia cria raízes, a carta muda de raridade.",
      icon: "🧠",
      tier: "gold",
      points: 0.08,
      unlocked: (metrics) => metrics.themeWords >= 120,
    },
    {
      id: "advisor-requested",
      title: "Orientação acionada",
      description: "A indicação de orientação já foi iniciada pelo grupo.",
      flavor: "Pedir orientação é ativar uma habilidade estratégica do time.",
      icon: "📨",
      tier: "silver",
      points: 0.05,
      unlocked: (metrics) => metrics.advisorRequested,
    },
    {
      id: "advisor-confirmed",
      title: "Orientação confirmada",
      description: "Um orientador principal já está vinculado ao grupo.",
      flavor: "A presença da orientação eleva a carta ao patamar de suporte lendário.",
      icon: "🎓",
      tier: "emerald",
      points: 0.12,
      unlocked: (metrics) => metrics.advisorConfirmed,
    },
    {
      id: "problem-started",
      title: "Problema investigado",
      description: "A pergunta central do projeto já começou a ser construída.",
      flavor: "Toda carta forte conhece exatamente o desafio que enfrenta.",
      icon: "🔎",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.problemStarted,
    },
    {
      id: "objectives-started",
      title: "Objetivos definidos",
      description: "Os objetivos da investigação já começaram a tomar forma.",
      flavor: "Objetivos claros funcionam como atributos de precisão da missão.",
      icon: "🎯",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.objectivesStarted,
    },
    {
      id: "methodology-started",
      title: "Metodologia estruturada",
      description: "O grupo já registrou como pretende investigar e agir.",
      flavor: "Estratégia registrada é o equivalente pedagógico de um deck bem montado.",
      icon: "🗺️",
      tier: "gold",
      points: 0.07,
      unlocked: (metrics) => metrics.methodologyStarted,
    },
    {
      id: "planning-complete",
      title: "Planejamento completo",
      description: "Problema, objetivos e metodologia já foram iniciados como base do percurso.",
      flavor: "Essa carta só aparece quando a base do projeto para de oscilar.",
      icon: "🧩",
      tier: "emerald",
      points: 0.12,
      unlocked: (metrics) => metrics.planningCompleted,
    },
    {
      id: "development-started",
      title: "Mão na massa",
      description: "A etapa de desenvolvimento já começou a ser registrada pelo grupo.",
      flavor: "A raridade sobe quando o projeto deixa de ser plano e vira ação.",
      icon: "⚙️",
      tier: "violet",
      points: 0.12,
      unlocked: (metrics) => metrics.developmentStarted,
    },
    {
      id: "result-started",
      title: "Síntese em andamento",
      description: "Os resultados ou o produto final já começaram a ser consolidados.",
      flavor: "Toda coleção respeita a carta que já mostra sinais concretos de conclusão.",
      icon: "🏁",
      tier: "violet",
      points: 0.12,
      unlocked: (metrics) => metrics.resultStarted,
    },
    {
      id: "journey-complete",
      title: "Jornada central concluída",
      description: "As etapas principais da jornada do TCA já foram preenchidas.",
      flavor: "Concluir o núcleo da jornada já coloca a carta no álbum das memoráveis.",
      icon: "👑",
      tier: "violet",
      points: 0.18,
      unlocked: (metrics) => metrics.journeyCompleted,
    },
    {
      id: "wordsmith-300",
      title: "Escrita consistente",
      description: "O grupo já acumulou pelo menos 300 palavras no projeto.",
      flavor: "Texto constante é poder silencioso que cresce linha por linha.",
      icon: "✍️",
      tier: "silver",
      points: 0.07,
      unlocked: (metrics) => metrics.totalWords >= 300,
    },
    {
      id: "wordsmith-1200",
      title: "Autoria robusta",
      description: "O projeto já soma 1200 palavras ou mais em seus registros.",
      flavor: "Uma carta de autoria forte sempre deixa rastros extensos no tabuleiro.",
      icon: "📚",
      tier: "emerald",
      points: 0.13,
      unlocked: (metrics) => metrics.totalWords >= 1200,
    },
    {
      id: "photo-collector",
      title: "Memória visual",
      description: "O grupo já registrou pelo menos 3 fotos do processo.",
      flavor: "Registrar o processo transforma experiência em evidência jogável.",
      icon: "📸",
      tier: "gold",
      points: 0.12,
      unlocked: (metrics) => metrics.processPhotosCount >= 3,
    },
    {
      id: "source-curator",
      title: "Curadoria inicial",
      description: "O repertório do projeto já reúne pelo menos 3 fontes registradas.",
      flavor: "Toda carta estratégica se fortalece quando o repertório vira base sólida.",
      icon: "🧾",
      tier: "gold",
      points: 0.12,
      unlocked: (metrics) => metrics.repertoryItemsCount >= 3,
    },
    {
      id: "time-15",
      title: "Presença ativa",
      description: "Foram registrados pelo menos 15 minutos ativos nesta jornada neste navegador.",
      flavor: "Tempo de foco também conta como atributo da coleção.",
      icon: "⏱️",
      tier: "silver",
      points: 0.11,
      unlocked: (metrics) => metrics.activeMinutes >= 15,
    },
    {
      id: "time-45",
      title: "Fôlego de maratona",
      description: "Foram registrados pelo menos 45 minutos ativos nesta jornada neste navegador.",
      flavor: "Persistência longa é o tipo de poder que muda a mesa inteira.",
      icon: "🔥",
      tier: "emerald",
      points: 0.25,
      unlocked: (metrics) => metrics.activeMinutes >= 45,
    },
    {
      id: "waiting-study-completed",
      title: "Pesquisa em espera concluída",
      description: "O grupo concluiu o treino de autoria e pesquisa durante a etapa de espera da orientação.",
      flavor: "Até a espera virou movimento estratégico no álbum da jornada.",
      icon: "🧭",
      tier: "emerald",
      points: 0.09,
      unlocked: (metrics) => metrics.waitingStudyCompleted,
    },
    {
      id: "platform-master",
      title: "Lenda da plataforma",
      description: "Concluir todas as etapas centrais da plataforma, com orientação confirmada, registros do processo e repertório ativo.",
      flavor: "Ultrarrara: reservada para quem fecha o ciclo completo do TCA Hub.",
      icon: "🏆",
      tier: "ultra",
      points: 0.35,
      unlocked: (metrics) => metrics.platformCompleted,
    },
  ];
}

export function buildRewardMetrics({
  group,
  projectSections,
  processPhotosCount,
  repertoryItemsCount,
  activeMinutes,
  waitingStudyCompleted,
}: BuildRewardMetricsInput): RewardMetrics {
  const themeSection = findSection(projectSections, "tema_contexto");
  const problemSection = findSection(projectSections, "problema_justificativa");
  const objectivesSection = findSection(projectSections, "objetivos");
  const methodologySection = findSection(projectSections, "metodologia_plano");
  const developmentSection = findSection(projectSections, "desenvolvimento_registros");
  const resultSection = findSection(projectSections, "resultado_produto_final");

  const planningCompleted = [problemSection, objectivesSection, methodologySection].every(sectionHasProgress);
  const developmentStarted = sectionHasProgress(developmentSection);
  const resultStarted = sectionHasProgress(resultSection);
  const advisorConfirmed = Boolean(group?.primary_advisor_id);
  const journeyCompleted = Boolean(
    sectionHasProgress(themeSection) &&
    advisorConfirmed &&
    planningCompleted &&
    developmentStarted &&
    resultStarted
  );

  return {
    hasGroup: Boolean(group),
    memberCount: countGroupMembers(group),
    totalWords: projectSections.reduce((total, section) => total + countWords(section.content), 0),
    themeWords: countWords(themeSection?.content),
    processPhotosCount,
    repertoryItemsCount,
    activeMinutes,
    themeStarted: sectionHasProgress(themeSection),
    advisorRequested: Boolean(group?.indicated_advisor_id || group?.indication_status),
    advisorConfirmed,
    problemStarted: sectionHasProgress(problemSection),
    objectivesStarted: sectionHasProgress(objectivesSection),
    methodologyStarted: sectionHasProgress(methodologySection),
    planningCompleted,
    developmentStarted,
    resultStarted,
    journeyCompleted,
    waitingStudyCompleted,
    platformCompleted: Boolean(
      group &&
      sectionHasProgress(themeSection) &&
      advisorConfirmed &&
      planningCompleted &&
      developmentStarted &&
      resultStarted &&
      processPhotosCount >= 3 &&
      repertoryItemsCount >= 3
    ),
  };
}

export function buildRewardStates(metrics: RewardMetrics): RewardState[] {
  return buildRewardDefinitions().map((reward) => ({
    ...reward,
    achieved: reward.unlocked(metrics),
  }));
}
