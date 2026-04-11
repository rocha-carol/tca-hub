"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderMainNavProps {
  items: Array<{ href: string; label: string }>;
  quickItems?: Array<{ href: string; label: string }>;
}

/**
 * Renderiza o menu principal do header, ocultando-o na página inicial.
 */
export default function HeaderMainNav({ items, quickItems = [] }: HeaderMainNavProps) {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <div className="hidden md:flex flex-col items-center gap-2 rounded-2xl bg-[#f4f8f1] px-2 py-2 border border-[#e2ecdd]">
      <nav className="flex items-center gap-2 flex-wrap justify-center">
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

      {quickItems.length > 0 ? (
        <nav className="flex items-center gap-2 flex-wrap justify-center border-t border-[#dfe8d9] pt-2">
          {quickItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-white text-[#2F6F35] shadow-sm"
                    : "text-[#4B5563] hover:bg-white hover:text-[#2F6F35]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
