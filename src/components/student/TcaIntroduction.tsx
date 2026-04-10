import { Card } from "@/components/ui/Card";

export function TcaIntroduction() {
  return (
    <Card accent="blue">
      <h2 className="text-xl font-bold text-[#1F2937] mb-3">O que é o TCA?</h2>
      <p className="text-[#374151] leading-relaxed">
        O Trabalho Colaborativo de Autoria (TCA) é um projeto investigativo em que estudantes escolhem
        um tema, pesquisam um problema real e desenvolvem uma proposta de intervenção.
      </p>

      <p className="text-[#374151] mt-4 mb-2">Ao longo do processo você irá:</p>
      <ul className="list-disc pl-6 space-y-1 text-[#374151]">
        <li>investigar um tema</li>
        <li>trabalhar em grupo</li>
        <li>desenvolver uma proposta</li>
        <li>apresentar o resultado do projeto</li>
      </ul>
    </Card>
  );
}
