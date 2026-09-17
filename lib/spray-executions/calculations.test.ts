import { describe, expect, it } from "vitest";
import {
  normalizeQuantity,
  sumQuantities,
  formatQuantityTotals,
  suggestLoadProductQuantity,
  groupProductTotals,
} from "./calculations";

describe("normalizeQuantity", () => {
  it("keeps liters as liters", () => {
    expect(normalizeQuantity(2, "l")).toEqual({ value: 2, unit: "L" });
  });

  it("converts ml to liters", () => {
    expect(normalizeQuantity(500, "ml")).toEqual({ value: 0.5, unit: "L" });
  });

  it("treats cc as volumetrically equivalent to ml", () => {
    expect(normalizeQuantity(500, "cc")).toEqual({ value: 0.5, unit: "L" });
  });

  it("keeps kg as kg", () => {
    expect(normalizeQuantity(1.5, "kg")).toEqual({ value: 1.5, unit: "kg" });
  });

  it("converts g to kg", () => {
    expect(normalizeQuantity(500, "g")).toEqual({ value: 0.5, unit: "kg" });
  });
});

describe("sumQuantities", () => {
  it("sums 1 L + 500 ml = 1.5 L", () => {
    expect(sumQuantities([{ value: 1, unit: "l" }, { value: 500, unit: "ml" }])).toEqual({
      liters: 1.5,
      kg: 0,
    });
  });

  it("sums 1 L + 500 cc = 1.5 L (cc treated as volumetric ml)", () => {
    expect(sumQuantities([{ value: 1, unit: "l" }, { value: 500, unit: "cc" }])).toEqual({
      liters: 1.5,
      kg: 0,
    });
  });

  it("sums 1 kg + 500 g = 1.5 kg", () => {
    expect(sumQuantities([{ value: 1, unit: "kg" }, { value: 500, unit: "g" }])).toEqual({
      liters: 0,
      kg: 1.5,
    });
  });

  it("never mixes mass and volume for the same product", () => {
    expect(sumQuantities([{ value: 1, unit: "l" }, { value: 1, unit: "kg" }])).toEqual({
      liters: 1,
      kg: 1,
    });
  });

  it("handles decimals across multiple loads without float drift", () => {
    const entries = [
      { value: 50, unit: "l" as const },
      { value: 50, unit: "l" as const },
      { value: 50, unit: "l" as const },
    ];
    expect(sumQuantities(entries)).toEqual({ liters: 150, kg: 0 });
  });

  it("sums many small ml entries without accumulating float error", () => {
    const entries = Array.from({ length: 10 }, () => ({ value: 333, unit: "ml" as const }));
    expect(sumQuantities(entries)).toEqual({ liters: 3.33, kg: 0 });
  });
});

describe("formatQuantityTotals", () => {
  it("formats a volume-only total", () => {
    expect(formatQuantityTotals({ liters: 200, kg: 0 })).toBe("200 L");
  });

  it("formats a mass-only total", () => {
    expect(formatQuantityTotals({ liters: 0, kg: 25 })).toBe("25 kg");
  });

  it("formats a mixed total for the rare case both occur", () => {
    expect(formatQuantityTotals({ liters: 10, kg: 5 })).toBe("10 L + 5 kg");
  });

  it("formats zero as a plain 0", () => {
    expect(formatQuantityTotals({ liters: 0, kg: 0 })).toBe("0");
  });
});

describe("suggestLoadProductQuantity", () => {
  it("suggests a quantity based on estimated coverage from water volume", () => {
    // target 80 L/ha, load 2000 L -> covers 25 ha; dose 2 L/ha -> 50 L suggested
    const result = suggestLoadProductQuantity(2000, 80, 2, "l_ha");
    expect(result).toEqual({ estimatedCoverageHa: 25, suggested: { value: 50, unit: "L" } });
  });

  it("suggests a mass quantity for a g/ha dose", () => {
    // target 80 L/ha, load 2000 L -> covers 25 ha; dose 150 g/ha -> 3.75 kg suggested
    const result = suggestLoadProductQuantity(2000, 80, 150, "g_ha");
    expect(result).toEqual({ estimatedCoverageHa: 25, suggested: { value: 3.75, unit: "kg" } });
  });

  it("returns null when there is no target spray volume", () => {
    expect(suggestLoadProductQuantity(2000, null, 2, "l_ha")).toBeNull();
  });

  it("returns null when there is no water yet", () => {
    expect(suggestLoadProductQuantity(0, 80, 2, "l_ha")).toBeNull();
  });
});

describe("groupProductTotals", () => {
  it("sums the same product across multiple loads, mixing units", () => {
    const totals = groupProductTotals([
      { productName: "Glifosato", value: 50, unit: "l" },
      { productName: "Glifosato", value: 50, unit: "l" },
      { productName: "Glifosato", value: 500, unit: "ml" },
    ]);
    expect(totals).toEqual([{ productName: "Glifosato", totals: { liters: 100.5, kg: 0 } }]);
  });

  it("keeps different products separate", () => {
    const totals = groupProductTotals([
      { productName: "Glifosato", value: 50, unit: "l" },
      { productName: "Dicamba", value: 15, unit: "kg" },
    ]);
    expect(totals).toEqual([
      { productName: "Glifosato", totals: { liters: 50, kg: 0 } },
      { productName: "Dicamba", totals: { liters: 0, kg: 15 } },
    ]);
  });

  it("returns an empty list for no entries", () => {
    expect(groupProductTotals([])).toEqual([]);
  });
});
