import { Card } from "@/components/ui/Card";

const steps = [
  "Formar o grupo",
  "Escolher um tema",
  "Planejar a investigação",
  "Desenvolver o projeto",
  "Apresentar o trabalho",
];

export function TcaStepsGuide() {
  return (
    <Card>
      <h2 className="text-xl font-bold text-[#1F2937] mb-4">ETAPAS DO PROJETO</h2>

      <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="rounded-xl border border-[#d9e7d4] bg-[#f8fbf6] px-3 py-3 text-sm text-[#1F2937]"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#4CAF50] text-white text-xs font-bold mr-2">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </Card>
  );
}
