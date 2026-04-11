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
        <div className="w-full rounded-2xl border border-[#d9e7d4] bg-white p-8 shadow-md text-center">
          <div className="tca-stripes h-1.5 w-full rounded-md mb-6" />

          <header className="mb-2">
            <Link
              href="/auth/login?perfil=student"
              className="inline-flex text-3xl font-extrabold tca-title-guide transition-opacity hover:opacity-80"
            >
              TCA Hub
            </Link>
            <p className="mt-2 text-slate-700">Plataforma de investigação pedagógica</p>
          </header>

          <p className="mt-6 text-slate-700">Acesso provisório para testes locais do MVP.</p>
        </div>
      </section>
    </main>
  );
}