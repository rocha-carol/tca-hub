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
    "bg-[#4CAF50] hover:bg-[#43A047] text-white font-semibold shadow-sm",
  secondary:
    "bg-[#F5F2E9] hover:bg-[#EDE8D9] text-[#1F2937] border border-[#dfe4d2] font-medium",
  ghost:
    "bg-transparent hover:bg-[#F5F2E9] text-[#4CAF50] font-medium",
  danger:
    "bg-[#EB5757] hover:bg-[#E53E3E] text-white font-semibold shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
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
      className={`rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF50] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
