import React from "react";
import { Header } from "@/components/dashboard/Header";
import { KPICard } from "@/components/dashboard/KPICard";
import { ReconciliationTable } from "@/components/dashboard/ReconciliationTable";
import { ExceptionsPanel } from "@/components/dashboard/ExceptionsPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { Info, Layers, Lock, Cpu, Sparkles } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <div>
        {/* Navigation Header */}
        <Header />

        {/* Phase 0 System Announcement Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-indigo-900/40 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-indigo-300 font-medium">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong className="text-white">Phase 0 Foundation Active:</strong> Dashboard shell and static layout ready. Reconciliation matching algorithms and AI exception agent disabled until Phase 1.
              </span>
            </div>
            <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>No Active LLM Connections</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Section Title & Quick Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Executive Reconciliation Overview</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time financial matching telemetry & exception tracking console.
              </p>
            </div>

            {/* Simulated Control Buttons (Disabled in Phase 0) */}
            <div className="flex items-center space-x-2">
              <button
                disabled
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 text-xs font-semibold cursor-not-allowed opacity-75 flex items-center space-x-1.5"
                title="Disabled in Phase 0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Upload Batch</span>
              </button>
              <button
                disabled
                className="px-3.5 py-1.5 rounded-lg bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-semibold cursor-not-allowed opacity-75 flex items-center space-x-1.5"
                title="Disabled in Phase 0"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Run Reconciliation</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Records Processed"
              value="0"
              subtext="Total transaction records loaded across internal & settlement files."
              iconName="records"
              statusTag="Placeholder"
              variant="default"
            />
            <KPICard
              title="Match Rate"
              value="0%"
              subtext="Percentage of internal orders accurately paired with settlement payouts."
              iconName="rate"
              statusTag="Placeholder"
              variant="success"
            />
            <KPICard
              title="Reconciled Amount"
              value="₹0"
              subtext="Cumulative monetary sum verified against bank settlement statements."
              iconName="amount"
              statusTag="Placeholder"
              variant="default"
            />
            <KPICard
              title="Exceptions"
              value="0"
              subtext="Flagged cases awaiting deterministic rule retry or AI agent investigation."
              iconName="exceptions"
              statusTag="Placeholder"
              variant="warning"
            />
          </div>

          {/* Main Grid: Table & Exceptions Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Table (2 Columns wide on Desktop) */}
            <div className="lg:col-span-2">
              <ReconciliationTable />
            </div>

            {/* Exceptions Panel (1 Column wide on Desktop) */}
            <div className="lg:col-span-1 h-full">
              <ExceptionsPanel />
            </div>
          </div>

          {/* Activity Timeline Section */}
          <div>
            <ActivityTimeline />
          </div>
        </main>
      </div>

      {/* Corporate Finance Footer & Buildathon Disclaimer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 px-4 text-center mt-12">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 font-mono">
            <span className="font-bold text-slate-200">Tallykai</span>
            <span>•</span>
            <span>AI Finance Controller</span>
            <span>•</span>
            <span className="text-indigo-400 font-semibold">Phase 0 Foundation</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
            This project is a student buildathon project submitted for the{" "}
            <strong className="text-slate-400">Razorpay AI Buildathon 2026</strong> inspired by the track challenge.
            It is not an official Razorpay product and does not use proprietary Razorpay brand assets or APIs.
          </p>
        </div>
      </footer>
    </div>
  );
}
