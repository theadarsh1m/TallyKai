import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hoverEffect = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200/90 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        hoverEffect && "transition-all duration-150 hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
};
