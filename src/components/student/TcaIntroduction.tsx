import { Card } from "@/components/ui/Card";

export function TcaIntroduction() {
  return (
    <Card accent="blue" className="p-5 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-[#1F2937] mb-2">O que é o TCA?</h2>
      <p className="text-[#374151] leading-relaxed text-[15px] md:text-base">
        O Trabalho Colaborativo de Autoria (TCA) é um projeto investigativo em que estudantes escolhem
        um tema, pesquisam um problema real e desenvolvem uma proposta de intervenção.
      </p>

      <p className="text-[#374151] mt-3 mb-2 text-[15px] md:text-base">Ao longo do processo você irá:</p>
      <ul className="list-disc pl-5 space-y-1 text-[#374151] text-[15px] md:text-base">
        <li>investigar um tema</li>
        <li>trabalhar em grupo</li>
        <li>desenvolver uma proposta</li>
        <li>apresentar o resultado do projeto</li>
      </ul>
    </Card>
  );
}
