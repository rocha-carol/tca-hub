import { createClient } from "@/lib/supabase/client";
import type { SignUpData, SignInData, AuthResponse, AuthError } from "@/types/auth";

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
    console.log("[auth-service.signUp] iniciado", {
      email: data.email,
      name: data.name,
      passwordLength: data.password.length,
    });

    // 1) Criar usuário em Supabase Auth
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

    console.log("[auth-service.signUp] retorno auth.signUp", {
      hasUser: Boolean(authData?.user),
      userId: authData?.user?.id,
      errorCode: authError?.code,
      errorMessage: authError?.message,
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

    // 2) Criar profile em public.profiles
    // O profile.id deve ser igual a auth.users.id (relação 1:1)
    const profilePayload = {
      id: authData.user.id, // Usar o UUID do usuário autenticado
      name: data.name,
      email: data.email,
      role: "student", // Role padrão para novos usuários
      active: true,
    };

    // 2) Criar ou atualizar profile (idempotente)
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    console.log("[auth-service.signUp] retorno upsert profile", {
      hasError: Boolean(upsertError),
      errorCode: upsertError?.code,
      errorMessage: upsertError?.message,
    });

    // 3) Tentar ler profile criado; se falhar, não bloquear signup
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    console.log("[auth-service.signUp] profile após upsert", {
      hasProfile: Boolean(profileData),
      profileId: profileData?.id,
    });

    if (upsertError) {
      console.warn("Aviso em signUp (profile upsert):", upsertError.message);
    }

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

    // 2) Buscar profile do usuário logado
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    // Se não encontrar profile, não bloquear login.
    // Isso permite autenticar e tratar criação/reparo de profile em etapas seguintes.
    if (profileError) {
      console.warn("Aviso em signIn (profile query):", profileError.message);
    }

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
