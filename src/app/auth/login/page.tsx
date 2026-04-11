import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SignInForm from "@/components/auth/SignInForm";
import { MVP_SESSION_COOKIE, getRoleHomePath, serializeMvpSessionCookieValue } from "@/lib/auth/mvp-session";
import { fetchAllProfiles, fetchProfileById } from "@/services/profile-service";
import type { UserRole } from "@/types/auth";

interface SignInPageProps {
  searchParams?: Promise<{ perfil?: string }>;
}

function isUserRole(value: string | undefined): value is UserRole {
  return value === "student" || value === "advisor" || value === "coordinator";
}

function getRoleLabel(role: UserRole) {
  if (role === "student") return "Estudantes";
  if (role === "advisor") return "Orientadores";
  return "Coordenação";
}

function getRoleDescription(role: UserRole) {
  if (role === "student") {
    return "Escolha um estudante para validar jornada, grupo, tema, escrita e produto final.";
  }

  if (role === "advisor") {
    return "Escolha um orientador para validar acompanhamento, notificações e projeto do grupo vinculado.";
  }

  return "Escolha um perfil de coordenação para validar panorama institucional e gestão dos vínculos.";
}

function getRoleAccent(role: UserRole) {
  if (role === "student") return "border-[#DCEBD5] bg-[#F8FBF6]";
  if (role === "advisor") return "border-[#D9E8F7] bg-[#F6FAFF]";
  return "border-[#F4E2B7] bg-[#FFFDF5]";
}

