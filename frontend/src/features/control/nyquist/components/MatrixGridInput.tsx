import React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MatrixGridInputProps {
  n: number;
  onDimensionChange: (newN: number) => void;
  A: number[][];
  B: number[][];
  C: number[][];
  D: number[][];
  onChange: (A: number[][], B: number[][], C: number[][], D: number[][]) => void;
  errors?: Record<string, string>;
}

export const MatrixGridInput: React.FC<MatrixGridInputProps> = ({
  n,
  onDimensionChange,
  A,
  B,
  C,
  D,
  onChange,
  errors = {},
}) => {
  const handleAChange = (r: number, c: number, val: number) => {
    const newA = A.map((row, i) =>
      row.map((cell, j) => (i === r && j === c ? val : cell))
    );
    onChange(newA, B, C, D);
  };

  const handleBChange = (r: number, val: number) => {
    const newB = B.map((row, i) => (i === r ? [val] : row));
    onChange(A, newB, C, D);
  };

  const handleCChange = (c: number, val: number) => {
    const newC = [C[0].map((cell, j) => (j === c ? val : cell))];
    onChange(A, B, newC, D);
  };

  const handleDChange = (val: number) => {
    onChange(A, B, C, [[val]]);
  };

  return (
    <div className="space-y-4">
      {/* Dimension Stepper */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <span className="text-xs font-semibold text-foreground">System Order (States n)</span>
          <p className="text-[11px] text-muted-foreground">Dimensions for A (n×n), B (n×1), C (1×n)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={n <= 1}
            onClick={() => onDimensionChange(n - 1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono font-bold w-6 text-center">{n}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={n >= 6}
            onClick={() => onDimensionChange(n + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Matrices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matrix A */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Matrix A ({n}×{n})</span>
            {errors["system.A"] && (
              <span className="text-destructive text-[11px] font-normal">{errors["system.A"]}</span>
            )}
          </label>
          <div
            className="grid gap-1.5 p-2 bg-muted/30 rounded-md border"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {A.map((row, i) =>
              row.map((val, j) => (
                <Input
                  key={`a-${i}-${j}`}
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => handleAChange(i, j, parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono text-center p-1"
                />
              ))
            )}
          </div>
        </div>

        {/* Matrix B */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Matrix B ({n}×1)</span>
            {errors["system.B"] && (
              <span className="text-destructive text-[11px] font-normal">{errors["system.B"]}</span>
            )}
          </label>
          <div className="grid gap-1.5 p-2 bg-muted/30 rounded-md border w-24">
            {B.map((row, i) => (
              <Input
                key={`b-${i}`}
                type="number"
                step="any"
                value={row[0]}
                onChange={(e) => handleBChange(i, parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono text-center p-1"
              />
            ))}
          </div>
        </div>

        {/* Matrix C */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Matrix C (1×{n})</span>
            {errors["system.C"] && (
              <span className="text-destructive text-[11px] font-normal">{errors["system.C"]}</span>
            )}
          </label>
          <div
            className="grid gap-1.5 p-2 bg-muted/30 rounded-md border"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {C[0].map((val, j) => (
              <Input
                key={`c-${j}`}
                type="number"
                step="any"
                value={val}
                onChange={(e) => handleCChange(j, parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono text-center p-1"
              />
            ))}
          </div>
        </div>

        {/* Matrix D */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Matrix D (1×1)</span>
            {errors["system.D"] && (
              <span className="text-destructive text-[11px] font-normal">{errors["system.D"]}</span>
            )}
          </label>
          <div className="p-2 bg-muted/30 rounded-md border w-24">
            <Input
              type="number"
              step="any"
              value={D[0][0]}
              onChange={(e) => handleDChange(parseFloat(e.target.value) || 0)}
              className="h-8 text-xs font-mono text-center p-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

