import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface StudentWelcomeProps {
  firstName: string;
  hasGroup: boolean;
  showStartButton?: boolean;
  onStart?: () => void;
}

export function StudentWelcome({
  firstName,
  hasGroup,
  showStartButton = false,
  onStart,
}: StudentWelcomeProps) {
  const title = `Que bom ter você aqui, ${firstName}!`;
  const intro = hasGroup
    ? "Essa é a sua área no TCA Hub. Aqui dá para acompanhar sua missão atual, ver como a jornada do projeto está andando e acessar rapidinho o grupo para seguir no corre com a equipe."
    : "Essa é a sua área no TCA Hub. Aqui dá para ver direitinho sua missão do momento, acompanhar a jornada do projeto e descobrir o que falta para destravar as próximas etapas.";
  const highlights = hasGroup
    ? [
        "ver o progresso da jornada do TCA",
        "acompanhar conquistas e próximos marcos",
        "entrar no grupo e seguir para a próxima etapa",
      ]
    : [
        "entender em que etapa do TCA você está",
        "ver a missão principal para começar sem travar",
        "partir direto para a criação do grupo",
      ];

  return (
    <Card accent="green" className="border border-[#DCEBD5] bg-gradient-to-br from-[#F7FFF4] via-white to-[#EEF9E8] shadow-lg p-5 md:p-6">
      <div className="flex flex-col gap-2.5">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#16301A] mb-2 leading-tight">
            {title}
          </h2>

          <p className="text-[#374151] leading-relaxed text-[15px] md:text-base">{intro}</p>
        </div>
      </div>

      <p className="text-[#374151] leading-relaxed mt-4 font-medium text-[15px] md:text-base">
        Na prática, por aqui dá para:
      </p>

      <ul className="list-disc pl-5 space-y-1 text-[#374151] mt-2 text-[15px] md:text-base">
        {highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      {showStartButton && (
        <div className="mt-5 flex justify-start">
          <Button type="button" size="lg" onClick={onStart}>
            Bora começar?
          </Button>
        </div>
      )}
    </Card>
  );
}
