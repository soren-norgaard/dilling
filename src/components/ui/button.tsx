import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-brand-primary text-white hover:bg-brand-primary-dark": variant === "primary",
          "bg-brand-secondary text-brand-primary hover:bg-brand-secondary-dark": variant === "secondary",
          "border border-border bg-transparent text-foreground hover:bg-surface": variant === "outline",
          "bg-transparent text-foreground hover:bg-surface": variant === "ghost",
          "bg-error text-white hover:opacity-90": variant === "danger",
        },
        {
          "px-3 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
