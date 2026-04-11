"use client";

import { useState } from "react";

export function ProblemJustificationExplainerCard() {
  const [activeTab, setActiveTab] = useState<"problema" | "justificativa" | "juntos">("problema");

  const content = {
    problema: {
      title: "O que é o problema?",
      text:
        "Problema é a situação que o grupo quer investigar. Não é a solução, nem um tema genérico. É algo concreto que chama atenção, afeta pessoas e precisa ser compreendido melhor.",
      helper:
        "Pergunta-chave: o que exatamente está acontecendo e por que isso merece ser olhado com mais cuidado?",
    },
    justificativa: {
      title: "O que é a justificativa?",
      text:
        "Justificativa é a explicação do porquê vale a pena estudar esse problema. Aqui o grupo mostra relevância: quem é afetado, por que isso importa e o que torna essa investigação significativa no contexto do TCA.",
      helper:
        "Pergunta-chave: por que esse problema importa para a escola, para o território ou para a comunidade?",
    },
    juntos: {
      title: "Como os dois aparecem no texto?",
      text:
        "Primeiro o texto precisa deixar claro qual é o problema. Depois, precisa explicar por que esse problema merece investigação. Em outras palavras: o problema aponta o foco; a justificativa mostra a relevância.",
      helper:
        "Estrutura simples: nomeie o problema + mostre quem é afetado + explique por que investigar isso faz sentido agora.",
    },
  } as const;

  const current = content[activeTab];

  const tabClass = (tab: typeof activeTab) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      activeTab === tab
        ? "bg-[#2F80ED] text-white shadow-sm"
        : "bg-white text-[#4B5563] border border-[#DBEAFE] hover:bg-[#F5F9FF]"
    }`;

  return (
    <div className="rounded-2xl border border-[#DBEAFE] bg-[#F5F9FF] p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2F80ED] mb-1">
            Antes de escrever
          </p>
          <h2 className="text-base font-bold text-[#1F2937]">
            O que significa “problema e justificativa” nesta etapa?
          </h2>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#1D4ED8] border border-[#DBEAFE]">
          Card interativo
        </span>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <button type="button" className={tabClass("problema")} onClick={() => setActiveTab("problema")}>
          Problema
        </button>
        <button type="button" className={tabClass("justificativa")} onClick={() => setActiveTab("justificativa")}>
          Justificativa
        </button>
        <button type="button" className={tabClass("juntos")} onClick={() => setActiveTab("juntos")}>
          Como juntar os dois
        </button>
      </div>

      <div className="rounded-xl border border-[#DBEAFE] bg-white/85 px-4 py-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-[#1F2937] mb-1">{current.title}</p>
          <p className="text-sm text-[#374151] leading-relaxed">{current.text}</p>
        </div>

        <div className="rounded-lg bg-[#EFF6FF] px-3 py-3 border border-[#DBEAFE]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2F80ED] mb-1">
            Dica de leitura
          </p>
          <p className="text-sm text-[#374151] leading-relaxed">{current.helper}</p>
        </div>
      </div>
    </div>
  );
}