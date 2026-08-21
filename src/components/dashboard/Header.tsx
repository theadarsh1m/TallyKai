import React from "react";
import { ShieldCheck, Activity, Database, Cpu } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-50 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-700/50 rounded-lg text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                Recon<span className="text-indigo-400">AI</span>
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded font-mono">
                v0.1.0-phase0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              AI Finance Controller & Automated Reconciliation Engine
            </p>
          </div>
        </div>

        {/* System Meta & Environment Badge */}
        <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto text-xs">
          {/* Engine Status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="font-semibold text-amber-400">Standby (Phase 0)</span>
          </div>

          {/* Data Source Badge */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Ledger:</span>
            <span className="font-medium text-slate-200">Internal Mock</span>
          </div>

          {/* Demo Environment Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-800/50 rounded-md text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">Demo Environment</span>
          </div>
        </div>
      </div>
    </header>
  );
};
