"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { KPICard } from "@/components/dashboard/KPICard";
import { ReconciliationChart } from "@/components/dashboard/ReconciliationChart";
import { ReconciliationTable } from "@/components/dashboard/ReconciliationTable";
import { ExceptionsPanel } from "@/components/dashboard/ExceptionsPanel";
import { DataSourcesPanel } from "@/components/dashboard/DataSourcesPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Layers, Play, Lock, Sliders, Shield } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Slim Application Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Layout Wrapper */}
      <div className="lg:pl-60 flex-1 flex flex-col min-w-0">
        {/* Compact Top Navigation Bar */}
        <TopBar
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          pageTitle={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Professional Engine Status Strip */}
        <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-700 text-xs">
                <strong className="text-slate-900 font-semibold">Phase 5 AI Investigation Pipeline Active:</strong> 3-pass reconciliation (Deterministic → Fuzzy → AI Agent) with read-only tools, schema validation, and audit trails.
              </span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Ground Truth Data Isolated</span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Workspace */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* Header & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Overview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitor reconciliation performance and outstanding exceptions.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Available in Phase 2 ingestion"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload Batch</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled
                    title="Engine running on active dataset"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Run Engine</span>
                  </Button>
                </div>
              </div>

              {/* 4 Compact KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <KPICard
                  title="Records Processed"
                  value="1,003"
                  subtext="500 orders + 503 gateway settlements"
                  iconName="records"
                  statusTag="Phase 1 Data"
                  variant="default"
                />
                <KPICard
                  title="Match Rate"
                  value="72.2%"
                  subtext="361 explainable matches identified"
                  iconName="rate"
                  statusTag="Clean / Drifting"
                  variant="success"
                />
                <KPICard
                  title="Reconciled Amount"
                  value="₹12,48,500"
                  subtext="Verified payout sum in settlement feed"
                  iconName="amount"
                  statusTag="Verified"
                  variant="default"
                />
                <KPICard
                  title="Exceptions"
                  value="114"
                  subtext="Flagged for AI investigation or audit"
                  iconName="exceptions"
                  statusTag="Action Needed"
                  variant="warning"
                />
              </div>

              {/* Reconciliation Telemetry & Breakdown Chart */}
              <ReconciliationChart />

              {/* Ingestion Data Sources */}
              <DataSourcesPanel />

              {/* Split Ledger Table & Exceptions Queue */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                <div className="lg:col-span-2">
                  <ReconciliationTable />
                </div>
                <div className="lg:col-span-1 h-full">
                  <ExceptionsPanel />
                </div>
              </div>

              {/* Operational Audit Trail */}
              <ActivityTimeline />
            </>
          )}

          {/* TAB 2: RECONCILIATION */}
          {activeTab === "reconciliation" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Reconciliation Ledger
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detailed transaction ledger matching internal orders to settlement payouts.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded">
                    361 Matched
                  </span>
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded text-rose-700">
                    114 Exceptions
                  </span>
                </div>
              </div>
              <ReconciliationTable />
            </div>
          )}

          {/* TAB 3: EXCEPTIONS */}
          {activeTab === "exceptions" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Exception Management
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Categorized transaction discrepancies awaiting deterministic retry or AI investigation.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ExceptionsPanel />
                <div className="bg-white border border-slate-200/90 rounded-lg p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        AI Exception Investigator
                      </h3>
                      <Badge variant="success" size="sm">Phase 5 Active</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Autonomous AI Agent investigation pipeline analyzing root causes for unresolved exceptions, candidate ambiguities, and fee/tax discrepancies with strict human review fallback.
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs font-mono text-slate-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pipeline Status:</span>
                        <span className="font-semibold text-emerald-700">Online & Active (Pass 3)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Provider Abstraction:</span>
                        <span className="font-semibold text-slate-800">Gemini / Heuristic Engine</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Read-Only Tools:</span>
                        <span className="font-semibold text-slate-800">8 Deterministic Tools</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Safety Policy:</span>
                        <span className="font-semibold text-slate-800">Human Review Fallback</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>TallyKai AI Infrastructure</span>
                    <span>Razorpay Buildathon 2026</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA SOURCES */}
          {activeTab === "data-sources" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Data Sources & Ingestion
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage internal order ledgers and external gateway settlement feeds.
                </p>
              </div>
              <DataSourcesPanel />
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeTab === "audit-log" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Audit Activity Trail
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable operational log of reconciliation matching operations.
                </p>
              </div>
              <ActivityTimeline />
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Settings & Configurations
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  System thresholds, gateway MDR fee tiers, and engine parameters.
                </p>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-lg p-5 max-w-2xl space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Reconciliation Matching Thresholds
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Set tolerance windows and fuzzy matching confidence cutoffs.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/60">
                    <span className="text-slate-600">Default Date Window Tolerance:</span>
                    <span className="font-mono font-semibold text-slate-900">T+3 Days</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/60">
                    <span className="text-slate-600">MDR Fee Variance Tolerance:</span>
                    <span className="font-mono font-semibold text-slate-900">± 2.5%</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/60">
                    <span className="text-slate-600">AI Agent Confidence Threshold:</span>
                    <span className="font-mono font-semibold text-slate-900">80%</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Currency Unit:</span>
                    <span className="font-mono font-semibold text-slate-900">INR (₹)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configured for Razorpay AI Buildathon 2026</span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Corporate Fintech Footer */}
        <footer className="w-full border-t border-slate-200 bg-white py-3.5 px-4 text-center">
          <div className="max-w-7xl mx-auto space-y-1">
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-mono">
              <span className="font-bold text-slate-900">TARI</span>
              <span>•</span>
              <span>AI Finance Controller</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">Phase 1 Synthetic Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
              Built for the <strong className="text-slate-600 font-medium">Razorpay AI Buildathon 2026</strong>. Confidential enterprise prototype.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
