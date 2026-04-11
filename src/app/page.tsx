import SignInForm from "@/components/auth/SignInForm";

/**
 * Tela inicial do MVP para apresentação com login real triplicado.
 *
 * Cada bloco representa um perfil do sistema com credenciais locais
 * pré-preenchidas e persistidas no navegador para agilizar a demonstração.
 */
export default function Home() {
  const sharedPassword = process.env.MVP_SHARED_PASSWORD ?? "75077132";

  const loginProfiles = [
    {
      key: "student",
      title: "Login do estudante",
      description:
        "Acesso ao percurso do estudante, jornada do projeto, grupo, escrita e registros do TCA.",
      submitLabel: "Entrar como estudante",
      initialEmail: process.env.MVP_STUDENT_EMAIL ?? "",
      initialPassword: process.env.MVP_STUDENT_PASSWORD ?? sharedPassword,
      storageKey: "tca:mvp-login:student",
    },
    {
      key: "advisor",
      title: "Login do orientador",
      description:
        "Acesso ao dashboard de acompanhamento pedagógico, grupos vinculados, comentários e próximos passos.",
      submitLabel: "Entrar como orientador",
      initialEmail: process.env.MVP_ADVISOR_EMAIL ?? "",
      initialPassword: process.env.MVP_ADVISOR_PASSWORD ?? sharedPassword,
      storageKey: "tca:mvp-login:advisor",
    },
    {
      key: "coordinator",
      title: "Login da coordenação",
      description:
        "Acesso ao panorama institucional, gestão de grupos, orientadores e gargalos do processo do TCA.",
      submitLabel: "Entrar como coordenação",
      initialEmail: process.env.MVP_COORDINATOR_EMAIL ?? "",
      initialPassword: process.env.MVP_COORDINATOR_PASSWORD ?? sharedPassword,
      storageKey: "tca:mvp-login:coordinator",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f6ee] via-[#fdfbf2] to-[#eef4df]">
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#d9e7d4] bg-white p-8 shadow-md">
          <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

          <header className="mb-8">
            <h1 className="text-3xl font-extrabold tca-title-guide">TCA Hub</h1>
            <p className="mt-2 text-slate-700">
              Entrada de apresentação com login real para os três perfis do MVP
            </p>
            <p className="mt-3 text-sm text-slate-600 max-w-3xl">
              As credenciais podem vir de variáveis locais do ambiente e também ficam salvas neste navegador quando forem ajustadas durante a apresentação.
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Senha padrão do MVP para contas ainda não configuradas: <span className="font-semibold">75077132</span>
            </p>
          </header>

          <div className="grid gap-5 xl:grid-cols-3">
            {loginProfiles.map((profile) => (
              <SignInForm
                key={profile.key}
                title={profile.title}
                description={profile.description}
                submitLabel={profile.submitLabel}
                initialEmail={profile.initialEmail}
                initialPassword={profile.initialPassword}
                storageKey={profile.storageKey}
                showSignUpLink={false}
                className="max-w-none h-full border-[#D9E7D4] bg-[#FBFDF9]"
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}