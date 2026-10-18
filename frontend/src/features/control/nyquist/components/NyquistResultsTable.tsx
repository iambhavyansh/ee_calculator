import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { NyquistResults } from "@/api/types";
import { Badge } from "@/components/ui/badge";

interface NyquistResultsTableProps {
  results: NyquistResults | null;
}

export const NyquistResultsTable: React.FC<NyquistResultsTableProps> = ({ results }) => {
  if (!results) return null;

  const {
    is_stable,
    num_open_loop_rhp_poles,
    num_encirclements,
    gain_margin_db,
    gain_margin_freq,
    phase_margin_deg,
    phase_margin_freq,
    poles,
    zeros,
  } = results;

  const formatComplex = (re: number, im: number) => {
    const reStr = re.toFixed(3);
    if (Math.abs(im) < 1e-6) return reStr;
    const sign = im >= 0 ? "+" : "-";
    const imStr = Math.abs(im).toFixed(3);
    return `${reStr} ${sign} ${imStr}j`;
  };

  return (
    <div className="space-y-4">
      {/* Stability Verdict Banner */}
      <div
        className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
          is_stable
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
            : "border-destructive/40 bg-destructive/10 text-destructive dark:text-destructive-foreground"
        }`}
      >
        <div className="flex items-center gap-3">
          {is_stable ? (
            <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm tracking-tight">
                {is_stable ? "Closed-Loop System is Stable" : "Closed-Loop System is Unstable"}
              </h4>
              <Badge variant={is_stable ? "success" : "destructive"} className="text-[10px]">
                {is_stable ? "Stable" : "Unstable"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nyquist criterion: Z = P + N = {num_open_loop_rhp_poles} + {num_encirclements} ={" "}
              {num_open_loop_rhp_poles + num_encirclements} closed-loop RHP poles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-center border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-4 border-border">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-sans">
              OL RHP Poles (P)
            </span>
            <span className="font-bold">{num_open_loop_rhp_poles}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-sans">
              Encirclements (N)
            </span>
            <span className="font-bold">{num_encirclements}</span>
          </div>
        </div>
      </div>

      {/* Stability Margins Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Gain Margin Card */}
        <div className="rounded-lg border bg-card p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Gain Margin (GM)
          </span>
          <div className="text-lg font-bold font-mono text-foreground">
            {gain_margin_db !== null ? `${gain_margin_db.toFixed(2)} dB` : "∞ (Infinite)"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Phase Crossover Freq (ω_pc):</span>
            <span className="font-mono">
              {gain_margin_freq !== null ? `${gain_margin_freq.toFixed(2)} rad/s` : "—"}
            </span>
          </div>
        </div>

        {/* Phase Margin Card */}
        <div className="rounded-lg border bg-card p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Phase Margin (PM)
          </span>
          <div className="text-lg font-bold font-mono text-foreground">
            {phase_margin_deg !== null ? `${phase_margin_deg.toFixed(2)}°` : "— (Infinite)"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Gain Crossover Freq (ω_gc):</span>
            <span className="font-mono">
              {phase_margin_freq !== null ? `${phase_margin_freq.toFixed(2)} rad/s` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Poles and Zeros List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Open Loop Poles */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <span className="font-semibold text-foreground block">
            Open-Loop Poles ({poles.length})
          </span>
          {poles.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {poles.map((p, idx) => (
                <div
                  key={`p-${idx}`}
                  className="flex items-center justify-between py-0.5 border-b border-border/50 font-mono"
                >
                  <span className="text-muted-foreground">p_{idx + 1}</span>
                  <span className={p.re > 1e-6 ? "text-destructive font-semibold" : ""}>
                    {formatComplex(p.re, p.im)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Loop Zeros */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <span className="font-semibold text-foreground block">
            Open-Loop Zeros ({zeros.length})
          </span>
          {zeros.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {zeros.map((z, idx) => (
                <div
                  key={`z-${idx}`}
                  className="flex items-center justify-between py-0.5 border-b border-border/50 font-mono"
                >
                  <span className="text-muted-foreground">z_{idx + 1}</span>
                  <span>{formatComplex(z.re, z.im)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
