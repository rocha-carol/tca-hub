import { createClient } from "@/lib/supabase/client";
import type { SignUpData, SignInData, AuthResponse, AuthError } from "@/types/auth";

type BrowserSupabaseClient = ReturnType<typeof createClient>;

/**
 * Etapa 3 — Integração auth.users ↔ profiles.
 *
 * Garante que todo usuário autenticado possua profile correspondente.
 * Regras:
 * - id em profiles sempre igual ao id de auth.users
 * - se profile não existir, cria com defaults seguros
 * - se existir, corrige campos essenciais ausentes (nome/email)
 */
async function ensureProfileForAuthUser(
  supabase: BrowserSupabaseClient,
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: {
      name?: unknown;
    };
  },
  preferredName?: string
) {
  const normalizedNameFromArg = preferredName?.trim() || "";
  const normalizedNameFromMetadata =
    typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name.trim() : "";

  const fallbackName = normalizedNameFromArg || normalizedNameFromMetadata || "Usuário";
  const fallbackEmail = authUser.email || "";

  const { data: existingProfile, error: findError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (findError && findError.code !== "PGRST116") {
    throw new Error(`Erro ao verificar profile do usuário: ${findError.message}`);
  }

  // Profile não existe: cria registro 1:1 com auth.users
  if (!existingProfile) {
    const payload = {
      id: authUser.id,
      name: fallbackName,
      email: fallbackEmail,
      role: "student",
      active: true,
    };

    const { data: insertedProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      throw new Error(`Erro ao criar profile do usuário: ${insertError.message}`);
    }

    return insertedProfile;
  }

  // Profile já existe: corrige campos essenciais ausentes sem sobrescrever regra de negócio
  const patch: Record<string, unknown> = {};

  if (!existingProfile.name && fallbackName) {
    patch.name = fallbackName;
  }

  if ((!existingProfile.email || existingProfile.email.trim() === "") && fallbackEmail) {
    patch.email = fallbackEmail;
  }

  if (Object.keys(patch).length === 0) {
    return existingProfile;
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", authUser.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(`Erro ao atualizar profile do usuário: ${updateError.message}`);
  }

  return updatedProfile;
}

/**
 * Efetua cadastro (signup) de novo usuário no sistema.
 *
 * Fluxo:
 * 1. Cria usuário em Supabase Auth (auth.users)
 * 2. Se sucesso, cria profile em public.profiles com os dados fornecidos
 * 3. Sessão é automaticamente gerenciada por Supabase
 * 4. Retorna dados do usuário e perfil criado
 *
 * @param data - dados de cadastro (email, password, name)
 * @returns AuthResponse contendo user e profile criados
 * @throws AuthError em caso de falha
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    // 1) Criar usuário em Supabase Auth (auth.users)
    // O método signUp retorna o usuário criado e uma sessão
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Dados adicionais que serão armazenados em auth.users.user_metadata
        data: {
          name: data.name,
        },
      },
    });

    // Se houver erro na autenticação, lançar exceção
    if (authError) {
      if (
        authError.code === "user_already_exists" ||
        authError.message.toLowerCase().includes("already registered")
      ) {
        throw {
          code: "user_already_exists",
          message: "Este email já está cadastrado. Tente fazer login.",
        } as AuthError;
      }

      throw {
        code: authError.code || "auth_error",
        message: authError.message || "Erro ao criar conta",
      } as AuthError;
    }

    // Se não houver usuário retornado, algo deu errado
    if (!authData.user) {
      throw {
        code: "user_not_created",
        message: "Usuário não foi criado corretamente",
      } as AuthError;
    }

    // 2) Garantir profile 1:1 integrado com auth.users
    const profileData = await ensureProfileForAuthUser(supabase, authData.user, data.name);

    // 3) Retornar resposta com dados de autenticação e perfil
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || data.email,
      },
      profile: profileData
        ? {
            id: profileData.id,
            name: profileData.name,
            email: profileData.email,
            role: profileData.role,
            active: profileData.active,
            created_at: profileData.created_at,
          }
        : undefined,
    };
  } catch (error) {
    // Log do erro para debug
    console.error("Erro em signUp:", error);

    // Se for AuthError, re-lançar como está
    if (error instanceof Object && "code" in error && "message" in error) {
      throw error as AuthError;
    }

    // Caso contrário, lançar erro genérico
    throw {
      code: "unknown_error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao cadastrar",
    } as AuthError;
  }
}

/**
 * Efetua login de usuário existente no sistema.
 *
 * Fluxo:
 * 1. Valida email e password em Supabase Auth
 * 2. Se sucesso, Supabase mantém sessão automaticamente
 * 3. Busca o profile correspondente em public.profiles
 * 4. Retorna dados do usuário e perfil
 *
 * @param data - dados de login (email, password)
 * @returns AuthResponse contendo user e profile do usuário logado
 * @throws AuthError em caso de falha
 */
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    // 1) Validar credenciais com Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    // Se houver erro de autenticação, lançar exceção
    if (authError) {
      if (authError.code === "email_not_confirmed") {
        throw {
          code: authError.code,
          message: "Email não confirmado. Verifique sua caixa de entrada para concluir o cadastro.",
        } as AuthError;
      }

      throw {
        code: authError.code || "invalid_credentials",
        message: "Email ou senha incorretos",
      } as AuthError;
    }

    // Se não houver usuário, erro desconhecido
    if (!authData.user) {
      throw {
        code: "login_failed",
        message: "Login não foi bem-sucedido",
      } as AuthError;
    }

    // 2) Garantir profile 1:1 integrado com auth.users no login
    const profileData = await ensureProfileForAuthUser(supabase, authData.user);

    // 3) Retornar resposta com dados de autenticação e perfil
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || data.email,
      },
      profile: profileData
        ? {
            id: profileData.id,
            name: profileData.name,
            email: profileData.email,
            role: profileData.role,
            active: profileData.active,
            created_at: profileData.created_at,
          }
        : undefined,
    };
  } catch (error) {
    // Log do erro para debug
    console.error("Erro em signIn:", error);

    // Se for AuthError, re-lançar como está
    if (error instanceof Object && "code" in error && "message" in error) {
      throw error as AuthError;
    }

    // Caso contrário, lançar erro genérico
    throw {
      code: "unknown_error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao fazer login",
    } as AuthError;
  }
}

/**
 * Efetua logout do usuário atual.
 *
 * Remove a sessão do Supabase Auth (limpa cookie).
 *
 * @throws AuthError em caso de falha
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw {
        code: error.code || "logout_error",
        message: error.message || "Erro ao fazer logout",
      } as AuthError;
    }
  } catch (error) {
    console.error("Erro em signOut:", error);

    if (error instanceof Object && "code" in error && "message" in error) {
      throw error as AuthError;
    }

    throw {
      code: "unknown_error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao fazer logout",
    } as AuthError;
  }
}
