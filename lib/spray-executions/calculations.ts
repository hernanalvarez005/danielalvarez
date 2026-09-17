import { calculateTheoreticalQuantity, roundTo, type CanonicalUnit } from "../spray-orders/calculations";
import type { DoseUnit } from "../spray-orders/constants";

export const LOAD_PRODUCT_UNITS = ["l", "ml", "cc", "kg", "g"] as const;
export type LoadProductUnit = (typeof LOAD_PRODUCT_UNITS)[number];

export const LOAD_PRODUCT_UNIT_LABELS: Record<LoadProductUnit, string> = {
  l: "L",
  ml: "ml",
  cc: "cc",
  kg: "kg",
  g: "g",
};

interface UnitInfo {
  canonicalUnit: CanonicalUnit;
  divisor: number;
}

const LOAD_UNIT_INFO: Record<LoadProductUnit, UnitInfo> = {
  l: { canonicalUnit: "L", divisor: 1 },
  ml: { canonicalUnit: "L", divisor: 1000 },
  cc: { canonicalUnit: "L", divisor: 1000 },
  kg: { canonicalUnit: "kg", divisor: 1 },
  g: { canonicalUnit: "kg", divisor: 1000 },
};

export interface NormalizedQuantity {
  value: number;
  unit: CanonicalUnit;
}

/** Volume (l/ml/cc) normalizes to liters; mass (kg/g) to kilograms. Never mixed. */
export function normalizeQuantity(value: number, unit: LoadProductUnit): NormalizedQuantity {
  const info = LOAD_UNIT_INFO[unit];
  return { value: roundTo(value / info.divisor), unit: info.canonicalUnit };
}

export interface QuantityTotals {
  liters: number;
  kg: number;
}

/**
 * Sums real quantities of the same product across loads. Volume and mass
 * totals are kept separate -- a product is never converted between them.
 *
 * 1 L + 500 ml   -> { liters: 1.5, kg: 0 }
 * 1 kg + 500 g   -> { liters: 0, kg: 1.5 }
 */
export function sumQuantities(entries: { value: number; unit: LoadProductUnit }[]): QuantityTotals {
  let liters = 0;
  let kg = 0;
  for (const entry of entries) {
    const normalized = normalizeQuantity(entry.value, entry.unit);
    if (normalized.unit === "L") liters += normalized.value;
    else kg += normalized.value;
  }
  return { liters: roundTo(liters), kg: roundTo(kg) };
}

const QUANTITY_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });

export function formatQuantityTotals(totals: QuantityTotals): string {
  const parts: string[] = [];
  if (totals.liters > 0) parts.push(`${QUANTITY_FORMATTER.format(totals.liters)} L`);
  if (totals.kg > 0) parts.push(`${QUANTITY_FORMATTER.format(totals.kg)} kg`);
  return parts.length > 0 ? parts.join(" + ") : "0";
}

export function formatLoadQuantity(value: number, unit: LoadProductUnit): string {
  return `${QUANTITY_FORMATTER.format(value)} ${LOAD_PRODUCT_UNIT_LABELS[unit]}`;
}

export interface LoadProductSuggestion {
  estimatedCoverageHa: number;
  suggested: NormalizedQuantity;
}

/**
 * Estimates the hectares a tank load covers (waterLiters / target L/ha)
 * and, from that, the quantity a recipe dose would imply for that
 * coverage. This is a suggestion the operator sees and can override --
 * never written as a recorded value on its own.
 */
export function suggestLoadProductQuantity(
  waterLiters: number,
  targetSprayVolumePerHa: number | null,
  doseValue: number,
  doseUnit: DoseUnit,
): LoadProductSuggestion | null {
  if (!targetSprayVolumePerHa || targetSprayVolumePerHa <= 0 || waterLiters <= 0) return null;
  const estimatedCoverageHa = roundTo(waterLiters / targetSprayVolumePerHa);
  const quantity = calculateTheoreticalQuantity(doseValue, doseUnit, estimatedCoverageHa);
  return { estimatedCoverageHa, suggested: quantity };
}

/** Groups raw quantities by product name and sums each group -- used to show accumulated real totals across every load of a work order. */
export function groupProductTotals(
  entries: { productName: string; value: number; unit: LoadProductUnit }[],
): { productName: string; totals: QuantityTotals }[] {
  const map = new Map<string, { value: number; unit: LoadProductUnit }[]>();
  for (const entry of entries) {
    const list = map.get(entry.productName) ?? [];
    list.push({ value: entry.value, unit: entry.unit });
    map.set(entry.productName, list);
  }
  return [...map.entries()].map(([productName, values]) => ({ productName, totals: sumQuantities(values) }));
}

export function isValidLoadProductUnit(value: string): value is LoadProductUnit {
  return (LOAD_PRODUCT_UNITS as readonly string[]).includes(value);
}
