import type { UserRole } from "@/types/auth";

// Verifica se o papel corresponde a estudante.
export function isStudent(role: UserRole) {
  return role === "student";
}

// Verifica se o papel corresponde a orientador.
export function isAdvisor(role: UserRole) {
  return role === "advisor";
}

// Verifica se o papel corresponde a coordenador.
export function isCoordinator(role: UserRole) {
  return role === "coordinator";
}