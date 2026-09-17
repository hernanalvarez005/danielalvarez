import { DOSE_UNITS, type DoseUnit } from "./constants";

export type CanonicalUnit = "L" | "kg";

const DOSE_UNIT_INFO: Record<DoseUnit, { canonicalUnit: CanonicalUnit; divisor: number }> = {
  l_ha: { canonicalUnit: "L", divisor: 1 },
  ml_ha: { canonicalUnit: "L", divisor: 1000 },
  cc_ha: { canonicalUnit: "L", divisor: 1000 },
  kg_ha: { canonicalUnit: "kg", divisor: 1 },
  g_ha: { canonicalUnit: "kg", divisor: 1000 },
};

/** Rounds to `decimals` places, avoiding stray floating-point artifacts like 14.999999999998. */
export function roundTo(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export interface Quantity {
  value: number;
  unit: CanonicalUnit;
}

/**
 * Theoretical quantity of a product needed for a recipe line:
 * dose (per hectare, in whatever unit the recipe uses) × planned area,
 * normalized to liters (for volume doses) or kilograms (for mass doses).
 *
 * 100 ha × 2 L/ha    -> 200 L
 * 100 ha × 150 cc/ha -> 15 L
 * 100 ha × 250 g/ha  -> 25 kg
 */
export function calculateTheoreticalQuantity(
  doseValue: number,
  doseUnit: DoseUnit,
  areaHa: number,
): Quantity {
  const info = DOSE_UNIT_INFO[doseUnit];
  const raw = doseValue * areaHa;
  return { value: roundTo(raw / info.divisor), unit: info.canonicalUnit };
}

/** Total target caldo (spray mix) volume: target L/ha × planned area, in liters. */
export function calculateSprayVolume(targetVolumePerHa: number, areaHa: number): number {
  return roundTo(targetVolumePerHa * areaHa);
}

const QUANTITY_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });

export function formatQuantity(quantity: Quantity): string {
  return `${QUANTITY_FORMATTER.format(quantity.value)} ${quantity.unit}`;
}

export function formatLiters(value: number): string {
  return `${QUANTITY_FORMATTER.format(roundTo(value))} L`;
}

export function isValidDoseUnit(value: string): value is DoseUnit {
  return (DOSE_UNITS as readonly string[]).includes(value);
}
