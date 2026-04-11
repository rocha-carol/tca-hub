import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { Profile } from "@/types/profile";
import { MVP_SESSION_COOKIE, parseMvpSessionCookieValue } from "@/lib/auth/mvp-session";

export interface AuthenticatedSessionUser {
  id: string;
  email: string | null;
  user_metadata?: {
    name?: string;
  };
}

async function getProfileById(profileId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar profile autenticado: ${error.message}`);
  }

  return (data || null) as Profile | null;
}

async function getMvpProfileFromCookie(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const payload = parseMvpSessionCookieValue(cookieStore.get(MVP_SESSION_COOKIE)?.value);

  if (!payload) {
    return null;
  }

  const profile = await getProfileById(payload.profileId);

  if (!profile || profile.role !== payload.role) {
    return null;
  }

  return profile;
}

/**
 * Etapa 4 — Autenticação básica com Supabase.
 *
 * Serviço responsável por operações essenciais de sessão no servidor:
 * - ler usuário autenticado atual
 * - buscar profile do usuário autenticado
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedSessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Erro ao validar sessão: ${error.message}`);
  }

  if (user) {
    return {
      id: user.id,
      email: user.email ?? null,
      user_metadata: {
        name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined,
      },
    };
  }

  const mvpProfile = await getMvpProfileFromCookie();
  if (!mvpProfile) {
    return null;
  }

  return {
    id: mvpProfile.id,
    email: mvpProfile.email ?? null,
    user_metadata: {
      name: mvpProfile.name,
    },
  };
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

  if (user) {
    return getProfileById(user.id);
  }

  return getMvpProfileFromCookie();
}

export async function getAuthenticatedSessionMode(): Promise<"supabase" | "mvp" | "none"> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return "supabase";
  }

  const mvpProfile = await getMvpProfileFromCookie();
  return mvpProfile ? "mvp" : "none";
}

/**
 * Verifica se o profile possui os dados mínimos para navegação no app.
 *
 * MVP atual: apenas nome com pelo menos 3 caracteres.
 */
export function hasMinimumProfile(profile: Pick<Profile, "name"> | null): boolean {
  if (!profile) {
    return false;
  }

  return typeof profile.name === "string" && profile.name.trim().length >= 3;
}
