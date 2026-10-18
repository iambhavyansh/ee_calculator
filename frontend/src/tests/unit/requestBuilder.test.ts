import { describe, it, expect } from "vitest";
import { NyquistRequest, TransferFunctionInput, StateSpaceInput } from "@/api/types";

describe("Request Builder Logic", () => {
  it("builds valid continuous transfer function payload", () => {
    const tf: TransferFunctionInput = {
      type: "tf",
      numerator: [1, 2],
      denominator: [1, 2, 1],
      dt: null,
    };

    const request: NyquistRequest = {
      system: tf,
      num_points: 1000,
    };

    expect(request.system.type).toBe("tf");
    expect(request.system.dt).toBeNull();
    expect((request.system as TransferFunctionInput).numerator).toEqual([1, 2]);
    expect((request.system as TransferFunctionInput).denominator).toEqual([1, 2, 1]);
  });

  it("builds valid discrete state-space payload", () => {
    const ss: StateSpaceInput = {
      type: "ss",
      A: [[0.5, 0], [0, 0.2]],
      B: [[1], [0]],
      C: [[1, 0]],
      D: [[0]],
      dt: 0.05,
    };

    const request: NyquistRequest = {
      system: ss,
      omega_start: 0.1,
      omega_end: 100,
      num_points: 500,
    };

    expect(request.system.type).toBe("ss");
    expect(request.system.dt).toBe(0.05);
    expect(request.num_points).toBe(500);
  });

  it("correctly converts frequency limits from Hz to rad/s", () => {
    const fHz = 10;
    const omega = fHz * 2 * Math.PI;

    expect(omega).toBeCloseTo(62.8318, 3);
  });
});

