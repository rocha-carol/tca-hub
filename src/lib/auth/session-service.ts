import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

/**
 * Etapa 4 — Autenticação básica com Supabase.
 *
 * Serviço responsável por operações essenciais de sessão no servidor:
 * - ler usuário autenticado atual
 * - buscar profile do usuário autenticado
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Erro ao validar sessão: ${error.message}`);
  }

  return user;
}

/**
 * Busca o profile associado ao usuário autenticado atual.
 * Retorna null quando não houver sessão ativa ou profile inexistente.
 */
export async function getAuthenticatedProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar profile autenticado: ${error.message}`);
  }

  return (data || null) as Profile | null;
}
