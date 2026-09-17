import { calculateTheoreticalQuantity, calculateSprayVolume, roundTo, DOSE_UNIT_INFO, type CanonicalUnit, type Quantity } from "./calculations";
import { DOSE_UNIT_LABELS, type DoseUnit } from "./constants";
import { sumQuantities, type LoadProductUnit, type QuantityTotals } from "../spray-executions/calculations";

/**
 * Reconciliation compares planning (Phase 3) against real execution
 * (Phase 4) -- it never writes to either. Everything here is a pure
 * function computed from data already in the database; nothing in this
 * module is persisted. See spray_reconciliation_settings for the
 * organization's configured warning thresholds -- these are operational
 * classification cutoffs the UI uses to flag something worth a human
 * look, not an agronomic judgment of correctness.
 */

export type ToleranceClassification = "within_tolerance" | "review" | "no_comparison_possible";

/**
 * `null` differencePercent or `null` warningPercent both mean "can't
 * classify against a threshold" -- either there's nothing sensible to
 * divide by, or the organization hasn't configured a tolerance for this
 * dimension. Both collapse to the same neutral label the UI shows
 * instead of a correct/incorrect judgment.
 */
export function classifyByPercent(
  differencePercent: number | null,
  warningPercent: number | null,
): ToleranceClassification {
  if (differencePercent === null || warningPercent === null) return "no_comparison_possible";
  return Math.abs(differencePercent) <= warningPercent ? "within_tolerance" : "review";
}

// ---------------------------------------------------------------------------
// Area
// ---------------------------------------------------------------------------

export interface AreaReconciliation {
  plannedAreaHa: number;
  actualAreaHa: number;
  differenceHa: number;
  differencePercent: number | null;
  classification: ToleranceClassification;
}

export function calculateAreaReconciliation(
  plannedAreaHa: number,
  actualAreaHa: number,
  areaWarningPercent: number | null,
): AreaReconciliation {
  const differenceHa = roundTo(actualAreaHa - plannedAreaHa);
  const differencePercent = plannedAreaHa > 0 ? roundTo((differenceHa / plannedAreaHa) * 100, 6) : null;
  return {
    plannedAreaHa,
    actualAreaHa,
    differenceHa,
    differencePercent,
    classification: classifyByPercent(differencePercent, areaWarningPercent),
  };
}

// ---------------------------------------------------------------------------
// Spray volume / caldo
// ---------------------------------------------------------------------------

export interface SprayVolumeReconciliation {
  targetVolumePerHa: number | null;
  expectedTotalLiters: number | null;
  actualTotalLiters: number;
  differenceLiters: number | null;
  differencePercent: number | null;
  actualVolumePerHa: number | null;
  classification: ToleranceClassification;
}

