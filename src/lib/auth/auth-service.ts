import { createClient } from "@/lib/supabase/client";
import type { SignUpData, SignInData, AuthResponse, AuthError, UserRole } from "@/types/auth";

type BrowserSupabaseClient = ReturnType<typeof createClient>;

const PROFILES_SYNC_SQL_FILE = "database/038_enable_profiles_crud_and_auth_sync.sql";

function isHandledAuthError(error: unknown): error is AuthError {
  return Boolean(error) && error instanceof Object && "code" in error && "message" in error;
}

function mapProfileSyncErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.toLowerCase();

  if (!message.includes("profile") && !message.includes("advisor")) {
    return null;
  }

  return `O usuário foi criado no Auth, mas não foi possível sincronizar o registro em public.profiles e o cadastro institucional em public.advisors. Execute o script local ${PROFILES_SYNC_SQL_FILE} no Supabase SQL Editor e tente novamente.`;
}

function normalizeUserRole(value: unknown): UserRole {
  if (value === "advisor" || value === "coordinator" || value === "student") {
    return value;
  }

  return "student";
}

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
      role?: unknown;
    };
  },
  preferredName?: string,
  preferredRole?: UserRole
) {
  const normalizedNameFromArg = preferredName?.trim() || "";
  const normalizedNameFromMetadata =
    typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name.trim() : "";

  const fallbackName = normalizedNameFromArg || normalizedNameFromMetadata || "Usuário";
  const fallbackEmail = authUser.email || "";
  const fallbackRole = preferredRole || normalizeUserRole(authUser.user_metadata?.role);

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
      role: fallbackRole,
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

  if (
    fallbackRole &&
    (
      !existingProfile.role ||
      (preferredRole && existingProfile.role !== preferredRole) ||
      (existingProfile.role === "student" && fallbackRole !== "student")
    )
  ) {
    patch.role = fallbackRole;
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

async function ensureAdvisorDirectoryEntry(
  supabase: BrowserSupabaseClient,
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: {
      name?: unknown;
      role?: unknown;
    };
  },
  preferredName?: string,
  preferredRole?: UserRole
) {
  const normalizedRole = preferredRole || normalizeUserRole(authUser.user_metadata?.role);

  if (normalizedRole !== "advisor") {
    return null;
  }

  const normalizedNameFromArg = preferredName?.trim() || "";
  const normalizedNameFromMetadata =
    typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name.trim() : "";

  const fallbackName = normalizedNameFromArg || normalizedNameFromMetadata || "Usuário";
  const fallbackEmail = authUser.email?.trim() || "";

  if (!fallbackEmail) {
    throw new Error("Erro ao sincronizar advisor: email do usuário não disponível.");
  }

  const { data: linkedAdvisor, error: linkedAdvisorError } = await supabase
    .from("advisors")
    .select("*")
    .eq("profile_id", authUser.id)
    .maybeSingle();

  if (linkedAdvisorError && linkedAdvisorError.code !== "PGRST116") {
    throw new Error(`Erro ao verificar advisor vinculado ao profile: ${linkedAdvisorError.message}`);
  }

  if (linkedAdvisor) {
    const patch: Record<string, unknown> = {};

    if (!linkedAdvisor.name || linkedAdvisor.name.trim() === "") {
      patch.name = fallbackName;
    }

    if (linkedAdvisor.email !== fallbackEmail) {
      patch.email = fallbackEmail;
    }

    if (linkedAdvisor.active === false) {
      patch.active = true;
    }

    if (Object.keys(patch).length === 0) {
      return linkedAdvisor;
    }

    const { data: updatedAdvisor, error: updateAdvisorError } = await supabase
      .from("advisors")
      .update(patch)
      .eq("id", linkedAdvisor.id)
      .select("*")
      .single();

    if (updateAdvisorError) {
      throw new Error(`Erro ao atualizar advisor vinculado ao profile: ${updateAdvisorError.message}`);
    }

    return updatedAdvisor;
  }

  const { data: advisorByEmail, error: advisorByEmailError } = await supabase
    .from("advisors")
    .select("*")
    .eq("email", fallbackEmail)
    .maybeSingle();

  if (advisorByEmailError && advisorByEmailError.code !== "PGRST116") {
    throw new Error(`Erro ao verificar advisor por email: ${advisorByEmailError.message}`);
  }

  if (advisorByEmail) {
    const patch: Record<string, unknown> = {
      profile_id: authUser.id,
    };

    if (!advisorByEmail.name || advisorByEmail.name.trim() === "") {
      patch.name = fallbackName;
    }

    if (advisorByEmail.active === false) {
      patch.active = true;
    }

    const { data: updatedAdvisor, error: updateAdvisorError } = await supabase
      .from("advisors")
      .update(patch)
      .eq("id", advisorByEmail.id)
      .select("*")
      .single();

    if (updateAdvisorError) {
      throw new Error(`Erro ao vincular advisor existente ao profile: ${updateAdvisorError.message}`);
    }

    return updatedAdvisor;
  }

  const { data: createdAdvisor, error: createAdvisorError } = await supabase
    .from("advisors")
    .insert({
      name: fallbackName,
      email: fallbackEmail,
      profile_id: authUser.id,
      active: true,
    })
    .select("*")
    .single();

  if (createAdvisorError) {
    throw new Error(`Erro ao criar advisor para o profile autenticado: ${createAdvisorError.message}`);
  }

  return createdAdvisor;
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
          role: data.role,
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

    // 2) Quando há sessão ativa, também garante o profile imediatamente via cliente autenticado.
    // Quando o projeto exige confirmação de email, o Supabase pode não devolver sessão no signup.
    // Nesse cenário, a sincronização imediata depende do trigger SQL em auth.users.
    const profileData = authData.session
      ? await ensureProfileForAuthUser(supabase, authData.user, data.name, data.role)
      : undefined;

    if (authData.session && data.role === "advisor") {
      await ensureAdvisorDirectoryEntry(supabase, authData.user, data.name, data.role);
    }

    // 3) Retornar resposta com dados de autenticação e perfil
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || data.email,
      },
      requiresEmailConfirmation: !authData.session,
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
    // Se for AuthError previsto, re-lançar sem poluir o console no modo dev
    if (isHandledAuthError(error)) {
      throw error as AuthError;
    }

    const profileSyncMessage = mapProfileSyncErrorMessage(error);
    if (profileSyncMessage) {
      throw {
        code: "profile_sync_error",
        message: profileSyncMessage,
      } as AuthError;
    }

    // Log do erro inesperado para debug
    console.error("Erro inesperado em signUp:", error);

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

    if (profileData?.role === "advisor") {
      await ensureAdvisorDirectoryEntry(supabase, authData.user, profileData.name, profileData.role);
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
    // Se for AuthError previsto, re-lançar sem poluir o console no modo dev
    if (isHandledAuthError(error)) {
      throw error as AuthError;
    }

    const profileSyncMessage = mapProfileSyncErrorMessage(error);
    if (profileSyncMessage) {
      throw {
        code: "profile_sync_error",
        message: profileSyncMessage,
      } as AuthError;
    }

    // Log do erro inesperado para debug
    console.error("Erro inesperado em signIn:", error);

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
    if (isHandledAuthError(error)) {
      throw error as AuthError;
    }

    console.error("Erro inesperado em signOut:", error);

    throw {
      code: "unknown_error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao fazer logout",
    } as AuthError;
  }
}
