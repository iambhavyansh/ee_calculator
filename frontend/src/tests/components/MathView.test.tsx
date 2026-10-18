import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathView, formatPolynomialLatex } from "@/components/math/MathView";

describe("MathView & LaTeX Formatting", () => {
  it("formats continuous-time polynomial correctly", () => {
    // 1*s^2 + 2*s + 1
    const res = formatPolynomialLatex([1, 2, 1], "s");
    expect(res).toBe("s^{2} + 2s + 1");
  });

  it("formats discrete-time polynomial with negative coefficients", () => {
    // 1*z - 0.8
    const res = formatPolynomialLatex([1, -0.8], "z");
    expect(res).toBe("z - 0.8");
  });

  it("renders math equation without crashing", () => {
    render(<MathView latex="G(s) = \frac{1}{s + 1}" />);
    expect(document.querySelector(".katex")).not.toBeNull();
  });
});
