import { NextResponse } from "next/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { fetchGroupThemeGuideState } from "@/services/group-theme-guide-state-service";
import { fetchGroupProjectSections } from "@/services/project-section-service";
import {
  buildFallbackAcademicReference,
  findAcademicReferenceSimulated,
} from "@/lib/ai/academic-reference-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Sessão não encontrada." }, { status: 401 });
    }

    const profile = await getAuthenticatedProfile();

    if (profile?.role === "advisor" || profile?.role === "coordinator") {
      return NextResponse.json({ message: "Funcionalidade disponível apenas para estudantes." }, { status: 403 });
    }

    const studentContext = await resolveStudentGroupContext(user.id);

    if (!studentContext.group || studentContext.group.id !== id) {
      return NextResponse.json({ message: "Grupo do estudante não encontrado para esta rota." }, { status: 403 });
    }

    const themeGuideState = await fetchGroupThemeGuideState(id).catch(() => null);
    const projectSections = await fetchGroupProjectSections(id).catch(() => []);
    const themeSection = projectSections.find((section) => section.section_key === "tema_contexto") ?? null;

    const referenceInput = {
      theme: studentContext.group.theme || "tema do grupo",
      sectionText: themeSection?.content ?? null,
      selectedInterestTags: themeGuideState?.selected_interest_tags ?? [],
      themeGuideSuggestions: themeGuideState?.ai_suggestions ?? null,
    };

    try {
      const academicReference = await findAcademicReferenceSimulated(referenceInput);
      return NextResponse.json(academicReference);
    } catch {
      const fallbackReference = buildFallbackAcademicReference(referenceInput);
      return NextResponse.json(fallbackReference);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível localizar uma fonte acadêmica agora.";
    return NextResponse.json({ message }, { status: 500 });
  }
}