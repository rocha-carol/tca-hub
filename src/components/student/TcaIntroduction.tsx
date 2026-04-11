import { Card } from "@/components/ui/Card";

export function TcaIntroduction() {
  const pillars = [
    {
      title: "Investigar",
      description: "Definir um tema e observar um problema real que faça sentido para o grupo.",
    },
    {
      title: "Construir em equipe",
      description: "Organizar pesquisa, registros e decisões com apoio da orientação ao longo da jornada.",
    },
    {
      title: "Apresentar um resultado",
      description: "Transformar o processo em proposta, produto e socialização final do trabalho.",
    },
  ];

  return (
    <Card accent="blue" className="border border-[#E4ECF6] bg-white/95 p-5 md:p-6 shadow-[0_8px_22px_rgba(31,41,55,0.04)]">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B8AC9] mb-2">Visão rápida</p>
          <h2 className="text-lg md:text-xl font-bold text-[#1F2937] mb-2">Como essa jornada funciona</h2>
          <p className="text-[#4B5563] leading-relaxed text-[15px] md:text-base max-w-3xl">
            O TCA avança em ciclos simples: compreender um tema, desenvolver a investigação com o grupo e transformar esse percurso em um resultado autoral.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-[#E8EEF7] bg-[#FAFCFF] px-4 py-4 text-sm text-[#334155]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7C93BF] mb-2">
                Pilar da jornada
              </p>
              <p className="font-semibold text-[#1F2937]">{pillar.title}</p>
              <p className="mt-2 leading-relaxed text-[#4B5563]">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
