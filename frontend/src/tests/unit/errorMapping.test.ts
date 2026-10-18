import { describe, it, expect } from "vitest";
import { FieldError } from "@/api/types";

describe("Error Mapping Logic", () => {
  it("maps backend error path array to dot-separated field keys", () => {
    const backendFields: FieldError[] = [
      {
        path: ["system", "denominator"],
        code: "VALIDATION_ERROR",
        message: "This field is required.",
      },
      {
        path: ["omega_end"],
        code: "VALIDATION_ERROR",
        message: "omega_end must be greater than omega_start.",
      },
      {
        path: ["system", "A", 0, 1],
        code: "VALIDATION_ERROR",
        message: "Invalid matrix coefficient.",
      },
    ];

    const mapped: Record<string, string> = {};
    backendFields.forEach((f) => {
      const key = f.path.join(".");
      mapped[key] = f.message;
    });

    expect(mapped["system.denominator"]).toBe("This field is required.");
    expect(mapped["omega_end"]).toBe("omega_end must be greater than omega_start.");
    expect(mapped["system.A.0.1"]).toBe("Invalid matrix coefficient.");
  });
});

