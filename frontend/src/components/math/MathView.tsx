import React, { useMemo } from "react";
import katex from "katex";

interface MathViewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  latex,
  displayMode = true,
  className = "",
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return <div className={`font-mono text-sm ${className}`}>{latex}</div>;
  }

  return (
    <div
      className={`overflow-x-auto py-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export function formatPolynomialLatex(coeffs: number[], variable: "s" | "z"): string {
  if (!coeffs || coeffs.length === 0) return "0";

  // Filter out leading zeroes unless it's just [0]
  let startIndex = 0;
  while (startIndex < coeffs.length - 1 && Math.abs(coeffs[startIndex]) < 1e-12) {
    startIndex++;
  }
  const clean = coeffs.slice(startIndex);
  const n = clean.length - 1;

  const terms: string[] = [];
  clean.forEach((c, index) => {
    if (Math.abs(c) < 1e-12 && clean.length > 1) return;
    const power = n - index;
    const isFirst = terms.length === 0;

    let sign = "";
    if (c < 0) {
      sign = isFirst ? "-" : " - ";
    } else if (!isFirst) {
      sign = " + ";
    }

    const absC = Math.abs(c);
    let coeffStr = absC.toString();
    if (power > 0 && Math.abs(absC - 1) < 1e-12) {
      coeffStr = "";
    }

    let varStr = "";
    if (power > 1) {
      varStr = `${variable}^{${power}}`;
    } else if (power === 1) {
      varStr = variable;
    }

    terms.push(`${sign}${coeffStr}${varStr}`);
  });

  return terms.length > 0 ? terms.join("") : "0";
}

