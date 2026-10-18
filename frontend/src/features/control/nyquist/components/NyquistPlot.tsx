import React, { useEffect, useRef } from "react";
// @ts-expect-error - plotly.js-basic-dist-min does not export default typed module
import Plotly from "plotly.js-basic-dist-min";
import { NyquistPlotData } from "@/api/types";
import { useTheme } from "@/context/ThemeContext";

interface NyquistPlotProps {
  plotData: NyquistPlotData | null;
}

export const NyquistPlot: React.FC<NyquistPlotProps> = ({ plotData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, getAccentHex } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    if (!plotData) {
      Plotly.purge(containerRef.current);
      return;
    }

    const isDark = resolvedTheme === "dark";
    const accentHex = getAccentHex();
    const textColor = isDark ? "#e5e7eb" : "#1f2937";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";
    const zeroLineColor = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.35)";

    const { positive_branch, negative_branch } = plotData;

    // Filter valid numerical coordinates
    const posValid: { omega: number; re: number; im: number }[] = [];
    positive_branch.omega.forEach((w, i) => {
      const re = positive_branch.real[i];
      const im = positive_branch.imag[i];
      if (w !== null && re !== null && im !== null) {
        posValid.push({ omega: w, re, im });
      }
    });

    const negValid: { omega: number; re: number; im: number }[] = [];
    negative_branch.omega.forEach((w, i) => {
      const re = negative_branch.real[i];
      const im = negative_branch.imag[i];
      if (w !== null && re !== null && im !== null) {
        negValid.push({ omega: w, re, im });
      }
    });

    // 1. Positive Frequency Branch (Solid Line)
    const tracePositive = {
      x: posValid.map((p) => p.re),
      y: posValid.map((p) => p.im),
      customdata: posValid.map((p) => p.omega),
      type: "scatter",
      mode: "lines",
      name: "Positive Branch (ω > 0)",
      line: {
        color: accentHex,
        width: 2.5,
      },
      hovertemplate:
        "<b>Positive Branch</b><br>Real: %{x:.4f}<br>Imag: %{y:.4f}<br>Frequency: %{customdata:.4f} rad/s<extra></extra>",
    };

    // 2. Negative Mirror Branch (Dashed Line)
    const traceNegative = {
      x: negValid.map((p) => p.re),
      y: negValid.map((p) => p.im),
      customdata: negValid.map((p) => p.omega),
      type: "scatter",
      mode: "lines",
      name: "Mirror Branch (ω < 0)",
      line: {
        color: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.35)",
        width: 1.8,
        dash: "dash",
      },
      hovertemplate:
        "<b>Mirror Branch</b><br>Real: %{x:.4f}<br>Imag: %{y:.4f}<br>Frequency: %{customdata:.4f} rad/s<extra></extra>",
    };

    // 3. Critical Point (-1 + j0)
    const traceCriticalPoint = {
      x: [-1],
      y: [0],
      type: "scatter",
      mode: "markers+text",
      name: "Critical Point (-1, 0)",
      marker: {
        color: "#ef4444",
        size: 9,
        symbol: "cross",
        line: {
          color: "#b91c1c",
          width: 2,
        },
      },
      text: ["-1 + 0j"],
      textposition: "bottom left",
      textfont: {
        color: "#ef4444",
        size: 11,
        family: "sans-serif",
      },
      hoverinfo: "name",
    };

    const layout = {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      autosize: true,
      margin: { l: 50, r: 25, t: 40, b: 60 },
      modebar: {
        orientation: "h",
        color: isDark ? "#9ca3af" : "#6b7280",
        activecolor: accentHex,
        bgcolor: "transparent",
      },
      font: {
        family: "sans-serif",
        color: textColor,
        size: 11,
      },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "right",
        x: 1,
        font: { size: 10, color: textColor },
      },
      xaxis: {
        title: { text: "Real Part", font: { size: 12 }, standoff: 10 },
        gridcolor: gridColor,
        zerolinecolor: zeroLineColor,
        zerolinewidth: 1.5,
        tickfont: { size: 10, color: textColor },
        scaleanchor: "y",
        scaleratio: 1, // Equal axis aspect ratio
      },
      yaxis: {
        title: { text: "Imaginary Part", font: { size: 12 } },
        gridcolor: gridColor,
        zerolinecolor: zeroLineColor,
        zerolinewidth: 1.5,
        tickfont: { size: 10, color: textColor },
      },
      hovermode: "closest",
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "toggleSpikelines"],
    };

    Plotly.react(containerRef.current, [traceNegative, tracePositive, traceCriticalPoint], layout, config);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [plotData, resolvedTheme, getAccentHex]);

  if (!plotData) {
    return (
      <div className="h-[420px] rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
        <p className="text-sm font-medium">No calculation results to display.</p>
        <p className="text-xs">Configure your system on the left and click "Calculate Nyquist".</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[440px] rounded-lg border bg-card/60 p-2 relative shadow-sm">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

