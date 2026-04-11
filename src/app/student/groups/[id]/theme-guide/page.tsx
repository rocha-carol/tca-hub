import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ThemeChoiceGuide } from "@/components/student/ThemeChoiceGuide";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import { fetchGroupThemeGuideState } from "@/services/group-theme-guide-state-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentThemeGuidePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentThemeGuidePage({ params }: StudentThemeGuidePageProps) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();

  if (profile?.role === "coordinator") {
    redirect("/coordinator/dashboard");
  }

  if (profile?.role === "advisor") {
    redirect("/advisor/dashboard");
  }

  const context = await resolveStudentGroupContext(user.id);

  if (!context.group || context.group.id !== id) {
    redirect(STUDENT_ROUTES.HOME);
  }

  const sections = await ensureGroupProjectSectionsStructure(context.group.id);
  const themeSection = sections.find((section) => section.section_key === "tema_contexto") || sections[0];

  if (!themeSection) {
    redirect(`/groups/${context.group.id}/project`);
  }

  const targetHref = `/groups/${context.group.id}/project/sections/${themeSection.id}`;
  const suggestionsEndpoint = `/estudante/groups/${context.group.id}/theme-guide/suggestions`;
  const saveEndpoint = `/estudante/groups/${context.group.id}/theme-guide/state`;
  let sharedThemeGuideState = null;

  try {
    sharedThemeGuideState = await fetchGroupThemeGuideState(context.group.id);
  } catch {
    sharedThemeGuideState = null;
  }

  const initialState = sharedThemeGuideState
    ? {
        checks: sharedThemeGuideState.checks,
        selectedCategory: sharedThemeGuideState.selected_category ?? undefined,
        selectedInterestTags: sharedThemeGuideState.selected_interest_tags,
        draftNotes: sharedThemeGuideState.draft_notes ?? "",
        aiSuggestions: sharedThemeGuideState.ai_suggestions,
      }
    : null;

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-7 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tca-title-guide">Escolha do tema</h1>
            <p className="text-gray-600 mt-1.5">Uma preparação rápida para o grupo entrar nessa etapa com mais clareza.</p>
          </div>

          <Link href={STUDENT_ROUTES.HOME} className="text-sm font-medium text-[#2F6F35] hover:underline">
            ← Voltar para a área do estudante
          </Link>
        </div>

        <Card className="border border-[#E5E7EB] bg-white/90">
          <p className="text-sm text-[#374151] leading-relaxed">
            Antes de preencher a etapa de tema, vale alinhar o olhar do grupo: o que faz sentido investigar,
            como sair de ideias genéricas e como transformar um assunto em uma escolha mais concreta.
          </p>
        </Card>

        <ThemeChoiceGuide
          targetHref={targetHref}
          suggestionsEndpoint={suggestionsEndpoint}
          saveEndpoint={saveEndpoint}
          initialState={initialState}
        />
      </section>
    </main>
  );
}