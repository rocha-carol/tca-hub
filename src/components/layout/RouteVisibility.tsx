"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface RouteVisibilityProps {
  children: ReactNode;
  hideWhenStartsWith?: string[];
}

export function RouteVisibility({ children, hideWhenStartsWith = [] }: RouteVisibilityProps) {
  const pathname = usePathname();

  const shouldHide = hideWhenStartsWith.some((prefix) => pathname.startsWith(prefix));

  if (shouldHide) {
    return null;
  }

  return <>{children}</>;
}