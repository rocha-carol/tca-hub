import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

/**
 * Busca todos os profiles da tabela 'profiles'.
 *
 * Esta é uma função simples de leitura que:
 * 1. Cria uma instância do cliente Supabase no navegador
 * 2. Executa um SELECT * na tabela profiles
 * 3. Retorna os dados tipados como Profile[]
 *
 * Sem autenticação ainda, isso retorna todos os registros.
 * Depois, adicionaremos filtros por usuário logado.
 */
export async function fetchAllProfiles(): Promise<Profile[]> {
  try {
    // Cria cliente Supabase para uso no servidor.
    const supabase = await createClient();

    // Executa query simples: buscar todos os profiles.
    // .from("profiles") → especifica a tabela
    // .select("*") → seleciona todas as colunas
    // .data → extrai o array de resultados
    const { data, error } = await supabase.from("profiles").select("*");

    // Se houver erro, lança exceção com mensagem clara.
    if (error) {
      throw new Error(`Erro ao buscar profiles: ${error.message}`);
    }

    // Retorna os dados tipados como Profile[].
    // Se nenhum profile existe, retorna array vazio.
    return (data || []) as Profile[];
  } catch (error) {
    // Log do erro para debug.
    console.error("Erro em fetchAllProfiles:", error);

    // Re-lança o erro para tratamento no componente.
    throw error;
  }
}

/**
 * Busca um profile específico pelo ID.
 *
 * Útil quando você quer dados de um usuário único.
 * Será usado depois na autenticação.
 */
export async function fetchProfileById(id: string): Promise<Profile | null> {
  try {
    // Cria cliente Supabase para uso no servidor.
    const supabase = await createClient();

    // .eq("id", id) → WHERE id = ?
    // .single() → espera um único resultado
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      // Se for erro de "não encontrado", retorna null.
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar profile: ${error.message}`);
    }

    return (data || null) as Profile | null;
  } catch (error) {
    console.error("Erro em fetchProfileById:", error);
    throw error;
  }
}
