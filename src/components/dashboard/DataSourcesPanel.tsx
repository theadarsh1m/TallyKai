import { Database, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const DataSourcesPanel: React.FC = () => {
  const sources = [
    {
      title: "Internal Order Ledger",
      subtitle: "E-Commerce Core Transaction Database",
      records: "500 records",
      status: "Ready",
      lastUpdated: "2026-08-21 11:24:00",
      format: "JSON / CSV Feed",
      icon: Database,
    },
    {
      title: "Settlement Records",
      subtitle: "Razorpay / Bank Settlement Statement",
      records: "503 records",
      status: "Ready",
      lastUpdated: "2026-08-21 11:24:00",
      format: "JSON / Payout File",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Ingestion Data Sources
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Primary financial feeds loaded for automated reconciliation analysis.
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-500 self-start sm:self-auto">
          Phase 1 Datasets Loaded
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {sources.map((src, idx) => {
          const Icon = src.icon;
          return (
            <div
              key={idx}
              className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-md flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white border border-slate-200 rounded-md text-slate-700 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {src.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {src.subtitle}
                    </p>
                  </div>
                </div>

                <Badge variant="success" dot size="sm">
                  {src.status}
                </Badge>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-slate-900 tabular-nums">
                  {src.records}
                </span>
                <span className="text-slate-500 text-[11px]">
                  Format: {src.format}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
