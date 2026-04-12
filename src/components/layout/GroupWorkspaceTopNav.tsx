"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface WorkspaceNavLink {
  href: string;
  label: string;
  icon?: string;
  enabled?: boolean;
}

interface GroupWorkspaceTopNavProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  roleLabel: string;
  primaryLinks: WorkspaceNavLink[];
  secondaryLinks?: WorkspaceNavLink[];
}

function isLinkActive(pathname: string, href: string) {
  const [pathWithoutHash] = href.split("#");
  return pathname === pathWithoutHash || pathname.startsWith(`${pathWithoutHash}/`);
}

export default function GroupWorkspaceTopNav({
  backHref,
  backLabel,
  title,
  subtitle,
  roleLabel,
  primaryLinks,
  secondaryLinks = [],
}: GroupWorkspaceTopNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.98)_48%,rgba(242,246,242,0.96)_100%)] px-5 py-5 shadow-[0_22px_42px_-32px_rgba(15,23,42,0.45)] lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link href={backHref} className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-sm font-semibold text-[var(--tca-primary)] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:underline">
              ← {backLabel}
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                {roleLabel}
              </span>
              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Workspace do grupo
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[var(--foreground)] lg:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--tca-text-muted)] lg:text-[15px]">
              {subtitle}
            </p>
          </div>

          {secondaryLinks.length > 0 ? (
            <div className="flex max-w-full flex-wrap items-center gap-2 lg:justify-end">
              {secondaryLinks.map((link) => {
                const active = isLinkActive(pathname, link.href);

                return (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_12px_22px_-18px_rgba(47,143,83,0.7)]"
                        : "border-[var(--tca-border)] bg-white text-[var(--tca-text-soft)] hover:-translate-y-0.5 hover:bg-[var(--tca-surface-soft)] hover:text-[var(--tca-primary)]"
                    } ${link.enabled === false ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {link.icon ? <span className="text-sm leading-none">{link.icon}</span> : null}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <nav className="flex min-w-max items-center gap-2">
            {primaryLinks.map((link) => {
              const active = isLinkActive(pathname, link.href);

              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "border-transparent bg-[linear-gradient(135deg,var(--tca-primary)_0%,var(--tca-secondary)_100%)] text-white shadow-[0_18px_30px_-22px_rgba(91,110,225,0.85)]"
                      : "border-[var(--tca-border)] bg-white/90 text-[var(--foreground)] hover:-translate-y-0.5 hover:border-[var(--tca-border-strong)] hover:bg-white"
                  } ${link.enabled === false ? "pointer-events-none opacity-60" : ""}`}
                >
                  {link.icon ? (
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? "bg-white/20" : "bg-[var(--tca-surface-soft)] text-[var(--tca-primary)]"}`}>
                      {link.icon}
                    </span>
                  ) : null}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}