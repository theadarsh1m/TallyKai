import { Cpu } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-slate-200 bg-white sticky top-0 z-50 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
            T
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                TallyKai
              </h1>
              <span className="px-1.5 py-0.2 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded font-mono">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              AI Finance Controller & Automated Reconciliation Engine
            </p>
          </div>
        </div>

        {/* System Meta & Environment Badge */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Engine:</span>
            <span className="font-semibold text-slate-900">Phase 1 Active</span>
          </div>

          <Badge variant="success" dot size="md">
            Demo Environment
          </Badge>
        </div>
      </div>
    </header>
  );
};
