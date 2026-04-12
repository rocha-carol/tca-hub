import { type ReactNode, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--tca-primary)] text-white font-semibold shadow-[0_14px_28px_-18px_rgba(47,143,83,0.9)] hover:bg-[var(--tca-primary-strong)] hover:-translate-y-0.5",
  secondary:
    "border border-[var(--tca-border)] bg-white/95 text-[var(--foreground)] font-semibold shadow-[0_10px_24px_-22px_rgba(15,23,42,0.7)] hover:border-[var(--tca-border-strong)] hover:bg-[var(--tca-surface-soft)] hover:-translate-y-0.5",
  ghost:
    "border border-transparent bg-transparent text-[var(--tca-secondary)] font-semibold hover:bg-[color:var(--tca-focus)]/40",
  danger:
    "border border-transparent bg-[var(--tca-highlight)] text-white font-semibold shadow-[0_14px_28px_-18px_rgba(226,85,116,0.85)] hover:bg-[#cf4664] hover:-translate-y-0.5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4.5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-2xl transition-[background-color,border-color,box-shadow,color,transform] duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tca-focus)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
