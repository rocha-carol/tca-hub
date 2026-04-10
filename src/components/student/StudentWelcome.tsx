import { Card } from "@/components/ui/Card";

export function StudentWelcome() {
  return (
    <Card accent="green">
      <h2 className="text-2xl font-bold text-[#1F2937] mb-3">Bem-vindo ao TCA Hub</h2>
      <p className="text-[#374151] leading-relaxed">
        Aqui você vai desenvolver, em grupo, um projeto de investigação sobre um tema relevante para a
        sociedade.
      </p>
      <p className="text-[#374151] leading-relaxed mt-2">
        O sistema vai ajudar a organizar todas as etapas do trabalho: planejamento, pesquisa,
        desenvolvimento e apresentação final.
      </p>
    </Card>
  );
}
