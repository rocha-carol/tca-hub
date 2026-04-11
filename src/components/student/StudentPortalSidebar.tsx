"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import type { Group } from "@/types/group";

interface StudentPortalSidebarProps {
  hasGroup: boolean;
  group: Group | null;
}

function getGroupLabel(group: Group | null) {
  if (!group) {
    return "Nenhum grupo vinculado";
  }

  return group.theme || `Grupo ${String(group.id).slice(0, 8)}`;
}

export function StudentPortalSidebar({
  hasGroup,
  group,
}: StudentPortalSidebarProps) {
  const pathname = usePathname();
  const groupStatusHref = STUDENT_ROUTES.GROUP_STATUS;
  const links = [
    {
      href: STUDENT_ROUTES.HOME,
      label: "Início do estudante",
      icon: "⌂",
      enabled: true,
    },
    {
      href: groupStatusHref,
      label: hasGroup ? "Meu grupo" : "Criar grupo",
      icon: "◫",
      enabled: true,
    },
    {
      href: STUDENT_ROUTES.JOURNEY,
      label: "Jornada do projeto",
      icon: "↗",
      enabled: true,
    },
    {
      href: hasGroup && group ? `/estudante/groups/${group.id}/theme-guide` : STUDENT_ROUTES.GROUP_CREATE,
      label: "Escolha do tema",
      icon: "✦",
      enabled: true,
    },
    {
      href: hasGroup && group ? `/estudante/groups/${group.id}/advisor-indication` : groupStatusHref,
      label: "Indicação de orientadores",
      icon: "➜",
      enabled: hasGroup,
    },
    {
      href: `${STUDENT_ROUTES.JOURNEY}#minhas-recompensas`,
      label: "Minhas conquistas",
      icon: "★",
      enabled: true,
    },
  ];

  function isActive(href: string) {
    const [pathWithoutHash] = href.split("#");
    return pathname === pathWithoutHash || pathname.startsWith(`${pathWithoutHash}/`);
  }

  return (
    <>
      <div className="lg:hidden">
        <Card className="border border-[#DCEBD5] bg-[#F8FBF6] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                Navegação do estudante
              </p>
              <p className="text-sm text-[#374151] mt-1">{getGroupLabel(group)}</p>
            </div>

            <Badge variant={hasGroup ? "green" : "yellow"}>
              {hasGroup ? "Em grupo" : "Sem grupo"}
            </Badge>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "border-[#4CAF50] bg-[#4CAF50] text-white"
                    : "border-[#DCEBD5] bg-white text-[#1F2937]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="sticky top-24 space-y-4">
          <Card className="border border-[#DCEBD5] bg-[#F8FBF6] p-5">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                  Navegação do estudante
                </p>
                <h2 className="mt-2 text-lg font-bold text-[#1F2937]">Portal do estudante</h2>
                <p className="mt-1 text-sm text-[#6B7280] leading-relaxed">
                  O menu permanece disponível em todas as páginas do estudante para manter o contexto da navegação.
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEBD5] bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">Situação do grupo</p>
                    <p className="text-sm text-[#374151] mt-1 leading-relaxed">{getGroupLabel(group)}</p>
                  </div>

                  <Badge variant={hasGroup ? "green" : "yellow"}>
                    {hasGroup ? "Em grupo" : "Sem grupo"}
                  </Badge>
                </div>
              </div>

              <nav className="space-y-2">
                {links.map((link) => {
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        active
                          ? "border-[#4CAF50] bg-[#4CAF50] text-white"
                          : "border-transparent bg-white text-[#1F2937] hover:border-[#DCEBD5] hover:bg-[#F3FBF1]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-sm ${active ? "bg-white/20 text-white" : "bg-[#F3FBF1] text-[#4CAF50]"}`}>
                          {link.icon}
                        </span>
                        {link.label}
                      </span>

                      {!link.enabled && !active ? (
                        <span className="text-xs text-[#6B7280]">Em breve</span>
                      ) : (
                        <span>{active ? "•" : "→"}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </Card>
        </div>
      </aside>
    </>
  );
}