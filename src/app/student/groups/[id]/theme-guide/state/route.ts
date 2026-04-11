import { NextResponse } from "next/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import {
  fetchGroupThemeGuideState,
  upsertGroupThemeGuideState,
} from "@/services/group-theme-guide-state-service";
import type { ThemeGuideSuggestionResult } from "@/types/group-theme-guide-state";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ThemeGuideStateRequestBody {
  checks?: unknown;
  selectedCategory?: unknown;
  selectedInterestTags?: unknown;
  draftNotes?: unknown;
  aiSuggestions?: unknown;
}

const READYNESS_CHECKS_COUNT = 3;
const MAX_DRAFT_NOTES_LENGTH = 5000;

function isThemeGuideSuggestionResult(value: unknown): value is ThemeGuideSuggestionResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as ThemeGuideSuggestionResult;

  return (
    typeof candidate.interest_summary === "string" &&
    Array.isArray(candidate.possible_paths) &&
    candidate.possible_paths.every((item) => typeof item === "string") &&
    Array.isArray(candidate.conversation_starters) &&
    candidate.conversation_starters.every((item) => typeof item === "string") &&
    typeof candidate.model_name === "string"
  );
}

function parseChecks(value: unknown) {
  if (!Array.isArray(value) || value.length !== READYNESS_CHECKS_COUNT) {
    throw new Error("O check final do grupo precisa ter exatamente 3 marcações.");
  }

  return value.map((item) => Boolean(item));
}

function parseSelectedCategory(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseSelectedInterestTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 20);
}

function parseDraftNotes(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, MAX_DRAFT_NOTES_LENGTH);
}

function parseAiSuggestions(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (!isThemeGuideSuggestionResult(value)) {
    throw new Error("As sugestões geradas para o guia de tema vieram em um formato inválido.");
  }

  return value;
}

async function resolveStudentThemeGuideAccess(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { errorResponse: NextResponse.json({ message: "Sessão não encontrada." }, { status: 401 }) };
  }

  const profile = await getAuthenticatedProfile();

  if (profile?.role === "advisor" || profile?.role === "coordinator") {
    return {
      errorResponse: NextResponse.json({ message: "Funcionalidade disponível apenas para estudantes." }, { status: 403 }),
    };
  }

  const studentContext = await resolveStudentGroupContext(user.id);

  if (!studentContext.group || studentContext.group.id !== id) {
    return {
      errorResponse: NextResponse.json({ message: "Grupo do estudante não encontrado para esta rota." }, { status: 403 }),
    };
  }

  return {
    user,
    profile,
    studentContext,
    errorResponse: null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await resolveStudentThemeGuideAccess(id);

    if (access.errorResponse) {
      return access.errorResponse;
    }

    const group = access.studentContext.group;
    if (!group) {
      return NextResponse.json({ message: "Grupo do estudante não encontrado para esta rota." }, { status: 403 });
    }

    const state = await fetchGroupThemeGuideState(group.id);
    return NextResponse.json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o guia de tema do grupo agora.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

async function handleUpsert(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await resolveStudentThemeGuideAccess(id);

  if (access.errorResponse) {
    return access.errorResponse;
  }

  const group = access.studentContext.group;
  if (!group) {
    return NextResponse.json({ message: "Grupo do estudante não encontrado para esta rota." }, { status: 403 });
  }

  const body = (await request.json()) as ThemeGuideStateRequestBody;

  await upsertGroupThemeGuideState({
    group_id: group.id,
    checks: parseChecks(body.checks),
    selected_category: parseSelectedCategory(body.selectedCategory),
    selected_interest_tags: parseSelectedInterestTags(body.selectedInterestTags),
    draft_notes: parseDraftNotes(body.draftNotes),
    ai_suggestions: parseAiSuggestions(body.aiSuggestions),
    updated_by_profile_id: access.profile?.id ?? access.user.id,
    updated_by_name: access.profile?.name || access.user.email || "Estudante",
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    return await handleUpsert(request, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o guia de tema do grupo agora.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    return await handleUpsert(request, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o guia de tema do grupo agora.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
