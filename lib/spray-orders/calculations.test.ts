import { describe, expect, it } from "vitest";
import { calculateSprayVolume, calculateTheoreticalQuantity, roundTo } from "./calculations";

describe("calculateTheoreticalQuantity", () => {
  it("100 ha x 2 L/ha = 200 L", () => {
    expect(calculateTheoreticalQuantity(2, "l_ha", 100)).toEqual({ value: 200, unit: "L" });
  });

  it("100 ha x 150 cc/ha = 15 L", () => {
    expect(calculateTheoreticalQuantity(150, "cc_ha", 100)).toEqual({ value: 15, unit: "L" });
  });

  it("100 ha x 150 ml/ha = 15 L", () => {
    expect(calculateTheoreticalQuantity(150, "ml_ha", 100)).toEqual({ value: 15, unit: "L" });
  });

  it("100 ha x 250 g/ha = 25 kg", () => {
    expect(calculateTheoreticalQuantity(250, "g_ha", 100)).toEqual({ value: 25, unit: "kg" });
  });

  it("100 ha x 2 kg/ha = 200 kg", () => {
    expect(calculateTheoreticalQuantity(2, "kg_ha", 100)).toEqual({ value: 200, unit: "kg" });
  });

  it("handles decimal area and dose", () => {
    // 87.5 ha x 1.5 L/ha = 131.25 L
    expect(calculateTheoreticalQuantity(1.5, "l_ha", 87.5)).toEqual({ value: 131.25, unit: "L" });
  });

  it("handles decimal cc doses without floating-point drift", () => {
    // 33 ha x 150 cc/ha = 4950 cc = 4.95 L (not 4.949999999999999)
    expect(calculateTheoreticalQuantity(150, "cc_ha", 33)).toEqual({ value: 4.95, unit: "L" });
  });

  it("returns 0 for 0 hectares", () => {
    expect(calculateTheoreticalQuantity(2, "l_ha", 0)).toEqual({ value: 0, unit: "L" });
  });
});

describe("calculateSprayVolume", () => {
  it("80 L/ha x 100 ha = 8000 L de caldo", () => {
    expect(calculateSprayVolume(80, 100)).toBe(8000);
  });

  it("handles decimal area", () => {
    expect(calculateSprayVolume(80, 62.5)).toBe(5000);
  });
});

describe("roundTo", () => {
  it("avoids classic floating point artifacts", () => {
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });

  it("rounds to the requested precision", () => {
    expect(roundTo(1.23456, 2)).toBe(1.23);
  });
});
