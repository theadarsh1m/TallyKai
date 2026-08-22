"use client";

import React from "react";
import {
  LayoutDashboard,
  TableProperties,
  AlertCircle,
  Database,
  History,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "reconciliation", label: "Reconciliation", icon: TableProperties },
    { id: "exceptions", label: "Exceptions", icon: AlertCircle, badge: "114" },
    { id: "data-sources", label: "Data Sources", icon: Database },
    { id: "audit-log", label: "Audit Log", icon: History },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slim Enterprise Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          {/* Brand Header */}
          <div className="h-13 px-4 border-b border-slate-150 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center tracking-tight">
                T
              </div>
              <div className="leading-tight">
                <span className="font-bold text-slate-900 tracking-tight text-xs block">
                  TARI
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">
                  AI Finance Controller
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2.5 space-y-0.5">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-left",
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-slate-900" : "text-slate-400"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Configuration Area */}
        <div className="p-2.5 border-t border-slate-150 space-y-1">
          <button
            onClick={() => {
              setActiveTab("settings");
              onClose();
            }}
            className={cn(
              "w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-left",
              activeTab === "settings"
                ? "bg-slate-100 text-slate-900 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Settings
              className={cn(
                "w-4 h-4 shrink-0",
                activeTab === "settings" ? "text-slate-900" : "text-slate-400"
              )}
            />
            <span>Settings</span>
          </button>

          <div className="px-2.5 pt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Razorpay Track</span>
            <span>2026</span>
          </div>
        </div>
      </aside>
    </>
  );
};
