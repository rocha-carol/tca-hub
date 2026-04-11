import Link from "next/link";

/**
 * Tela inicial provisória para navegação de testes do MVP.
 *
 * Esta tela evita autenticação real e oferece entradas diretas por perfil.
 * O objetivo é acelerar validação de fluxos locais sem alterar backend ou banco.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f6ee] via-[#fdfbf2] to-[#eef4df]">
      <section className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#d9e7d4] bg-white p-8 shadow-md">
          <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

          <header className="mb-8">
            <h1 className="text-3xl font-extrabold tca-title-guide">TCA Hub</h1>
            <p className="mt-2 text-slate-700">
              Acesso provisório para testes locais do MVP
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Selecionar um perfil para navegar rapidamente nas áreas principais.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/estudante"
              className="rounded-xl border border-[#d9e7d4] bg-[#f8fbf6] px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Perfil</p>
              <h2 className="mt-1 text-lg font-bold text-[#1F2937]">Entrar como estudante</h2>
              <p className="mt-2 text-sm text-[#6B7280]">Acesso direto à área Meu Projeto.</p>
            </Link>

            <Link
              href="/advisor/dashboard?modo=provisorio&perfil=advisor"
              className="rounded-xl border border-[#d9e7d4] bg-[#f8fbf6] px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Perfil</p>
              <h2 className="mt-1 text-lg font-bold text-[#1F2937]">Entrar como orientador</h2>
              <p className="mt-2 text-sm text-[#6B7280]">Acesso ao dashboard e grupos orientados.</p>
            </Link>

            <Link
              href="/coordinator/dashboard?modo=provisorio&perfil=coordinator"
              className="rounded-xl border border-[#d9e7d4] bg-[#f8fbf6] px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Perfil</p>
              <h2 className="mt-1 text-lg font-bold text-[#1F2937]">Entrar como coordenador</h2>
              <p className="mt-2 text-sm text-[#6B7280]">Acesso ao dashboard principal do hub.</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}