import { type ReactNode } from "react";
import { SectionCard } from "@/components/cards/SectionCard";

interface SectionEditorProps {
  title: string;
  statusLabel?: string;
  guidance?: ReactNode;
  editor?: ReactNode;
  comments?: ReactNode;
  questions?: ReactNode;
  nextSteps?: ReactNode;
  schedule?: ReactNode;
}

export function SectionEditor({
  title,
  statusLabel,
  guidance,
  editor,
  comments,
  questions,
  nextSteps,
  schedule,
}: SectionEditorProps) {
  return (
    <SectionCard title={title} statusLabel={statusLabel}>
      <div className="space-y-4">
        {guidance}
        {schedule}
        {editor}
        {comments}
        {questions}
        {nextSteps}
      </div>
    </SectionCard>
  );
}
