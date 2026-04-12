"use client";

import { useRouter } from "next/navigation";

interface ProjectPreviewActionsProps {
  fallbackHref: string;
  fileName: string;
}

function buildWordDocumentHtml(content: string, title: string) {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; }
          h1, h2, h3 { color: #1f2937; }
          p, li { line-height: 1.6; }
          a { color: #2563eb; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;
}

export function ProjectPreviewActions({ fallbackHref, fileName }: ProjectPreviewActionsProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window === "undefined") {
      router.push(fallbackHref);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  function handlePrintPdf() {
    if (typeof window === "undefined") {
      return;
    }

    window.print();
  }

  function handleDownloadWord() {
    if (typeof window === "undefined") {
      return;
    }

    const content = document.getElementById("project-preview-document");
    if (!content) {
      return;
    }

    const documentHtml = buildWordDocumentHtml(content.innerHTML, fileName);
    const blob = new Blob([documentHtml], { type: "application/msword;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm text-[#4CAF50] hover:underline"
      >
        ← Voltar
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleDownloadWord}
          className="inline-flex items-center rounded-md border border-[#BFD8B5] bg-white px-3 py-2 text-sm font-medium text-[#24532A] hover:bg-[#F8FBF6]"
        >
          Baixar em Word
        </button>
        <button
          type="button"
          onClick={handlePrintPdf}
          className="inline-flex items-center rounded-md bg-[#2F80ED] px-3 py-2 text-sm font-medium text-white hover:bg-[#256fd0]"
        >
          Baixar em PDF
        </button>
      </div>
    </div>
  );
}