export function calculateSprayVolumeReconciliation(
  targetVolumePerHa: number | null,
  actualAreaHa: number,
  actualTotalLiters: number,
  volumeWarningPercent: number | null,
): SprayVolumeReconciliation {
  const expectedTotalLiters =
    targetVolumePerHa != null && actualAreaHa > 0 ? calculateSprayVolume(targetVolumePerHa, actualAreaHa) : null;
  const differenceLiters = expectedTotalLiters != null ? roundTo(actualTotalLiters - expectedTotalLiters) : null;
  const differencePercent =
    expectedTotalLiters != null && expectedTotalLiters > 0 && differenceLiters != null
      ? roundTo((differenceLiters / expectedTotalLiters) * 100, 6)
      : null;
  const actualVolumePerHa = actualAreaHa > 0 ? roundTo(actualTotalLiters / actualAreaHa, 6) : null;

  return {
    targetVolumePerHa,
    expectedTotalLiters,
    actualTotalLiters: roundTo(actualTotalLiters),
    differenceLiters,
    differencePercent,
    actualVolumePerHa,
    classification: classifyByPercent(differencePercent, volumeWarningPercent),
  };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductComparisonStatus = "compared" | "not_used" | "unplanned" | "incompatible_units";

export interface ProductReconciliationItem {
  productId: string;
  productName: string;
  doseValue: number | null;
  doseUnit: DoseUnit | null;
  /** planned_area_ha x dose -- the original plan, never recalculated. */
  plannedQuantity: Quantity | null;
  /** actual_area_ha x dose -- what the same recipe would need for the real surface. */
  expectedQuantity: Quantity | null;
  /** Real quantity summed across every load. Both fields are 0 unless that dimension was actually used. */
  actualQuantity: QuantityTotals;
  effectiveDosePerHa: { value: number; unit: CanonicalUnit } | null;
  difference: { value: number; percent: number | null } | null;
  status: ProductComparisonStatus;
  classification: ToleranceClassification;
}

export interface RecipeLine {
  productId: string;
  productName: string;
  doseValue: number;
  doseUnit: DoseUnit;
}

export interface ActualProductEntry {
  productId: string;
  productName: string;
  quantityValue: number;
  quantityUnit: LoadProductUnit;
}

export interface ProductReconciliationInput {
  recipe: RecipeLine[];
  /** Flattened product lines across every load of the work order. */
  actualEntries: ActualProductEntry[];
  plannedAreaHa: number;
  actualAreaHa: number;
  productWarningPercent: number | null;
}

export function calculateProductReconciliation(input: ProductReconciliationInput): ProductReconciliationItem[] {
  const { recipe, actualEntries, plannedAreaHa, actualAreaHa, productWarningPercent } = input;

  const actualByProduct = new Map<string, { productName: string; entries: { value: number; unit: LoadProductUnit }[] }>();
  for (const entry of actualEntries) {
    const bucket = actualByProduct.get(entry.productId) ?? { productName: entry.productName, entries: [] };
    bucket.entries.push({ value: entry.quantityValue, unit: entry.quantityUnit });
    actualByProduct.set(entry.productId, bucket);
  }

  const results: ProductReconciliationItem[] = [];
  const seen = new Set<string>();

  for (const line of recipe) {
    seen.add(line.productId);
    const plannedQuantity = calculateTheoreticalQuantity(line.doseValue, line.doseUnit, plannedAreaHa);
    const expectedQuantity =
      actualAreaHa > 0 ? calculateTheoreticalQuantity(line.doseValue, line.doseUnit, actualAreaHa) : null;
    const bucket = actualByProduct.get(line.productId);
    const actualQuantity = bucket ? sumQuantities(bucket.entries) : { liters: 0, kg: 0 };

    const recipeKind: CanonicalUnit = plannedQuantity.unit;
    const hasActual = actualQuantity.liters > 0 || actualQuantity.kg > 0;
    const otherKindHasValue = recipeKind === "L" ? actualQuantity.kg > 0 : actualQuantity.liters > 0;

    let status: ProductComparisonStatus;
    let effectiveDosePerHa: { value: number; unit: CanonicalUnit } | null = null;
    let difference: { value: number; percent: number | null } | null = null;
    let classification: ToleranceClassification = "no_comparison_possible";

    if (!hasActual) {
      status = "not_used";
    } else if (otherKindHasValue) {
      // The recipe calls for a volume (or mass) dose but the real usage
      // recorded includes the other dimension -- comparing them would
      // silently divide liters by kilograms. Surface it instead.
      status = "incompatible_units";
    } else {
      status = "compared";
      const actualValue = recipeKind === "L" ? actualQuantity.liters : actualQuantity.kg;
      effectiveDosePerHa = actualAreaHa > 0 ? { value: roundTo(actualValue / actualAreaHa, 6), unit: recipeKind } : null;
      if (expectedQuantity) {
        const diffValue = roundTo(actualValue - expectedQuantity.value);
        const diffPercent = expectedQuantity.value > 0 ? roundTo((diffValue / expectedQuantity.value) * 100, 6) : null;
        difference = { value: diffValue, percent: diffPercent };
        classification = classifyByPercent(diffPercent, productWarningPercent);
      }
    }

    results.push({
      productId: line.productId,
      productName: line.productName,
      doseValue: line.doseValue,
      doseUnit: line.doseUnit,
      plannedQuantity,
      expectedQuantity,
      actualQuantity,
      effectiveDosePerHa,
      difference,
      status,
      classification,
    });
  }

  for (const [productId, bucket] of actualByProduct) {
    if (seen.has(productId)) continue;
    const actualQuantity = sumQuantities(bucket.entries);
    const isMixed = actualQuantity.liters > 0 && actualQuantity.kg > 0;
    const effectiveDosePerHa =
      actualAreaHa > 0 && !isMixed
        ? actualQuantity.liters > 0
          ? { value: roundTo(actualQuantity.liters / actualAreaHa, 6), unit: "L" as CanonicalUnit }
          : { value: roundTo(actualQuantity.kg / actualAreaHa, 6), unit: "kg" as CanonicalUnit }
        : null;

    results.push({
      productId,
      productName: bucket.productName,
      doseValue: null,
      doseUnit: null,
      plannedQuantity: null,
      expectedQuantity: null,
      actualQuantity,
      effectiveDosePerHa,
      difference: null,
      // An unplanned product has no recipe dimension to be "incompatible"
      // with -- but if its own real usage mixes L and kg, that's still
      // worth surfacing as an incidence, not silently ignored.
      status: isMixed ? "incompatible_units" : "unplanned",
      classification: "no_comparison_possible",
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Summary + incidents
// ---------------------------------------------------------------------------

export interface ReconciliationSummary {
  area: AreaReconciliation;
  sprayVolume: SprayVolumeReconciliation;
  products: ProductReconciliationItem[];
  /** Human-readable (Spanish) incidents -- never claims the application "is correct". */
  incidents: string[];
}

export function buildReconciliationSummary(input: {
  plannedAreaHa: number;
  actualAreaHa: number;
  targetVolumePerHa: number | null;
  actualTotalLiters: number;
  recipe: RecipeLine[];
  actualEntries: ActualProductEntry[];
  settings: {
    areaWarningPercent: number | null;
    sprayVolumeWarningPercent: number | null;
    productWarningPercent: number | null;
  };
}): ReconciliationSummary {
  const area = calculateAreaReconciliation(input.plannedAreaHa, input.actualAreaHa, input.settings.areaWarningPercent);
  const sprayVolume = calculateSprayVolumeReconciliation(
    input.targetVolumePerHa,
    input.actualAreaHa,
    input.actualTotalLiters,
    input.settings.sprayVolumeWarningPercent,
  );
  const products = calculateProductReconciliation({
    recipe: input.recipe,
    actualEntries: input.actualEntries,
    plannedAreaHa: input.plannedAreaHa,
    actualAreaHa: input.actualAreaHa,
    productWarningPercent: input.settings.productWarningPercent,
  });

  const incidents: string[] = [];

  if (area.classification === "review" && area.differencePercent != null) {
    incidents.push(`Superficie: ${formatSignedPercent(area.differencePercent)} respecto del plan`);
  }
  if (sprayVolume.classification === "review" && sprayVolume.differencePercent != null) {
    incidents.push(`Caldo: ${formatSignedPercent(sprayVolume.differencePercent)} respecto del objetivo`);
  }
  for (const product of products) {
    if (product.status === "not_used") {
      incidents.push(`${product.productName}: previsto, sin registro de uso`);
    } else if (product.status === "unplanned") {
      incidents.push(`${product.productName}: producto no previsto`);
    } else if (product.status === "incompatible_units") {
      incidents.push(`${product.productName}: unidades incompatibles entre receta y ejecución`);
    } else if (product.classification === "review" && product.difference?.percent != null) {
      incidents.push(`${product.productName}: ${formatSignedPercent(product.difference.percent)} respecto de la dosis indicada`);
    }
  }

  return { area, sprayVolume, products, incidents };
}

// ---------------------------------------------------------------------------
// Formatting -- internal values above are never rounded prematurely;
// everything here is presentation only.
// ---------------------------------------------------------------------------

const PERCENT_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, signDisplay: "exceptZero" });

export function formatSignedPercent(value: number): string {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

const SIGNED_NUMBER_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3, signDisplay: "exceptZero" });

export function formatSignedNumber(value: number): string {
  return SIGNED_NUMBER_FORMATTER.format(value);
}

export function formatSignedQuantity(value: number, unit: CanonicalUnit): string {
  return `${SIGNED_NUMBER_FORMATTER.format(value)} ${unit}`;
}

const DOSE_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });

export function formatDosePerHa(value: number, unit: CanonicalUnit): string {
  return `${DOSE_FORMATTER.format(value)} ${unit}/ha`;
}

/**
 * Shows an effective dose in the recipe's own per-hectare unit (e.g.
 * cc/ha) instead of always collapsing to the canonical L/ha -- "153,1
 * cc/ha" reads naturally to an engineer who dosed in cc; "0,1531 L/ha"
 * doesn't, even though they're the same quantity.
 */
export function formatDoseInRecipeUnit(canonicalValuePerHa: number, doseUnit: DoseUnit): string {
  const displayValue = canonicalValuePerHa * DOSE_UNIT_INFO[doseUnit].divisor;
  return `${DOSE_FORMATTER.format(displayValue)} ${DOSE_UNIT_LABELS[doseUnit]}`;
}

export const CLASSIFICATION_LABELS: Record<ToleranceClassification, string> = {
  within_tolerance: "Dentro de tolerancia",
  review: "Revisar",
  no_comparison_possible: "Sin comparación posible",
};
