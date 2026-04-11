"use client";

import { useMemo, useState } from "react";
import {
  analyzeSectionWritingSimulated,
  type WritingGuidanceReference,
} from "@/lib/ai/project-section-simulated-guidance";

interface SectionWritingThermometerProps {
  id: string;
  name: string;
  rows?: number;
  defaultValue?: string;
  placeholder: string;
  sectionTitle: string;
  sectionKey: string;
  guidance: WritingGuidanceReference;
  writingSupportTips?: string[];
}

function resolveMeterColor(score: number) {
  if (score >= 80) return "bg-[#27AE60]";
  if (score >= 60) return "bg-[#4CAF50]";
  if (score >= 35) return "bg-[#F2C94C]";
  if (score >= 15) return "bg-[#F2994A]";
  return "bg-[#D1D5DB]";
}

function resolveMeterTrack(score: number) {
  if (score >= 80) return "bg-[#E9F8EF] border-[#B7E4C7]";
  if (score >= 60) return "bg-[#EEF9F0] border-[#C8E6C9]";
  if (score >= 35) return "bg-[#FFF8E1] border-[#FCE9B0]";
  if (score >= 15) return "bg-[#FFF3E8] border-[#F7D7B5]";
  return "bg-[#F3F4F6] border-[#E5E7EB]";
}

export function SectionWritingThermometer({
  id,
  name,
  rows = 18,
  defaultValue = "",
  placeholder,
  sectionTitle,
  sectionKey,
  guidance,
  writingSupportTips = [],
}: SectionWritingThermometerProps) {
  const [content, setContent] = useState(defaultValue);

  const analysis = useMemo(
    () =>
      analyzeSectionWritingSimulated({
        text: content,
        sectionTitle,
        sectionKey,
        guidance,
        writingSupportTips,
      }),
    [content, guidance, sectionKey, sectionTitle, writingSupportTips]
  );

  return (
    <div className="space-y-4">
      <textarea
        id={id}
        name={name}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-[#fafaf9] px-4 py-3 text-sm text-[#1F2937] placeholder:text-gray-400 focus:border-[#4CAF50] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30 leading-relaxed resize-y"
      />

      <div className={`rounded-2xl border px-4 py-4 ${resolveMeterTrack(analysis.score)}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2F80ED] mb-1">
              Termômetro da escrita
            </p>
            <p className="text-sm font-semibold text-[#1F2937]">{analysis.levelLabel}</p>
            <p className="text-xs text-[#4B5563] mt-1">{analysis.levelDescription}</p>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#1F2937] border border-white/70">
            {analysis.score}% de desenvolvimento
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-white/80 border border-white/70 mb-4">
          <div
            className={`h-full rounded-full transition-all duration-300 ${resolveMeterColor(analysis.score)}`}
            style={{ width: `${analysis.score}%` }}
          />
        </div>

        <p className="text-sm text-[#374151] leading-relaxed mb-3">{analysis.encouragement}</p>

        <div className="rounded-xl bg-white/75 px-3 py-3 border border-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1F2937] mb-2">
            Dicas para melhorar agora
          </p>
          <ul className="space-y-2">
            {analysis.improvementTips.map((tip, index) => (
              <li key={index} className="flex gap-2 text-sm text-[#374151] leading-relaxed">
                <span className="font-bold text-[#4CAF50] flex-shrink-0">{index + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#4B5563]">
          <span className="rounded-full bg-white/80 px-2.5 py-1 border border-white/70">
            {analysis.metrics.wordCount} palavras
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 border border-white/70">
            {analysis.metrics.sentenceCount} frases
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 border border-white/70">
            {analysis.metrics.paragraphCount} blocos
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 border border-white/70">
            {analysis.metrics.keywordCoverage}% de aderência ao foco
          </span>
        </div>
      </div>
    </div>
  );
}