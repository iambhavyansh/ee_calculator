import React, { useState } from "react";
import { ChevronDown, ChevronUp, Settings2, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdvancedOptionsProps {
  omegaStart: string;
  onOmegaStartChange: (val: string) => void;
  omegaEnd: string;
  onOmegaEndChange: (val: string) => void;
  numPoints: number;
  onNumPointsChange: (val: number) => void;
  freqUnit: "rad/s" | "Hz";
  onFreqUnitChange: (unit: "rad/s" | "Hz") => void;

  onCalculate: () => void;
  onReset: () => void;
  loading: boolean;
  errors: Record<string, string>;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  omegaStart,
  onOmegaStartChange,
  omegaEnd,
  onOmegaEndChange,
  numPoints,
  onNumPointsChange,
  freqUnit,
  onFreqUnitChange,
  onCalculate,
  onReset,
  loading,
  errors,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4 pt-2">
      {/* Collapsible toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-t border-border"
      >
        <span className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Advanced Evaluation Options
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/20 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Frequency Unit</span>
            <div className="flex rounded-md border p-0.5 bg-muted/50">
              <button
                type="button"
                onClick={() => onFreqUnitChange("rad/s")}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  freqUnit === "rad/s"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                rad/s
              </button>
              <button
                type="button"
                onClick={() => onFreqUnitChange("Hz")}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  freqUnit === "Hz"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hz
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                <span>Start Frequency ({freqUnit})</span>
                {errors.omega_start && (
                  <span className="text-destructive text-[10px]">{errors.omega_start}</span>
                )}
              </label>
              <Input
                type="number"
                step="any"
                placeholder="Auto (default)"
                value={omegaStart}
                onChange={(e) => onOmegaStartChange(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                <span>End Frequency ({freqUnit})</span>
                {errors.omega_end && (
                  <span className="text-destructive text-[10px]">{errors.omega_end}</span>
                )}
              </label>
              <Input
                type="number"
                step="any"
                placeholder="Auto (default)"
                value={omegaEnd}
                onChange={(e) => onOmegaEndChange(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-foreground">
                Evaluation Points (Density: {numPoints})
              </label>
              {errors.num_points && (
                <span className="text-destructive text-[10px]">{errors.num_points}</span>
              )}
            </div>
            <Input
              type="number"
              min="10"
              max="10000"
              value={numPoints}
              onChange={(e) => onNumPointsChange(parseInt(e.target.value, 10) || 1000)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      )}

      {/* Primary Actions: Calculate & Reset */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          onClick={onCalculate}
          disabled={loading}
          className="flex-1 font-semibold flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          <span>{loading ? "Calculating..." : "Calculate Nyquist"}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={loading}
          className="flex items-center gap-1.5"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </Button>
      </div>
    </div>
  );
};

