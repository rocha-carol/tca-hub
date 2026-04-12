"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function buildStorageKey(pathname: string) {
  return `tca:scroll-restore:${pathname}`;
}

export default function ProjectPageScrollRestore() {
  const pathname = usePathname();

  useEffect(() => {
    const storageKey = buildStorageKey(pathname);
    const savedPosition = window.sessionStorage.getItem(storageKey);

    if (savedPosition) {
      const parsedValue = Number(savedPosition);

      if (Number.isFinite(parsedValue)) {
        const restore = () => {
          window.scrollTo({ top: parsedValue, behavior: "auto" });
        };

        restore();
        window.requestAnimationFrame(restore);
        window.setTimeout(restore, 80);
      }

      window.sessionStorage.removeItem(storageKey);
    }

    function handleSubmit() {
      window.sessionStorage.setItem(storageKey, String(window.scrollY));
    }

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [pathname]);

  return null;
}
