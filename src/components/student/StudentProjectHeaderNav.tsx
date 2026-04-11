import Link from "next/link";
import type { Group } from "@/types/group";
import type { GroupProjectSection } from "@/types/project-section";

interface StudentProjectHeaderNavProps {
  group: Group | null;
  projectSections: GroupProjectSection[];
}

function buildSectionHref(groupId: string, sectionId: string | number) {
  return `/groups/${groupId}/project/sections/${sectionId}`;
}

export function StudentProjectHeaderNav({ group, projectSections }: StudentProjectHeaderNavProps) {
  if (!group) {
    return null;
  }

  const sectionByKey = new Map(projectSections.map((section) => [section.section_key, section]));

  const links = [
    { key: "tema_contexto", label: "Tema e contexto" },
    { key: "problema_justificativa", label: "Problema e justificativa" },
    { key: "objetivos", label: "Objetivos" },
    { key: "metodologia_plano", label: "Metodologia e plano de ação" },
    { key: "desenvolvimento_registros", label: "Desenvolvimento e registros" },
    { key: "resultado_produto_final", label: "Resultado e produto final" },
    { key: "resultado_produto_final", label: "Revisão geral" },
  ]
    .map((item) => {
      const section = sectionByKey.get(item.key);
      if (!section) {
        return null;
      }

      return {
        label: item.label,
        href: buildSectionHref(group.id, section.id),
      };
    })
    .filter((item): item is { label: string; href: string } => Boolean(item));

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#DCEBD5] bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
            Etapas do projeto
          </p>
          <h2 className="mt-1 text-base font-bold text-[#1F2937]">Atalhos rápidos do TCA</h2>
        </div>
        <span className="rounded-full bg-[#F3FBF1] px-3 py-1 text-[11px] font-semibold text-[#2F6F35] border border-[#DCEBD5]">
          Perfil do estudante
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="shrink-0 rounded-xl border border-[#DCEBD5] bg-[#F8FBF6] px-3 py-2 text-sm font-semibold text-[#17301C] transition-colors hover:border-[#BFD7B8] hover:bg-[#F3FBF1]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}