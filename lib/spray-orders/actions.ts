"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { flattenZodError } from "@/lib/masters/utils";
import { sprayOrderConfirmSchema, sprayOrderDraftSchema } from "./schemas";
import type { ApplicationMethod, DoseUnit } from "./constants";

export interface SprayOrderActionInput {
  customerId: string;
  fieldId: string;
  plotId: string;
  campaignId: string | null;
  cropId: string | null;
  applicatorId: string | null;
  scheduledDate: string | null;
  plannedAreaHa: number;
  applicationMethod: ApplicationMethod;
  targetSprayVolumePerHa: number | null;
  notes: string | null;
  products: { productId: string; doseValue: number; doseUnit: DoseUnit }[];
  intent: "draft" | "confirm";
}

export interface SprayOrderActionResult {
  error: string | null;
  fieldErrors?: Record<string, string>;
  workOrderId?: string;
}

function toRpcProducts(products: SprayOrderActionInput["products"]) {
  return products.map((p, index) => ({
    product_id: p.productId,
    dose_value: p.doseValue,
    dose_unit: p.doseUnit,
    sort_order: index,
  }));
}

function validate(input: SprayOrderActionInput): SprayOrderActionResult | null {
  const schema = input.intent === "confirm" ? sprayOrderConfirmSchema : sprayOrderDraftSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá los datos de la orden.",
      fieldErrors: flattenZodError(parsed.error),
    };
  }
  return null;
}

export async function createSprayOrder(input: SprayOrderActionInput): Promise<SprayOrderActionResult> {
  await requireOrgContext();
  const validationError = validate(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_spray_work_order", {
    p_customer_id: input.customerId,
    p_field_id: input.fieldId,
    p_plot_id: input.plotId,
    p_campaign_id: input.campaignId,
    p_crop_id: input.cropId,
    p_applicator_id: input.applicatorId,
    p_scheduled_date: input.scheduledDate,
    p_planned_area_ha: input.plannedAreaHa,
    p_notes: input.notes,
    p_status: input.intent === "confirm" ? "pending" : "draft",
    p_application_method: input.applicationMethod,
    p_target_spray_volume_per_ha: input.targetSprayVolumePerHa,
    p_products: toRpcProducts(input.products),
  });

  if (error) {
    return { error: "No se pudo crear la orden. Verificá tus permisos y los datos ingresados." };
  }

  revalidatePath("/pulverizaciones");
  return { error: null, workOrderId: data as string };
}

export async function updateSprayOrder(
  workOrderId: string,
  input: SprayOrderActionInput,
): Promise<SprayOrderActionResult> {
  await requireOrgContext();
  const validationError = validate(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_spray_work_order", {
    p_work_order_id: workOrderId,
    p_customer_id: input.customerId,
    p_field_id: input.fieldId,
    p_plot_id: input.plotId,
    p_campaign_id: input.campaignId,
    p_crop_id: input.cropId,
    p_applicator_id: input.applicatorId,
    p_scheduled_date: input.scheduledDate,
    p_planned_area_ha: input.plannedAreaHa,
    p_notes: input.notes,
    p_status: input.intent === "confirm" ? "pending" : "draft",
    p_application_method: input.applicationMethod,
    p_target_spray_volume_per_ha: input.targetSprayVolumePerHa,
    p_products: toRpcProducts(input.products),
  });

  if (error) {
    return { error: "No se pudo guardar la orden. Verificá tus permisos y los datos ingresados." };
  }

  revalidatePath("/pulverizaciones");
  revalidatePath(`/pulverizaciones/${workOrderId}`);
  return { error: null, workOrderId: data as string };
}

export async function cancelWorkOrder(id: string): Promise<{ error: string | null }> {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "pending"]);

  if (error) {
    return { error: "No se pudo cancelar la orden. Verificá tus permisos." };
  }

  revalidatePath("/pulverizaciones");
  revalidatePath(`/pulverizaciones/${id}`);
  return { error: null };
}
