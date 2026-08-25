"use client";

import React from "react";
import { Menu, Search, User } from "lucide-react";

export interface TopBarProps {
  onMenuToggle: () => void;
  pageTitle: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

const tabTitleMap: Record<string, string> = {
  overview: "Overview",
  reconciliation: "Reconciliation",
  exceptions: "Exceptions",
  analytics: "Analytics & Metrics",
  "data-sources": "Data Sources",
  "audit-log": "Audit Log",
  settings: "Settings",
};

export const TopBar: React.FC<TopBarProps> = ({
  onMenuToggle,
  pageTitle,
  searchQuery = "",
  onSearchChange,
}) => {
  const displayTitle = tabTitleMap[pageTitle] || pageTitle;

  return (
    <header className="h-13 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Breadcrumb Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-900 text-xs tracking-tight lg:hidden">
            TallyKai
          </span>
          <span className="text-slate-300 text-xs lg:hidden">/</span>
          <h1 className="text-xs font-semibold text-slate-900">
            {displayTitle}
          </h1>
          <span className="text-slate-300 text-xs hidden sm:inline">/</span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            FinOps Controller
          </span>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-sm hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search orders, references, amounts..."
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-12 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-all font-mono"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Environment Indicator & User Account */}
      <div className="flex items-center space-x-3">
        {/* Environment Indicator */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-medium text-slate-700">Demo</span>
        </div>

        {/* User Account */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-6.5 h-6.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-semibold">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden xl:block text-left">
            <span className="text-xs font-semibold text-slate-900 block leading-tight">
              Razorpay Admin
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              Financial Ops
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
