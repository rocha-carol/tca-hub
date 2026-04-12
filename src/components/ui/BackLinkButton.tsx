"use client";

import { useRouter } from "next/navigation";

interface BackLinkButtonProps {
  fallbackHref: string;
  label?: string;
  className?: string;
}

export default function BackLinkButton({
  fallbackHref,
  label = "← Voltar",
  className = "",
}: BackLinkButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined") {
      const hasHistory = window.history.length > 1;
      const hasInternalReferrer = Boolean(document.referrer) && document.referrer.startsWith(window.location.origin);

      if (hasHistory && hasInternalReferrer) {
        router.back();
        return;
      }
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 rounded-lg border border-[#D9E7D4] bg-white px-3 py-2 text-sm font-medium text-[#355E3B] transition-colors hover:bg-[#F8FBF6] ${className}`.trim()}
    >
      {label}
    </button>
  );
}