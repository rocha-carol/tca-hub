// Define os papéis disponíveis no sistema.
// Os valores são utilizados para controle de acesso e permissões.
export const USER_ROLES = {
  STUDENT: "student",
  ADVISOR: "advisor",
  COORDINATOR: "coordinator",
} as const;

// Define as chaves internas das seções do projeto.
// Mantidas em inglês para padronização técnica.
export const PROJECT_SECTION_KEYS = {
  THEME: "theme",
  RESEARCH_PROBLEM: "research_problem",
  JUSTIFICATION: "justification",
  OBJECTIVE: "objective",
  METHODOLOGY: "methodology",
  DEVELOPMENT: "development",
  CONCLUSION: "conclusion",
} as const;

// Define as rotas canônicas da experiência principal do estudante.
// As rotas legadas devem apontar para estes destinos para evitar URLs
// diferentes representando a mesma responsabilidade de navegação.
export const STUDENT_ROUTES = {
  HOME: "/estudante",
  JOURNEY: "/estudante/jornada",
  ACHIEVEMENTS: "/estudante/conquistas",
  GROUP: "/estudante/grupo",
  GROUP_CREATE: "/estudante/groups/create",
  GROUP_STATUS: "/estudante/groups/status",
  LEGACY_NAMESPACE_HOME: "/student",
  LEGACY_HOME: "/student/meu-projeto",
  LEGACY_ROOT_HOME: "/meu-projeto",
  LEGACY_GROUP_STATUS: "/student/groups/status",
} as const;

// Define chaves e eventos de persistência local usados na jornada do estudante.
// Esses identificadores permitem sincronizar interações entre cards da mesma tela.
export const STUDENT_JOURNEY_STORAGE_KEYS = {
  ACTIVE_MINUTES: "tca-hub:journey-active-minutes",
  WAITING_STUDY_COMPLETED: "tca-hub:waiting-study-completed",
} as const;

export const STUDENT_JOURNEY_EVENTS = {
  WAITING_STUDY_COMPLETED: "tca-hub:waiting-study-completed",
} as const;

export const STUDENT_JOURNEY_SECTION_IDS = {
  WAITING_STUDY: "apoio-pesquisa-em-espera",
} as const;