type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray" | "teal";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  yellow: "border border-amber-200 bg-amber-50 text-amber-800",
  red: "border border-rose-200 bg-rose-50 text-rose-700",
  blue: "border border-indigo-200 bg-indigo-50 text-indigo-800",
  gray: "border border-slate-200 bg-slate-50 text-slate-700",
  teal: "border border-cyan-200 bg-cyan-50 text-cyan-800",
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.01em] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
