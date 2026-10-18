import React from "react";
import { Plus, Trash2, Binary, Sliders } from "lucide-react";
import { MathView, formatPolynomialLatex } from "@/components/math/MathView";
import { MatrixGridInput } from "./MatrixGridInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SystemInputFormProps {
  systemType: "tf" | "ss";
  onSystemTypeChange: (type: "tf" | "ss") => void;
  domain: "continuous" | "discrete";
  onDomainChange: (domain: "continuous" | "discrete") => void;
  dt: number | null;
  onDtChange: (dt: number | null) => void;

  // Transfer function coefficients
  numerator: number[];
  denominator: number[];
  onNumeratorChange: (num: number[]) => void;
  onDenominatorChange: (den: number[]) => void;

  // State space matrices
  ssN: number;
  onSsNChange: (n: number) => void;
  ssA: number[][];
  ssB: number[][];
  ssC: number[][];
  ssD: number[][];
  onSsChange: (A: number[][], B: number[][], C: number[][], D: number[][]) => void;

  errors: Record<string, string>;
}

export const SystemInputForm: React.FC<SystemInputFormProps> = ({
  systemType,
  onSystemTypeChange,
  domain,
  onDomainChange,
  dt,
  onDtChange,
  numerator,
  denominator,
  onNumeratorChange,
  onDenominatorChange,
  ssN,
  onSsNChange,
  ssA,
  ssB,
  ssC,
  ssD,
  onSsChange,
  errors,
}) => {
  const variable = domain === "continuous" ? "s" : "z";

  // Formulate Live LaTeX
  const numLatex = formatPolynomialLatex(numerator, variable);
  const denLatex = formatPolynomialLatex(denominator, variable);
  const liveLatex =
    systemType === "tf"
      ? `G(${variable}) = \\frac{${numLatex}}{${denLatex}}`
      : `\\dot{x} = Ax + Bu, \\quad y = Cx + Du \\quad (n = ${ssN})`;

  // Coefficient list handlers
  const handleCoeffChange = (
    list: number[],
    index: number,
    val: number,
    setter: (arr: number[]) => void
  ) => {
    const updated = [...list];
    updated[index] = val;
    setter(updated);
  };

  const handleAddCoeff = (list: number[], setter: (arr: number[]) => void) => {
    setter([...list, 0]);
  };

  const handleRemoveCoeff = (list: number[], index: number, setter: (arr: number[]) => void) => {
    if (list.length <= 1) return;
    const updated = list.filter((_, i) => i !== index);
    setter(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Toggles: System representation & Domain */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Model Type Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Model Representation</label>
          <div className="flex rounded-md border p-1 bg-muted/40 h-10 items-center">
            <button
              type="button"
              onClick={() => onSystemTypeChange("tf")}
              className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded px-2 text-xs font-medium whitespace-nowrap transition-colors ${
                systemType === "tf"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sliders className="h-3.5 w-3.5 shrink-0" />
              <span>Transfer Function</span>
            </button>
            <button
              type="button"
              onClick={() => onSystemTypeChange("ss")}
              className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded px-2 text-xs font-medium whitespace-nowrap transition-colors ${
                systemType === "ss"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Binary className="h-3.5 w-3.5 shrink-0" />
              <span>State Space</span>
            </button>
          </div>
        </div>

        {/* Domain Toggle (Continuous vs Discrete) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Time Domain</label>
          <div className="flex rounded-md border p-1 bg-muted/40 h-10 items-center">
            <button
              type="button"
              onClick={() => {
                onDomainChange("continuous");
                onDtChange(null);
              }}
              className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded px-2 text-xs font-medium whitespace-nowrap transition-colors ${
                domain === "continuous"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Continuous (s)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDomainChange("discrete");
                if (dt === null || dt <= 0) onDtChange(0.1);
              }}
              className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded px-2 text-xs font-medium whitespace-nowrap transition-colors ${
                domain === "discrete"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Discrete (z)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sampling time dt if Discrete */}
      {domain === "discrete" && (
        <div className="rounded-md border border-border p-3 bg-muted/20 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground">Sampling Time (dt)</span>
            <p className="text-[11px] text-muted-foreground">Sample period in seconds</p>
          </div>
          <div className="w-32">
            <Input
              type="number"
              step="any"
              min="0.0001"
              value={dt ?? 0.1}
              onChange={(e) => onDtChange(parseFloat(e.target.value) || 0.1)}
              className="h-8 text-xs font-mono text-center"
            />
          </div>
        </div>
      )}

      {/* Live KaTeX Expression Preview */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-1 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Live System Preview
        </span>
        <div className="min-h-[48px] flex items-center justify-center text-foreground font-serif">
          <MathView latex={liveLatex} />
        </div>
      </div>

      {/* Model-specific input controls */}
      {systemType === "tf" ? (
        <div className="space-y-5">
          {/* Numerator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-2">
                <span>Numerator Coefficients (Highest Power First)</span>
                {errors["system.numerator"] && (
                  <span className="text-destructive text-[11px] font-normal">
                    {errors["system.numerator"]}
                  </span>
                )}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddCoeff(numerator, onNumeratorChange)}
                className="h-7 px-2 text-xs flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Term
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {numerator.map((val, idx) => {
                const power = numerator.length - 1 - idx;
                const label = power > 1 ? `${variable}^${power}` : power === 1 ? variable : "const";
                return (
                  <div key={`num-${idx}`} className="relative flex items-center gap-1">
                    <div className="relative w-full">
                      <Input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) =>
                          handleCoeffChange(numerator, idx, parseFloat(e.target.value) || 0, onNumeratorChange)
                        }
                        className="h-8 text-xs font-mono pr-10"
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-semibold pointer-events-none select-none">
                        {label}
                      </span>
                    </div>
                    {numerator.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCoeff(numerator, idx, onNumeratorChange)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Denominator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-2">
                <span>Denominator Coefficients (Highest Power First)</span>
                {errors["system.denominator"] && (
                  <span className="text-destructive text-[11px] font-normal">
                    {errors["system.denominator"]}
                  </span>
                )}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddCoeff(denominator, onDenominatorChange)}
                className="h-7 px-2 text-xs flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Term
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {denominator.map((val, idx) => {
                const power = denominator.length - 1 - idx;
                const label = power > 1 ? `${variable}^${power}` : power === 1 ? variable : "const";
                return (
                  <div key={`den-${idx}`} className="relative flex items-center gap-1">
                    <div className="relative w-full">
                      <Input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) =>
                          handleCoeffChange(denominator, idx, parseFloat(e.target.value) || 0, onDenominatorChange)
                        }
                        className="h-8 text-xs font-mono pr-10"
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-semibold pointer-events-none select-none">
                        {label}
                      </span>
                    </div>
                    {denominator.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCoeff(denominator, idx, onDenominatorChange)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <MatrixGridInput
          n={ssN}
          onDimensionChange={onSsNChange}
          A={ssA}
          B={ssB}
          C={ssC}
          D={ssD}
          onChange={onSsChange}
          errors={errors}
        />
      )}
    </div>
  );
};
