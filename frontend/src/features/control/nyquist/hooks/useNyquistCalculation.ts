import { useState } from "react";
import axios from "axios";
import { calculateNyquist } from "@/api/nyquist";
import {
  NyquistPlotData,
  NyquistRequest,
  NyquistResults,
  SystemInput,
  WarningItem,
  ErrorResponse,
} from "@/api/types";

export function useNyquistCalculation() {
  // Model state
  const [systemType, setSystemType] = useState<"tf" | "ss">("tf");
  const [domain, setDomain] = useState<"continuous" | "discrete">("continuous");
  const [dt, setDt] = useState<number | null>(null);

  // Transfer Function state (default 1 / (s^2 + 2s + 1))
  const [numerator, setNumerator] = useState<number[]>([1]);
  const [denominator, setDenominator] = useState<number[]>([1, 2, 1]);

  // State Space state (default n=2 double integrator)
  const [ssN, setSsN] = useState<number>(2);
  const [ssA, setSsA] = useState<number[][]>([
    [0, 1],
    [-2, -3],
  ]);
  const [ssB, setSsB] = useState<number[][]>([[0], [1]]);
  const [ssC, setSsC] = useState<number[][]>([[1, 0]]);
  const [ssD, setSsD] = useState<number[][]>([[0]]);

  // Advanced options state
  const [omegaStart, setOmegaStart] = useState<string>("");
  const [omegaEnd, setOmegaEnd] = useState<string>("");
  const [numPoints, setNumPoints] = useState<number>(1000);
  const [freqUnit, setFreqUnit] = useState<"rad/s" | "Hz">("rad/s");

  // Output calculation state
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<NyquistResults | null>(null);
  const [plotData, setPlotData] = useState<NyquistPlotData | null>(null);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSsDimensionChange = (newN: number) => {
    if (newN < 1 || newN > 6) return;
    setSsN(newN);

    // Resize A (newN x newN)
    const newA: number[][] = Array.from({ length: newN }, (_, i) =>
      Array.from({ length: newN }, (_, j) => (i < ssA.length && j < (ssA[i]?.length || 0) ? ssA[i][j] : 0))
    );

    // Resize B (newN x 1)
    const newB: number[][] = Array.from({ length: newN }, (_, i) => [
      i < ssB.length ? ssB[i][0] : 0,
    ]);

    // Resize C (1 x newN)
    const newC: number[][] = [
      Array.from({ length: newN }, (_, j) => (j < ssC[0].length ? ssC[0][j] : 0)),
    ];

    setSsA(newA);
    setSsB(newB);
    setSsC(newC);
  };

  const handleReset = () => {
    setSystemType("tf");
    setDomain("continuous");
    setDt(null);
    setNumerator([1]);
    setDenominator([1, 2, 1]);
    setSsN(2);
    setSsA([
      [0, 1],
      [-2, -3],
    ]);
    setSsB([[0], [1]]);
    setSsC([[1, 0]]);
    setSsD([[0]]);
    setOmegaStart("");
    setOmegaEnd("");
    setNumPoints(1000);
    setFreqUnit("rad/s");
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleCalculate = async () => {
    setLoading(true);
    setGeneralError(null);
    setFieldErrors({});

    try {
      // 1. Build SystemInput
      let system: SystemInput;
      if (systemType === "tf") {
        system = {
          type: "tf",
          numerator,
          denominator,
          dt: domain === "discrete" ? dt : null,
        };
      } else {
        system = {
          type: "ss",
          A: ssA,
          B: ssB,
          C: ssC,
          D: ssD,
          dt: domain === "discrete" ? dt : null,
        };
      }

      // 2. Build Frequency limits (convert Hz -> rad/s if needed)
      let parsedStart: number | null = null;
      if (omegaStart.trim() !== "") {
        const val = parseFloat(omegaStart);
        if (!isNaN(val)) {
          parsedStart = freqUnit === "Hz" ? val * 2 * Math.PI : val;
        }
      }

      let parsedEnd: number | null = null;
      if (omegaEnd.trim() !== "") {
        const val = parseFloat(omegaEnd);
        if (!isNaN(val)) {
          parsedEnd = freqUnit === "Hz" ? val * 2 * Math.PI : val;
        }
      }

      const requestPayload: NyquistRequest = {
        system,
        omega_start: parsedStart,
        omega_end: parsedEnd,
        num_points: numPoints,
      };

      // 3. Send request
      const response = await calculateNyquist(requestPayload);

      // 4. Update results
      setResults(response.results);
      if (response.plots && response.plots.length > 0) {
        setPlotData(response.plots[0].data);
      }
      setWarnings(response.warnings || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const errData = err.response.data as ErrorResponse;
        if (errData && errData.error) {
          setGeneralError(errData.error.message);

          if (errData.error.fields && errData.error.fields.length > 0) {
            const mapped: Record<string, string> = {};
            errData.error.fields.forEach((f) => {
              const pathKey = f.path.join(".");
              mapped[pathKey] = f.message;
            });
            setFieldErrors(mapped);
          }
        } else {
          setGeneralError(`Calculation failed with status ${err.response.status}.`);
        }
      } else {
        setGeneralError("Network error: Could not reach the calculation service.");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
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
    setSsMatrices: (A: number[][], B: number[][], C: number[][], D: number[][]) => {
      setSsA(A);
      setSsB(B);
      setSsC(C);
      setSsD(D);
    },
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
  };
}

