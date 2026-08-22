import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "neutral";
  dot?: boolean;
  size?: "sm" | "md";
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, { badge: string; dot: string }> = {
  default: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
  neutral: {
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  success: {
    badge: "bg-emerald-50/80 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-600",
  },
  warning: {
    badge: "bg-amber-50/80 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
  },
  error: {
    badge: "bg-rose-50/80 text-rose-800 border-rose-200/80",
    dot: "bg-rose-600",
  },
  info: {
    badge: "bg-sky-50/80 text-sky-800 border-sky-200/80",
    dot: "bg-sky-500",
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  dot = false,
  size = "md",
  className,
  ...props
}) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded transition-colors select-none",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        styles.badge,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)} />}
      <span>{children}</span>
    </span>
  );
};
