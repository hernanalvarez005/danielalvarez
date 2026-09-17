import { describe, expect, it } from "vitest";
import {
  calculateAreaReconciliation,
  calculateSprayVolumeReconciliation,
  calculateProductReconciliation,
  classifyByPercent,
} from "./reconciliation";

describe("calculateAreaReconciliation", () => {
  it("computes difference and percent, plan 100 ha vs real 98 ha", () => {
    const result = calculateAreaReconciliation(100, 98, 5);
    expect(result.differenceHa).toBe(-2);
    expect(result.differencePercent).toBeCloseTo(-2, 6);
    expect(result.classification).toBe("within_tolerance");
  });

  it("classifies outside tolerance when the deviation exceeds the threshold", () => {
    const result = calculateAreaReconciliation(100, 80, 5);
    expect(result.differencePercent).toBeCloseTo(-20, 6);
    expect(result.classification).toBe("review");
  });

  it("handles planned_area_ha = 0 without dividing by zero (CASO 7)", () => {
    const result = calculateAreaReconciliation(0, 10, 5);
    expect(result.differencePercent).toBeNull();
    expect(result.classification).toBe("no_comparison_possible");
  });

  it("returns no_comparison_possible when no tolerance is configured", () => {
    const result = calculateAreaReconciliation(100, 98, null);
    expect(result.classification).toBe("no_comparison_possible");
  });
});

describe("calculateSprayVolumeReconciliation (CASO 8)", () => {
  it("compares 80 L/ha x 98 ha against 8000 L", () => {
    const result = calculateSprayVolumeReconciliation(80, 98, 8000, 5);
    expect(result.expectedTotalLiters).toBe(7840);
    expect(result.differenceLiters).toBe(160);
    expect(result.differencePercent).toBeCloseTo((160 / 7840) * 100, 6);
    expect(result.actualVolumePerHa).toBeCloseTo(8000 / 98, 6);
  });

  it("handles actual_area_ha = 0 without dividing by zero", () => {
    const result = calculateSprayVolumeReconciliation(80, 0, 0, 5);
    expect(result.expectedTotalLiters).toBeNull();
    expect(result.actualVolumePerHa).toBeNull();
    expect(result.classification).toBe("no_comparison_possible");
  });

  it("handles no target volume configured", () => {
    const result = calculateSprayVolumeReconciliation(null, 98, 8000, 5);
    expect(result.expectedTotalLiters).toBeNull();
    expect(result.differenceLiters).toBeNull();
    expect(result.classification).toBe("no_comparison_possible");
  });
});

describe("classifyByPercent", () => {
  it("is within tolerance when the absolute deviation is at or under the threshold", () => {
    expect(classifyByPercent(5, 5)).toBe("within_tolerance");
    expect(classifyByPercent(-5, 5)).toBe("within_tolerance");
  });

  it("flags for review when the deviation exceeds the threshold", () => {
    expect(classifyByPercent(5.01, 5)).toBe("review");
  });

  it("is no_comparison_possible when either input is null", () => {
    expect(classifyByPercent(null, 5)).toBe("no_comparison_possible");
    expect(classifyByPercent(5, null)).toBe("no_comparison_possible");
  });
});

