"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderMainNavProps {
  items: Array<{ href: string; label: string }>;
}

/**
 * Renderiza o menu principal do header, ocultando-o na página inicial.
 */
export default function HeaderMainNav({ items }: HeaderMainNavProps) {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="hidden md:flex items-center gap-2 rounded-2xl bg-[#f4f8f1] px-2 py-2 border border-[#e2ecdd]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl px-4 py-2 text-sm font-medium text-[#1F2937] hover:bg-white hover:text-[#4CAF50] transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