function getFallbackHref(role: UserRole) {
  if (role === "advisor") {
    return "/advisor/dashboard?modo=provisorio&perfil=advisor";
  }

  if (role === "coordinator") {
    return "/coordinator/dashboard?modo=provisorio&perfil=coordinator";
  }

  return null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = searchParams ? await searchParams : {};
  const highlightedRole = isUserRole(params.perfil) ? params.perfil : null;

  async function handleSimpleLogin(formData: FormData) {
    "use server";

    const profileId = String(formData.get("profile_id") ?? "").trim();

    if (!profileId) {
      redirect("/auth/login");
    }

    const profile = await fetchProfileById(profileId);

    if (!profile || !profile.active) {
      redirect("/auth/login");
    }

    const cookieStore = await cookies();
    cookieStore.set(
      MVP_SESSION_COOKIE,
      serializeMvpSessionCookieValue({
        profileId: profile.id,
        role: profile.role,
        name: profile.name,
        email: profile.email,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }
    );

    redirect(getRoleHomePath(profile.role));
  }

  async function handleSimpleLogout() {
    "use server";

    const cookieStore = await cookies();
    cookieStore.delete(MVP_SESSION_COOKIE);
    redirect("/auth/login");
  }

  let profiles = [] as Awaited<ReturnType<typeof fetchAllProfiles>>;

  try {
    profiles = await fetchAllProfiles();
  } catch {
    profiles = [];
  }

  const activeProfiles = profiles.filter((profile) => profile.active !== false);
  const profilesByRole: Record<UserRole, typeof activeProfiles> = {
    student: activeProfiles.filter((profile) => profile.role === "student"),
    advisor: activeProfiles.filter((profile) => profile.role === "advisor"),
    coordinator: activeProfiles.filter((profile) => profile.role === "coordinator"),
  };

  const orderedRoles: UserRole[] = highlightedRole
    ? [highlightedRole, ...(["student", "advisor", "coordinator"] as UserRole[]).filter((role) => role !== highlightedRole)]
    : ["student", "advisor", "coordinator"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f6ee] via-[#fdfbf2] to-[#eef4df] p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tca-title-guide mb-2">TCA Hub</h1>
          <p className="text-slate-700">Entrada simples do MVP</p>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl mx-auto">
            Escolha um usuário real já cadastrado no sistema para validar o fluxo do perfil correspondente, sem depender de autenticação real neste momento do MVP.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <section className="rounded-2xl border border-[#d9e7d4] bg-white p-6 shadow-md">
            <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

            <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1F2937]">Selecionar usuário do MVP</h2>
                <p className="text-sm text-[#6B7280] mt-1">
                  Cada acesso usa um usuário simples de teste e preserva o restante do fluxo já implementado.
                </p>
              </div>

              <form action={handleSimpleLogout}>
                <button
                  type="submit"
                  className="inline-flex rounded-lg border border-[#D9E8D2] bg-[#F8FBF6] px-4 py-2 text-sm font-medium text-[#2C5E31] transition-colors hover:border-[#C9DEC0] hover:bg-[#F3FBF1]"
                >
                  Limpar acesso simples
                </button>
              </form>
            </div>

            <div className="space-y-5">
              {orderedRoles.map((role) => {
                const roleProfiles = profilesByRole[role];

                return (
                  <section
                    key={role}
                    className={`rounded-2xl border px-4 py-4 ${getRoleAccent(role)}`}
                  >
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">{getRoleLabel(role)}</p>
                      <p className="text-sm text-[#4B5563] mt-1">{getRoleDescription(role)}</p>
                    </div>

                    {roleProfiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#D7E5D3] bg-white/80 px-4 py-4 text-sm text-[#6B7280] space-y-3">
                        <p>Nenhum usuário ativo encontrado para este perfil.</p>

                        {getFallbackHref(role) ? (
                          <Link
                            href={getFallbackHref(role) || "/auth/login"}
                            className="inline-flex rounded-lg border border-[#D9E8D2] bg-[#F8FBF6] px-4 py-2 text-sm font-medium text-[#2C5E31] transition-colors hover:border-[#C9DEC0] hover:bg-[#F3FBF1]"
                          >
                            Entrar em modo provisório
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {roleProfiles.map((profile) => (
                          <form key={profile.id} action={handleSimpleLogin} className="h-full">
                            <input type="hidden" name="profile_id" value={profile.id} />
                            <button
                              type="submit"
                              className="flex h-full w-full flex-col items-start rounded-2xl border border-white/90 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#C9DEC0] hover:shadow-md"
                            >
                              <p className="text-base font-semibold text-[#1F2937]">{profile.name}</p>
                              <p className="mt-1 text-sm text-[#6B7280]">{profile.email}</p>
                              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[#7AA56F]">
                                Entrar neste fluxo
                              </p>
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-[#d9e7d4] bg-white p-6 shadow-md">
              <h2 className="text-xl font-bold text-[#1F2937]">Como usar nesta etapa</h2>
              <ol className="mt-4 space-y-3 text-sm text-[#4B5563] list-decimal pl-5">
                <li>Escolher o perfil que será validado.</li>
                <li>Selecionar um usuário já cadastrado nesse perfil.</li>
                <li>Entrar no fluxo correspondente sem autenticação real.</li>
                <li>Usar <span className="font-medium">Limpar acesso simples</span> para trocar o perfil de teste.</li>
              </ol>

              <div className="mt-5 rounded-xl border border-[#E8EEE4] bg-[#F8FBF6] px-4 py-4 text-sm text-[#4B5563]">
                O login real continua preservado no projeto, mas fica recolhido nesta fase para não atrapalhar a validação rápida do MVP.
              </div>

              <Link href="/" className="mt-5 inline-flex text-sm font-medium text-lime-700 hover:underline">
                ← Voltar para a página inicial
              </Link>
            </div>

            <details className="rounded-2xl border border-[#d9e7d4] bg-white p-6 shadow-md">
              <summary className="cursor-pointer text-base font-semibold text-[#1F2937]">
                Mostrar login real existente
              </summary>
              <p className="mt-3 text-sm text-[#6B7280]">
                Mantido para preservar a funcionalidade já implementada, sem colocá-la como foco do MVP nesta fase.
              </p>
              <div className="mt-5">
                <SignInForm />
              </div>
            </details>
          </aside>
        </div>
      </div>
    </div>
  );
}
