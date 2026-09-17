import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import type { LoadProductUnit } from "./calculations";

export interface SprayLoadProductDetail {
  id: string;
  productId: string;
  productName: string;
  quantityValue: number;
  quantityUnit: LoadProductUnit;
  inRecipe: boolean;
}

export interface SprayLoadDetail {
  id: string;
  loadNumber: number;
  waterLiters: number;
  notes: string | null;
  recordedAt: string;
  recordedByName: string | null;
  products: SprayLoadProductDetail[];
}

export interface SprayExecutionDetail {
  workOrderId: string;
  startedAt: string | null;
  startedByName: string | null;
  finishedAt: string | null;
  finishedByName: string | null;
  actualAreaHa: number | null;
  notes: string | null;
  loads: SprayLoadDetail[];
}

/**
 * null means "no execution started yet" (a pending work order never has
 * a spray_executions row -- see the migration comment). Not an error.
 */
export async function getSprayExecution(workOrderId: string): Promise<SprayExecutionDetail | null> {
  await requireOrgContext();
  const supabase = await createClient();

  const { data: execution, error: executionError } = await supabase
    .from("spray_executions")
    .select("started_at, started_by, finished_at, finished_by, actual_area_ha, notes")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  if (executionError) throw executionError;
  if (!execution) return null;

  const { data: loads, error: loadsError } = await supabase
    .from("spray_loads")
    .select("id, load_number, water_liters, notes, recorded_at, recorded_by")
    .eq("work_order_id", workOrderId)
    .order("load_number");
  if (loadsError) throw loadsError;

  const loadIds = (loads ?? []).map((l) => l.id);
  const { data: loadProducts, error: loadProductsError } =
    loadIds.length > 0
      ? await supabase
          .from("spray_load_products")
          .select("id, spray_load_id, product_id, quantity_value, quantity_unit")
          .in("spray_load_id", loadIds)
      : { data: [], error: null };
  if (loadProductsError) throw loadProductsError;

  const { data: recipeLines, error: recipeError } = await supabase
    .from("spray_order_products")
    .select("product_id")
    .eq("work_order_id", workOrderId);
  if (recipeError) throw recipeError;
  const recipeProductIds = new Set((recipeLines ?? []).map((r) => r.product_id));

  const productIds = [...new Set((loadProducts ?? []).map((p) => p.product_id))];
  const { data: products, error: productsError } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [], error: null };
  if (productsError) throw productsError;
  const productNames = new Map((products ?? []).map((p) => [p.id, p.name]));

  const userIds = [
    ...new Set(
      [execution.started_by, execution.finished_by, ...(loads ?? []).map((l) => l.recorded_by)].filter(
        (id): id is string => id !== null,
      ),
    ),
  ];
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const productsByLoad = new Map<string, SprayLoadProductDetail[]>();
  for (const lp of loadProducts ?? []) {
    const list = productsByLoad.get(lp.spray_load_id) ?? [];
    list.push({
      id: lp.id,
      productId: lp.product_id,
      productName: productNames.get(lp.product_id) ?? "-",
      quantityValue: lp.quantity_value,
      quantityUnit: lp.quantity_unit as LoadProductUnit,
      inRecipe: recipeProductIds.has(lp.product_id),
    });
    productsByLoad.set(lp.spray_load_id, list);
  }

  return {
    workOrderId,
    startedAt: execution.started_at,
    startedByName: execution.started_by ? (profileNames.get(execution.started_by) ?? "Usuario") : null,
    finishedAt: execution.finished_at,
    finishedByName: execution.finished_by ? (profileNames.get(execution.finished_by) ?? "Usuario") : null,
    actualAreaHa: execution.actual_area_ha,
    notes: execution.notes,
    loads: (loads ?? []).map((l) => ({
      id: l.id,
      loadNumber: l.load_number,
      waterLiters: l.water_liters,
      notes: l.notes,
      recordedAt: l.recorded_at,
      recordedByName: l.recorded_by ? (profileNames.get(l.recorded_by) ?? "Usuario") : null,
      products: productsByLoad.get(l.id) ?? [],
    })),
  };
}
