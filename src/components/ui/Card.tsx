import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: "green" | "yellow" | "red" | "blue" | "none";
}

export function Card({ children, className = "", accent = "none" }: CardProps) {
  const accentBar: Record<string, string> = {
    green: "border-l-4 border-l-[#4CAF50]",
    yellow: "border-l-4 border-l-[#F2C94C]",
    red: "border-l-4 border-l-[#EB5757]",
    blue: "border-l-4 border-l-[#2F80ED]",
    none: "",
  };

  return (
    <div
      className={`rounded-2xl shadow-md bg-white p-6 ${accentBar[accent]} ${className}`}
    >
      {children}
    </div>
  );
}