describe("calculateProductReconciliation", () => {
  it("CASO 1: 2 L/ha over 100 ha planned, 98 ha real, 200 L used", () => {
    const [glifosato] = calculateProductReconciliation({
      recipe: [{ productId: "p1", productName: "Glifosato", doseValue: 2, doseUnit: "l_ha" }],
      actualEntries: [{ productId: "p1", productName: "Glifosato", quantityValue: 200, quantityUnit: "l" }],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });

    expect(glifosato.plannedQuantity).toEqual({ value: 200, unit: "L" });
    expect(glifosato.expectedQuantity).toEqual({ value: 196, unit: "L" });
    expect(glifosato.actualQuantity).toEqual({ liters: 200, kg: 0 });
    expect(glifosato.effectiveDosePerHa?.value).toBeCloseTo(200 / 98, 6);
    expect(glifosato.effectiveDosePerHa?.unit).toBe("L");
    expect(glifosato.difference?.value).toBe(4);
    expect(glifosato.difference?.percent).toBeCloseTo((4 / 196) * 100, 6);
    expect(glifosato.status).toBe("compared");
  });

  it("CASO 1b: same case stays within a 5% tolerance", () => {
    const [glifosato] = calculateProductReconciliation({
      recipe: [{ productId: "p1", productName: "Glifosato", doseValue: 2, doseUnit: "l_ha" }],
      actualEntries: [{ productId: "p1", productName: "Glifosato", quantityValue: 200, quantityUnit: "l" }],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });
    // ~+2.04% is within a 5% tolerance
    expect(glifosato.classification).toBe("within_tolerance");
  });

  it("CASO 2: 150 cc/ha recipe, 15 L real over 98 ha", () => {
    const [dicamba] = calculateProductReconciliation({
      recipe: [{ productId: "p2", productName: "Dicamba", doseValue: 150, doseUnit: "cc_ha" }],
      actualEntries: [{ productId: "p2", productName: "Dicamba", quantityValue: 15, quantityUnit: "l" }],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });

    expect(dicamba.expectedQuantity).toEqual({ value: 14.7, unit: "L" });
    expect(dicamba.effectiveDosePerHa?.unit).toBe("L");
    expect(dicamba.effectiveDosePerHa?.value).toBeCloseTo(15 / 98, 6); // ~0.153061 L/ha == ~153.061 cc/ha
  });

  it("CASO 3: product in recipe but never used", () => {
    const [item] = calculateProductReconciliation({
      recipe: [{ productId: "p1", productName: "Glifosato", doseValue: 2, doseUnit: "l_ha" }],
      actualEntries: [],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });
    expect(item.status).toBe("not_used");
    expect(item.classification).toBe("no_comparison_possible");
    expect(item.difference).toBeNull();
  });

  it("CASO 4: product used but not in the recipe", () => {
    const [item] = calculateProductReconciliation({
      recipe: [],
      actualEntries: [{ productId: "extra", productName: "Coadyuvante X", quantityValue: 4, quantityUnit: "l" }],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });
    expect(item.status).toBe("unplanned");
    expect(item.doseValue).toBeNull();
    expect(item.plannedQuantity).toBeNull();
    expect(item.difference).toBeNull();
    expect(item.effectiveDosePerHa?.unit).toBe("L");
    expect(item.effectiveDosePerHa?.value).toBeCloseTo(4 / 98, 6);
  });

  it("CASO 5: mass dose in g/ha compared against kg real usage", () => {
    const [item] = calculateProductReconciliation({
      recipe: [{ productId: "p3", productName: "Fungicida", doseValue: 250, doseUnit: "g_ha" }],
      actualEntries: [{ productId: "p3", productName: "Fungicida", quantityValue: 25, quantityUnit: "kg" }],
      plannedAreaHa: 100,
      actualAreaHa: 100,
      productWarningPercent: 5,
    });
    expect(item.plannedQuantity).toEqual({ value: 25, unit: "kg" });
    expect(item.actualQuantity).toEqual({ liters: 0, kg: 25 });
    expect(item.status).toBe("compared");
    expect(item.difference?.value).toBe(0);
  });

  it("CASO 6: incompatible units -- recipe in L/ha, real recorded in kg", () => {
    const [item] = calculateProductReconciliation({
      recipe: [{ productId: "p1", productName: "Glifosato", doseValue: 2, doseUnit: "l_ha" }],
      actualEntries: [{ productId: "p1", productName: "Glifosato", quantityValue: 5, quantityUnit: "kg" }],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });
    expect(item.status).toBe("incompatible_units");
    expect(item.difference).toBeNull();
    expect(item.classification).toBe("no_comparison_possible");
  });

  it("CASO 7: actual_area_ha = 0 never divides by zero", () => {
    const [item] = calculateProductReconciliation({
      recipe: [{ productId: "p1", productName: "Glifosato", doseValue: 2, doseUnit: "l_ha" }],
      actualEntries: [{ productId: "p1", productName: "Glifosato", quantityValue: 200, quantityUnit: "l" }],
      plannedAreaHa: 100,
      actualAreaHa: 0,
      productWarningPercent: 5,
    });
    expect(item.expectedQuantity).toBeNull();
    expect(item.effectiveDosePerHa).toBeNull();
    expect(item.difference).toBeNull();
  });

  it("flags a product whose real usage mixes both volume and mass as incompatible", () => {
    const [item] = calculateProductReconciliation({
      recipe: [],
      actualEntries: [
        { productId: "extra", productName: "Mezcla rara", quantityValue: 1, quantityUnit: "l" },
        { productId: "extra", productName: "Mezcla rara", quantityValue: 1, quantityUnit: "kg" },
      ],
      plannedAreaHa: 100,
      actualAreaHa: 98,
      productWarningPercent: 5,
    });
    expect(item.status).toBe("incompatible_units");
  });
});
