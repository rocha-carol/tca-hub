import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: "green" | "yellow" | "red" | "blue" | "none";
}

export function Card({ children, className = "", accent = "none" }: CardProps) {
  const accentBar: Record<string, string> = {
    green: "border-l-4 border-l-[var(--tca-primary)]",
    yellow: "border-l-4 border-l-[var(--tca-accent)]",
    red: "border-l-4 border-l-[var(--tca-highlight)]",
    blue: "border-l-4 border-l-[var(--tca-secondary)]",
    none: "",
  };

  return (
    <div
      className={`rounded-[28px] border border-[var(--tca-border)] bg-white/95 p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)] backdrop-blur-[2px] ${accentBar[accent]} ${className}`}
    >
      {children}
    </div>
  );
}
