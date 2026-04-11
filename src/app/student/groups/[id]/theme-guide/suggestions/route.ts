import { NextResponse } from "next/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { generateThemeIdeaSuggestionsSimulated } from "@/lib/ai/pedagogical-feedback-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
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

    const body = (await request.json()) as { selectedTopics?: unknown };
    const selectedTopics = Array.isArray(body.selectedTopics)
      ? body.selectedTopics.filter((value): value is string => typeof value === "string")
      : [];

    if (selectedTopics.length === 0) {
      return NextResponse.json({ message: "Selecione pelo menos um assunto para receber sugestões." }, { status: 400 });
    }

    const suggestions = await generateThemeIdeaSuggestionsSimulated({ selectedTopics });

    return NextResponse.json(suggestions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar sugestões agora.";
    return NextResponse.json({ message }, { status: 500 });
  }
}