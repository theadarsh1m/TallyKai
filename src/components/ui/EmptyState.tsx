import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  className,
}) => {
  return (
    <div
      className={cn(
        "py-12 px-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto",
        className
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-3.5">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        {description}
      </p>
      {actionLabel && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
