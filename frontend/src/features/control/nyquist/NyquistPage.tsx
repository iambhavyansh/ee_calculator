import React from "react";
import { Activity, Info } from "lucide-react";
import { useNyquistCalculation } from "./hooks/useNyquistCalculation";
import { SystemInputForm } from "./components/SystemInputForm";
import { AdvancedOptions } from "./components/AdvancedOptions";
import { NyquistPlot } from "./components/NyquistPlot";
import { NyquistResultsTable } from "./components/NyquistResultsTable";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { WarningBanner } from "@/components/feedback/WarningBanner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const NyquistPage: React.FC = () => {
  const {
    systemType,
    setSystemType,
    domain,
    setDomain,
    dt,
    setDt,
    numerator,
    setNumerator,
    denominator,
    setDenominator,
    ssN,
    handleSsDimensionChange,
    ssA,
    ssB,
    ssC,
    ssD,
    setSsMatrices,
    omegaStart,
    setOmegaStart,
    omegaEnd,
    setOmegaEnd,
    numPoints,
    setNumPoints,
    freqUnit,
    setFreqUnit,
    loading,
    results,
    plotData,
    warnings,
    generalError,
    fieldErrors,
    handleCalculate,
    handleReset,
  } = useNyquistCalculation();

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Control Systems
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              SYNC
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Nyquist Plot Calculator
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Frequency response contour, encirclement analysis, and closed-loop stability margins.
          </p>
        </div>
      </div>

      {/* Main 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form (Cards) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>System Parameters</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Enter your SISO transfer function or state-space model below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SystemInputForm
                systemType={systemType}
                onSystemTypeChange={setSystemType}
                domain={domain}
                onDomainChange={setDomain}
                dt={dt}
                onDtChange={setDt}
                numerator={numerator}
                denominator={denominator}
                onNumeratorChange={setNumerator}
                onDenominatorChange={setDenominator}
                ssN={ssN}
                onSsNChange={handleSsDimensionChange}
                ssA={ssA}
                ssB={ssB}
                ssC={ssC}
                ssD={ssD}
                onSsChange={setSsMatrices}
                errors={fieldErrors}
              />

              <AdvancedOptions
                omegaStart={omegaStart}
                onOmegaStartChange={setOmegaStart}
                omegaEnd={omegaEnd}
                onOmegaEndChange={setOmegaEnd}
                numPoints={numPoints}
                onNumPointsChange={setNumPoints}
                freqUnit={freqUnit}
                onFreqUnitChange={setFreqUnit}
                onCalculate={handleCalculate}
                onReset={handleReset}
                loading={loading}
                errors={fieldErrors}
              />
            </CardContent>
          </Card>

          {/* Quick Help Tip */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">
              <strong>Tip:</strong> The critical point <code className="text-destructive font-bold">-1 + 0j</code> is marked with a red cross. The dashed curve shows the negative frequency mirror branch.
            </p>
          </div>
        </div>

        {/* Right Column: Warnings, Plot, and Results */}
        <div className="lg:col-span-7 space-y-6">
          {/* General API error banner */}
          {generalError && <ErrorBanner message={generalError} />}

          {/* Warnings Banner */}
          <WarningBanner warnings={warnings} />

          {/* Plot Card */}
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Interactive Nyquist Plot</CardTitle>
                <CardDescription className="text-xs">
                  Hover to inspect frequency (ω), Real, and Imaginary values.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <NyquistPlot plotData={plotData} />
            </CardContent>
          </Card>

          {/* Analytical Results Card */}
          {results && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Analytical Stability & Margins</CardTitle>
                <CardDescription className="text-xs">
                  Stability verdict according to the Cauchy-Nyquist argument principle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NyquistResultsTable results={results} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

