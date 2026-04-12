"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface HeaderMainNavProps {
  items: Array<{ href: string; label: string }>;
  quickItems?: Array<{ href: string; label: string }>;
}

/**
 * Renderiza o menu principal do header, ocultando-o na página inicial.
 */
export default function HeaderMainNav({ items, quickItems = [] }: HeaderMainNavProps) {
  const pathname = usePathname();
  const shouldHideQuickItems =
    pathname === STUDENT_ROUTES.HOME || pathname === STUDENT_ROUTES.LEGACY_NAMESPACE_HOME;
  const visibleQuickItems = shouldHideQuickItems ? [] : quickItems;

  if (pathname === "/") {
    return null;
  }

  if (items.length === 0 && visibleQuickItems.length === 0) {
    return null;
  }

  return (
    <div className="hidden md:flex flex-col items-center gap-2 rounded-[24px] border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(242,246,242,0.92)_100%)] px-2.5 py-2.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.55)]">
      {items.length > 0 ? (
        <nav className="flex items-center gap-2 flex-wrap justify-center">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)] text-white shadow-[0_16px_28px_-22px_rgba(91,110,225,0.85)]"
                  : "text-[var(--foreground)] hover:-translate-y-0.5 hover:bg-white hover:text-[var(--tca-primary)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {visibleQuickItems.length > 0 ? (
        <nav className={`flex items-center gap-2 flex-wrap justify-center ${items.length > 0 ? "border-t border-[var(--tca-border)] pt-2.5" : ""}`}>
          {visibleQuickItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border border-[var(--tca-border)] bg-white text-[var(--tca-primary)] shadow-[0_10px_22px_-18px_rgba(15,23,42,0.6)]"
                    : "text-[var(--tca-text-soft)] hover:bg-white hover:text-[var(--tca-primary)]"
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
