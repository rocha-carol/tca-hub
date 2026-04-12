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
      <div className="rounded-[24px] border border-[#DCE8D6] bg-white/95 px-5 py-5 shadow-[0_10px_30px_rgba(31,41,55,0.05)] lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#4CAF50] hover:underline">
              ← {backLabel}
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-[#EEF7EA] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6F35]">
                {roleLabel}
              </span>
              <span className="inline-flex rounded-full bg-[#F5F7F4] px-3 py-1 text-xs font-medium text-[#6B7280]">
                Workspace do grupo
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#1F2937] lg:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6B7280] lg:text-[15px]">
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
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-[#BFD8B5] bg-[#EEF7EA] text-[#24532A]"
                        : "border-[#DCE8D6] bg-white text-[#35523A] hover:bg-[#F8FBF6]"
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
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? "border-[#4CAF50] bg-[#4CAF50] text-white shadow-sm"
                      : "border-[#E3EDE0] bg-[#FBFDF9] text-[#1F2937] hover:border-[#CFE1C8] hover:bg-white"
                  } ${link.enabled === false ? "pointer-events-none opacity-60" : ""}`}
                >
                  {link.icon ? (
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? "bg-white/20" : "bg-white text-[#4CAF50]"}`}>
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