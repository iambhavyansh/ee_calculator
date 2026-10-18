import React from "react";
import { AlertTriangle } from "lucide-react";
import { WarningItem } from "@/api/types";

interface WarningBannerProps {
  warnings: WarningItem[];
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {warnings.map((warning, index) => (
        <div
          key={`${warning.code}-${index}`}
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs space-y-0.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300">
              {warning.code}
            </span>
            <p className="font-medium">{warning.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

