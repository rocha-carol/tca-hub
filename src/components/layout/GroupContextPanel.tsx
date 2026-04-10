import Link from "next/link";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import { fetchGroupProjectSectionComments } from "@/services/project-section-comment-service";
import { fetchGroupProjectSectionNextSteps } from "@/services/project-section-next-step-service";
import { fetchGroupFinalProduct } from "@/services/group-final-product-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface GroupContextPanelProps {
  groupId: string;
}

type Guidance = {
  title: string;
  tips: string[];
};

function getSectionGuidance(sectionKey?: string): Guidance {
  const map: Record<string, Guidance> = {
    tema_contexto: {
      title: "Território e tema",
      tips: [
        "Explique por que esse tema importa para a comunidade escolar.",
        "Inclua observações reais do território.",
      ],
    },
    problema_justificativa: {
      title: "Problema e justificativa",
      tips: [
        "Formule o problema com clareza.",
        "Mostre quem é afetado e por quê.",
      ],
    },
    objetivos: {
      title: "Objetivos",
      tips: [
        "Use verbos de ação nos objetivos específicos.",
        "Garanta coerência entre problema e proposta.",
      ],
    },
    metodologia_plano: {
      title: "Metodologia",
      tips: [
        "Detalhe etapas, fontes e divisão de responsabilidades.",
        "Mantenha o plano viável e cronológico.",
      ],
    },
    desenvolvimento_registros: {
      title: "Desenvolvimento",
      tips: [
        "Registre evidências e revisões de rota.",
        "Destaque aprendizados do processo.",
      ],
    },
    resultado_produto_final: {
      title: "Resultados e produto",
      tips: [
        "Conecte o resultado ao problema inicial.",
        "Explique o potencial de continuidade do projeto.",
      ],
    },
  };

  return (
    map[sectionKey || ""] || {
      title: "Orientação pedagógica",
      tips: [
        "Escrevam com clareza, autoria e evidências.",
        "Relacionem a seção ao objetivo do projeto.",
      ],
    }
  );
}

export default async function GroupContextPanel({ groupId }: GroupContextPanelProps) {
  let sections: Awaited<ReturnType<typeof ensureGroupProjectSectionsStructure>> = [];
  let comments: Awaited<ReturnType<typeof fetchGroupProjectSectionComments>> = [];
  let nextSteps: Awaited<ReturnType<typeof fetchGroupProjectSectionNextSteps>> = [];
  let finalProduct: Awaited<ReturnType<typeof fetchGroupFinalProduct>> = null;

  try {
    sections = await ensureGroupProjectSectionsStructure(groupId);
  } catch {
    sections = [];
  }

  try {
    comments = await fetchGroupProjectSectionComments(groupId);
  } catch {
    comments = [];
  }

  try {
    nextSteps = await fetchGroupProjectSectionNextSteps(groupId);
  } catch {
    nextSteps = [];
  }

  try {
    finalProduct = await fetchGroupFinalProduct(groupId);
  } catch {
    finalProduct = null;
  }

  const sectionTitleById = new Map(sections.map((section) => [String(section.id), `${section.section_order}. ${section.section_title}`]));
  const pendingSection = sections.find((section) => section.status !== "concluido") || sections[0];
  const guidance = getSectionGuidance(pendingSection?.section_key);
  const recentComments = comments.slice(-3).reverse();
  const upcomingSteps = nextSteps.slice(-3).reverse();
  const completedCount = sections.filter((section) => section.status === "concluido").length;

  return (
    <aside className="hidden xl:flex xl:w-[21rem] shrink-0 flex-col gap-4">
      <Card className="bg-[#eef8ea] border border-[#d8e8d1] shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-[#1F2937]">Panorama rápido</h3>
          <Badge variant="green">{completedCount}/{sections.length || 0}</Badge>
        </div>
        <div className="space-y-2 text-sm text-[#6B7280]">
          <p>Seções concluídas: <strong className="text-[#1F2937]">{completedCount}</strong></p>
          <p>Próximos passos ativos: <strong className="text-[#1F2937]">{nextSteps.length}</strong></p>
          <p>Comentários do orientador: <strong className="text-[#1F2937]">{comments.length}</strong></p>
          <p>Produto final: <strong className="text-[#1F2937]">{finalProduct?.status === "finalizado" ? "Finalizado" : "Em construção"}</strong></p>
        </div>
      </Card>

      <Card className="bg-[#f6fbf4] border border-[#dfead8] shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-[#1F2937]">Próximos passos</h3>
          <Link href={`/groups/${groupId}/project`} className="text-xs text-[#4CAF50] hover:underline">
            abrir
          </Link>
        </div>
        {upcomingSteps.length === 0 ? (
          <p className="text-sm text-[#6B7280]">Nenhum próximo passo registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {upcomingSteps.map((step) => (
              <div key={String(step.id)} className="rounded-xl bg-white px-3 py-3 border border-[#e5efe1]">
                <p className="text-xs font-semibold text-[#4CAF50] mb-1">
                  {sectionTitleById.get(String(step.section_id)) || "Projeto"}
                </p>
                <p className="text-sm text-[#1F2937] line-clamp-3">{step.next_steps}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="bg-[#f6fbf4] border border-[#dfead8] shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-[#1F2937]">Comentários</h3>
          <Link href={`/groups/${groupId}/comments`} className="text-xs text-[#4CAF50] hover:underline">
            ver tudo
          </Link>
        </div>
        {recentComments.length === 0 ? (
          <p className="text-sm text-[#6B7280]">Sem comentários recentes.</p>
        ) : (
          <div className="space-y-3">
            {recentComments.map((comment) => (
              <div key={String(comment.id)} className="rounded-xl bg-white px-3 py-3 border border-[#e5efe1]">
                <p className="text-xs font-semibold text-[#4CAF50] mb-1">
                  {sectionTitleById.get(String(comment.section_id)) || "Projeto"}
                </p>
                <p className="text-sm text-[#1F2937] line-clamp-3">{comment.comment}</p>
                <p className="text-xs text-[#6B7280] mt-2">{comment.author_name}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="bg-[#f6fbf4] border border-[#dfead8] shadow-sm">
        <h3 className="text-sm font-semibold text-[#1F2937] mb-2">Orientação pedagógica</h3>
        <p className="text-xs font-semibold text-[#4CAF50] mb-2">
          Foco atual: {guidance.title}
        </p>
        <ul className="space-y-2 text-sm text-[#6B7280] list-disc pl-4">
          {guidance.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}
