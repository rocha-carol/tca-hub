import Link from "next/link";

/**
 * Página inicial pública do TCA Hub.
 *
 * Esta tela apresenta o valor do produto e encaminha o acesso
 * para o login real do sistema.
 */
export default function Home() {
  const accessPlatformCtaClass = "inline-flex min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4CAF50_0%,#2F6F35_100%)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(47,111,53,0.72)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105";

  const audiences = [
    {
      key: "student",
      badge: "Estudante",
      title: "Autoria com mais clareza",
      description:
        "Encontra uma trilha mais clara para escolher um tema, organizar a investigação, registrar o percurso e construir uma proposta de intervenção.",
    },
    {
      key: "advisor",
      badge: "Orientador",
      title: "Acompanhamento pedagógico visível",
      description:
        "Ganha melhores condições de acompanhar grupos, identificar dificuldades e intervir pedagogicamente ao longo do processo.",
    },
    {
      key: "coordinator",
      badge: "Coordenação",
      title: "Leitura institucional do percurso",
      description:
        "Consegue visualizar o andamento geral, os gargalos do processo e a organização pedagógica dos projetos desenvolvidos na escola.",
    },
  ];

  const schoolChallenges = [
    "pouca visibilidade sobre o percurso real de pesquisa, escrita e construção das ideias",
    "acompanhamento fragmentado entre anotações, documentos soltos e encontros pontuais",
    "dificuldade para orientar vários grupos investigativos ao mesmo tempo",
    "baixa documentação do processo de aprendizagem, com foco excessivo apenas na entrega final",
  ];

  const studentChallenges = [
    "escolher um tema relevante e investigável",
    "organizar o grupo e manter o foco coletivo no percurso",
    "registrar as etapas da investigação com clareza e continuidade",
    "transformar pesquisa em uma proposta concreta de intervenção social",
  ];

  const solutionPillars = [
    {
      title: "Processo, não só produto",
      description: "A proposta central é acompanhar a jornada investigativa do início ao fim, e não apenas o trabalho final entregue no encerramento.",
    },
    {
      title: "Estrutura para orientar a investigação",
      description: "O TCA Hub organiza tema, planejamento, registros, orientação e intervenção em um mesmo percurso pedagógico.",
    },
    {
      title: "Visibilidade para quem acompanha",
      description: "O professor deixa de ver apenas o resultado final e passa a enxergar dúvidas, avanços, escolhas e evidências do processo.",
    },
    {
      title: "Autoria com sentido social",
      description: "O projeto não termina em texto: ele caminha para uma proposta de intervenção conectada com problemas reais da comunidade.",
    },
  ];

  const valueHighlights = [
    "fortalecimento da aprendizagem por investigação",
    "mais clareza para o acompanhamento pedagógico",
    "organização do percurso de autoria estudantil",
    "integração entre estudante, orientador e coordenação",
  ];

  const differentials = [
    {
      title: "Percurso visível do início ao fim",
      description: "O TCA Hub busca tornar o processo de investigação mais visível, acompanhável e pedagogicamente significativo.",
    },
    {
      title: "Apoio metodológico, não só tecnológico",
      description: "A proposta não é apenas digitalizar tarefas, mas oferecer uma estrutura para orientar autoria, pesquisa e construção do projeto.",
    },
    {
      title: "Integração entre estudante, orientador e coordenação",
      description: "Cada perfil acompanha o mesmo processo com a leitura adequada à sua responsabilidade pedagógica dentro da escola.",
    },
    {
      title: "Foco em intervenção social real",
      description: "A investigação é valorizada como caminho para propor ações, soluções ou respostas conectadas ao território e à comunidade.",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f6ee] via-[#fdfbf2] to-[#eef4df]" aria-labelledby="pagina-inicial-titulo">
      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="rounded-[28px] border border-[#d9e7d4] bg-white/95 p-6 shadow-[0_16px_40px_rgba(31,41,55,0.06)] md:p-8 lg:p-10">
          <div className="tca-stripes mb-6 h-1.5 w-full rounded-md" />

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7AA56F]">
                Visão do projeto
              </p>
              <h1 id="pagina-inicial-titulo" className="mt-3 text-3xl font-extrabold leading-tight tca-title-guide md:text-5xl">
                TCA Hub
              </h1>
              <p className="mt-3 text-lg font-medium text-[#35523A] md:text-2xl">
                Plataforma digital para investigação escolar, autoria estudantil e acompanhamento pedagógico
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
                O TCA Hub nasce a partir de uma dificuldade muito concreta das escolas públicas: como acompanhar projetos investigativos de forma organizada, contínua e pedagógica.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-[15px]">
                A proposta é transformar um percurso que muitas vezes fica disperso em anotações, documentos soltos e encontros pontuais em uma experiência mais visível, estruturada e significativa para estudantes, orientadores e coordenação.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/auth/login"
                  className={accessPlatformCtaClass}
                  aria-label="Acessar a plataforma TCA Hub"
                >
                  <span className="text-base leading-none" aria-hidden="true">↗</span>
                  Acessar a plataforma
                </Link>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#E3EDE0] bg-[#FBFDF9] p-5 shadow-[0_8px_24px_rgba(31,41,55,0.04)]" aria-label="Resumo da proposta do projeto">
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#E7EFE4] bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-[#16301A]">Problema real</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    A escola pública enfrenta desafios concretos para acompanhar projetos autorais com continuidade, documentação e mediação pedagógica.
                  </p>
                </div>
                <div className="rounded-xl border border-[#E7EFE4] bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-[#16301A]">Proposta pedagógica</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    O TCA Hub foi pensado como estrutura de apoio ao processo investigativo, à autoria e à intervenção social construída pelos estudantes.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <section id="prefacio-do-projeto" className="mt-10 grid gap-6 border-t border-[#E6EEE3] pt-8 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#E3EDE0] bg-[#FBFDF9] p-6 shadow-[0_8px_18px_rgba(31,41,55,0.03)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                Desafio das escolas públicas
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#16301A]">
                Existe potencial formativo, mas nem sempre existem condições ideais de acompanhamento
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                {schoolChallenges.map((problem) => (
                  <li key={problem} className="flex gap-3 rounded-xl border border-[#E7EFE4] bg-white px-4 py-3">
                    <span className="mt-0.5 text-lime-700">•</span>
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-[#E3EDE0] bg-[#FBFDF9] p-6 shadow-[0_8px_18px_rgba(31,41,55,0.03)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                Desafios dos estudantes
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#16301A]">
                Sem orientação contínua, um percurso que deveria ser de descoberta pode se tornar desanimador
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                {studentChallenges.map((challenge) => (
                  <li key={challenge} className="flex gap-3 rounded-xl border border-[#E7EFE4] bg-white px-4 py-3">
                    <span className="mt-0.5 text-lime-700">•</span>
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="mt-10 border-t border-[#E6EEE3] pt-8">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                  O que é o TCA Hub
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#16301A]">
                  Uma proposta de plataforma para organizar a jornada investigativa
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-right">
                Mais do que um espaço para escrever um trabalho final, o TCA Hub foi pensado para apoiar o processo de autoria, investigação, orientação e intervenção.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {solutionPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="group rounded-2xl border border-[#DCE7D8] bg-[#FBFDF9] p-5 shadow-[0_8px_18px_rgba(31,41,55,0.03)] transition-transform hover:-translate-y-0.5 hover:border-[#BFD6B7]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                    Pilar da proposta
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#16301A]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section id="perfis-atendidos" className="mt-10 border-t border-[#E6EEE3] pt-8">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                  Perspectivas do processo
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#16301A]">
                  O mesmo projeto pode ser lido por diferentes papéis pedagógicos
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-right">
                O TCA Hub considera que autoria estudantil, orientação docente e visão institucional fazem parte do mesmo ecossistema formativo.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {audiences.map((audience) => (
                <article
                  key={audience.key}
                  className="rounded-2xl border border-[#DCE7D8] bg-[#FBFDF9] p-5 shadow-[0_8px_18px_rgba(31,41,55,0.03)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                    {audience.badge}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#16301A]">{audience.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {audience.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 border-t border-[#E6EEE3] pt-8">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                  Diferenciais e impacto
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#16301A]">
                  O valor do projeto está em tornar a aprendizagem investigativa mais visível, mais orientável e mais significativa
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-right">
                O impacto esperado é pedagógico: mais clareza para professores, mais estrutura para estudantes e mais memória do percurso para a escola.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {differentials.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[#DCE7D8] bg-[#FBFDF9] p-5 shadow-[0_8px_18px_rgba(31,41,55,0.03)]"
                >
                  <h3 className="text-lg font-bold text-[#16301A]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-[#DCE7D8] bg-[#FBFDF9] px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                Destaques do impacto esperado
              </p>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {valueHighlights.map((item) => (
                  <li key={item} className="flex gap-3 rounded-xl border border-[#E7EFE4] bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
                    <span className="mt-0.5 text-lime-700">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-2xl border border-[#DCE7D8] bg-[#FBFDF9] px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7AA56F]">
                Em uma frase
              </p>
              <p className="mt-2 text-lg font-semibold leading-relaxed text-[#16301A]">
                O TCA Hub transforma projetos de autoria em jornadas investigativas visíveis, acompanhadas e pedagogicamente orientadas, conectando autoria, pesquisa e intervenção social em todo o percurso formativo.
              </p>
            </div>
          </section>

        </div>
      </section>
    </main>
  );
}