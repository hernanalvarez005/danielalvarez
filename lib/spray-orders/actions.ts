"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { flattenZodError } from "@/lib/masters/utils";
import { reviewDecisionSchema, sprayOrderConfirmSchema, sprayOrderDraftSchema } from "./schemas";
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

function friendlyReviewError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("El comentario es obligatorio")) return message;
  if (message.includes("not pending review")) {
    return "Esta orden ya no está pendiente de revisión.";
  }
  if (message.includes("Only an observed work order can be resent")) {
    return "Esta orden ya no está observada.";
  }
  if (message.includes("Not authorized")) return "No tenés permisos para esta acción.";
  return fallback;
}

export interface ReviewActionInput {
  workOrderId: string;
  decision: "approved" | "observed";
  notes: string | null;
}

export async function reviewSprayApplication(input: ReviewActionInput): Promise<SprayOrderActionResult> {
  await requireOrgContext();
  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá los datos de la revisión.",
      fieldErrors: flattenZodError(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_spray_application", {
    p_work_order_id: parsed.data.workOrderId,
    p_decision: parsed.data.decision,
    p_notes: parsed.data.notes,
  });

  if (error) {
    return { error: friendlyReviewError(error.message, "No se pudo registrar la revisión.") };
  }

  revalidatePath("/pulverizaciones");
  revalidatePath(`/pulverizaciones/${parsed.data.workOrderId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function resendToReview(workOrderId: string): Promise<{ error: string | null }> {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resend_to_review", { p_work_order_id: workOrderId });

  if (error) {
    return { error: friendlyReviewError(error.message, "No se pudo reenviar la orden a revisión.") };
  }

  revalidatePath("/pulverizaciones");
  revalidatePath(`/pulverizaciones/${workOrderId}`);
  revalidatePath("/mis-trabajos");
  revalidatePath(`/mis-trabajos/${workOrderId}`);
  revalidatePath("/dashboard");
  return { error: null };
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
