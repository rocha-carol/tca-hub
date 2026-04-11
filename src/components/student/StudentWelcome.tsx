import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface StudentWelcomeProps {
  firstName: string;
  hasGroup: boolean;
  statusLabel: string;
  missionTitle: string;
  missionDescription: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  showStartButton?: boolean;
  onStart?: () => void;
}

export function StudentWelcome({
  firstName,
  hasGroup,
  statusLabel,
  missionTitle,
  missionDescription,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel = "Entender como funciona",
  showStartButton = false,
  onStart,
}: StudentWelcomeProps) {
  const title = `Que bom ter você aqui, ${firstName}!`;
  const intro = hasGroup
    ? "Esta área agora funciona como ponto de entrada da jornada: situação atual, próxima missão e o atalho principal para continuar o projeto."
    : "Esta área organiza os primeiros passos do TCA e mostra o caminho mais direto para liberar a próxima etapa da jornada.";
  const highlights = hasGroup
    ? [
        {
          title: "Situação atual",
          description: statusLabel,
        },
        {
          title: "Missão do momento",
          description: missionTitle,
        },
        {
          title: "Foco do MVP",
          description: "Seguir para a próxima ação sem dispersar a navegação.",
        },
      ]
    : [
        {
          title: "Situação atual",
          description: statusLabel,
        },
        {
          title: "Primeira missão",
          description: missionTitle,
        },
        {
          title: "Foco do MVP",
          description: "Liberar o grupo para destravar as próximas etapas do TCA.",
        },
      ];

  return (
    <Card accent="green" className="border border-[#E2ECDD] bg-gradient-to-br from-[#FCFEFB] via-white to-[#F3FAEE] shadow-[0_10px_26px_rgba(31,41,55,0.05)] p-5 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="mb-2">
              <Badge variant={hasGroup ? "green" : "yellow"}>
                {hasGroup ? "Com grupo vinculado" : "Primeiros passos"}
              </Badge>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[#16301A] mb-2 leading-tight">
            {title}
            </h2>

            <p className="text-[#4B5563] leading-relaxed text-[15px] md:text-base max-w-2xl">{intro}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-2xl border border-[#E5EFE1] bg-white/90 px-4 py-4 text-sm font-medium text-[#334155] shadow-[0_4px_14px_rgba(31,41,55,0.03)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#79916F]">
                {highlight.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#334155]">
                {highlight.description}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#DCE8D6] bg-white/95 px-4 py-4 md:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6E8B65]">
            Missão em destaque
          </p>
          <h3 className="mt-2 text-lg font-bold text-[#16301A]">{missionTitle}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#4B5563] md:text-[15px]">
            {missionDescription}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryActionHref}
              className="inline-flex min-w-[220px] items-center justify-center rounded-xl bg-lime-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-lime-800"
            >
              {primaryActionLabel}
            </Link>

            {showStartButton && onStart ? (
              <Button type="button" size="lg" variant="secondary" onClick={onStart}>
                {secondaryActionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
