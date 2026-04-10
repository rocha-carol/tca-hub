"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/auth";

interface SidebarLink {
  href: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  groupId: string;
  role?: UserRole | null;
}

export default function Sidebar({ groupId, role }: SidebarProps) {
  const pathname = usePathname();

  // Etapa 1: reorganização por perfil com baixo risco.
  // Mantemos as mesmas rotas, alterando apenas a ordem/ênfase dos links no menu.
  const links: SidebarLink[] = (() => {
    if (role === "student") {
      return [
        { href: `/groups/${groupId}/project`, label: "Projeto", icon: "▣" },
        { href: `/groups/${groupId}/checklist`, label: "Checklist", icon: "✓" },
        { href: `/groups/${groupId}/timeline`, label: "Cronograma", icon: "◷" },
        { href: `/groups/${groupId}/questions`, label: "Dúvidas", icon: "?" },
        { href: `/groups/${groupId}/project/preview`, label: "Preview do projeto", icon: "◉" },
        { href: `/groups/${groupId}/comments`, label: "Comentários", icon: "◌" },
      ];
    }

    if (role === "advisor") {
      return [
        { href: "/groups", label: "Meus grupos", icon: "◫" },
        { href: `/groups/${groupId}/project`, label: "Andamento do grupo", icon: "▣" },
        { href: `/groups/${groupId}/comments`, label: "Comentários", icon: "◌" },
        { href: `/groups/${groupId}/questions`, label: "Dúvidas", icon: "?" },
        { href: `/groups/${groupId}/project`, label: "Próximos passos", icon: "➜" },
        { href: `/groups/${groupId}/checklist`, label: "Checklist", icon: "✓" },
        { href: `/groups/${groupId}/timeline`, label: "Cronograma", icon: "◷" },
        { href: `/groups/${groupId}/project/preview`, label: "Preview do projeto", icon: "◉" },
      ];
    }

    if (role === "coordinator") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: "◫" },
        { href: "/groups", label: "Grupos", icon: "▤" },
        { href: `/groups/${groupId}/project`, label: "Projeto", icon: "▣" },
        { href: `/groups/${groupId}/timeline`, label: "Cronograma", icon: "◷" },
        { href: `/groups/${groupId}/checklist`, label: "Checklist", icon: "✓" },
        { href: `/groups/${groupId}/questions`, label: "Dúvidas", icon: "?" },
        { href: `/groups/${groupId}/comments`, label: "Comentários", icon: "◌" },
        { href: `/groups/${groupId}/final-product`, label: "Produto final", icon: "◆" },
        { href: `/groups/${groupId}/project/preview`, label: "Preview do projeto", icon: "◉" },
      ];
    }

    return [
      { href: "/dashboard", label: "Dashboard", icon: "◫" },
      { href: `/groups/${groupId}/project`, label: "Projeto", icon: "▣" },
      { href: `/groups/${groupId}/timeline`, label: "Cronograma", icon: "◷" },
      { href: `/groups/${groupId}/checklist`, label: "Checklist", icon: "✓" },
      { href: `/groups/${groupId}/diary`, label: "Diário de investigação", icon: "☰" },
      { href: `/groups/${groupId}/questions`, label: "Dúvidas", icon: "?" },
      { href: `/groups/${groupId}/comments`, label: "Comentários", icon: "◌" },
      { href: `/groups/${groupId}/final-product`, label: "Produto final", icon: "◆" },
      { href: `/groups/${groupId}/project/preview`, label: "Preview do projeto", icon: "◉" },
    ];
  })();

  return (
    <aside className="w-72 shrink-0 bg-[#e9f6e6] border-r border-[#d4e6cf] min-h-screen pt-6 pb-10 hidden lg:flex flex-col">
      <div className="px-4 mb-6">
        <Link
          href="/groups"
          className="text-xs text-[#6B7280] hover:text-[#4CAF50] flex items-center gap-1"
        >
          ← Voltar a grupos
        </Link>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Navegação</p>
      </div>

      <nav className="flex flex-col gap-1.5 px-3">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#4CAF50] text-white shadow-sm"
                  : "text-[#1F2937] hover:bg-white hover:shadow-sm"
              }`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none ${
                isActive ? "bg-white/20" : "bg-white text-[#4CAF50]"
              }`}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
