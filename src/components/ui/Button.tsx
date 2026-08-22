import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 border border-slate-900 shadow-xs",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200",
  outline: "bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 shadow-xs",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
  danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-rose-600 shadow-xs",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-2.5 py-1 text-xs font-medium rounded-md gap-1.5",
  md: "px-3 py-1.5 text-xs font-semibold rounded-md gap-2",
  lg: "px-4 py-2 text-sm font-semibold rounded-md gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "outline", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
