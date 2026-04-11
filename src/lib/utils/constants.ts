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
  ACHIEVEMENTS: "/estudante/jornada#conquistas-da-jornada",
  GROUP: "/estudante/grupo",
  GROUP_CREATE: "/estudante/groups/create",
  GROUP_STATUS: "/estudante/groups/status",
  LEGACY_NAMESPACE_HOME: "/student",
  LEGACY_HOME: "/student/meu-projeto",
  LEGACY_ROOT_HOME: "/meu-projeto",
  LEGACY_GROUP_STATUS: "/student/groups/status",
} as const;