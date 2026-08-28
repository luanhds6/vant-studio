import { describe, it, expect } from "vitest";
import { hexToRgb, getLuminance, sanitizeFilename } from "@/lib/garmentColorizer";

describe("garmentColorizer", () => {
  it("converts hex to rgb correctly", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#223b7b")).toEqual([34, 59, 123]);
    expect(hexToRgb("#063")).toEqual([0, 102, 51]);
    expect(hexToRgb("223b7b")).toEqual([34, 59, 123]);
  });

  it("calculates luminance correctly", () => {
    expect(getLuminance(255, 255, 255)).toBeCloseTo(1.0, 2);
    expect(getLuminance(0, 0, 0)).toBe(0);
    // Green has highest perceived weight
    expect(getLuminance(0, 255, 0)).toBeGreaterThan(getLuminance(0, 0, 255));
  });

  it("sanitizes filenames correctly removing special chars and accents", () => {
    expect(sanitizeFilename("Avental cirúrgico com opa - Verde Bandeira")).toBe(
      "Avental_cirurgico_com_opa_-_Verde_Bandeira",
    );
    expect(sanitizeFilename("Macacão / Pijama (Especial)")).toBe("Macacao_Pijama_Especial");
  });
});
