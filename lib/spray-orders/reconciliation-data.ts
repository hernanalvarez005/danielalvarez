import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { getWorkOrder } from "./queries";
import { getSprayExecution } from "../spray-executions/queries";
import { buildReconciliationSummary, type ReconciliationSummary } from "./reconciliation";

export interface ReconciliationSettings {
  areaWarningPercent: number | null;
  sprayVolumeWarningPercent: number | null;
  productWarningPercent: number | null;
}

export async function getReconciliationSettings(): Promise<ReconciliationSettings> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spray_reconciliation_settings")
    .select("area_warning_percent, spray_volume_warning_percent, product_warning_percent")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;

  return {
    areaWarningPercent: data?.area_warning_percent ?? null,
    sprayVolumeWarningPercent: data?.spray_volume_warning_percent ?? null,
    productWarningPercent: data?.product_warning_percent ?? null,
  };
}

/**
 * Computed fresh from work_orders/spray_order_products/spray_loads/
 * spray_load_products on every call -- nothing here is persisted, so any
 * screen calling this gets the same numbers. Returns null when there's
 * nothing to reconcile yet (no execution, or it hasn't finished so there
 * is no actual_area_ha).
 */
export async function getWorkOrderReconciliation(workOrderId: string): Promise<ReconciliationSummary | null> {
  const [workOrder, execution, settings] = await Promise.all([
    getWorkOrder(workOrderId),
    getSprayExecution(workOrderId),
    getReconciliationSettings(),
  ]);
  if (!workOrder || !execution || execution.actualAreaHa == null) return null;

  return buildReconciliationSummary({
    plannedAreaHa: workOrder.plannedAreaHa,
    actualAreaHa: execution.actualAreaHa,
    targetVolumePerHa: workOrder.targetSprayVolumePerHa,
    actualTotalLiters: execution.loads.reduce((sum, l) => sum + l.waterLiters, 0),
    recipe: workOrder.products.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      doseValue: p.doseValue,
      doseUnit: p.doseUnit,
    })),
    actualEntries: execution.loads.flatMap((l) =>
      l.products.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantityValue: p.quantityValue,
        quantityUnit: p.quantityUnit,
      })),
    ),
    settings,
  });
}
