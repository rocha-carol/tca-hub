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