"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { flattenZodError } from "@/lib/masters/utils";
import {
  finishApplicationSchema,
  registerSprayLoadSchema,
  updateSprayLoadSchema,
  type FinishApplicationInput,
  type RegisterSprayLoadInput,
  type UpdateSprayLoadInput,
} from "./schemas";
import type { SprayLoadProductFormValue } from "./schemas";

export interface ExecutionActionResult {
  error: string | null;
  fieldErrors?: Record<string, string>;
}

function friendlyError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("Debe registrar al menos una carga")) return message;
  if (message.includes("actual_area_ha must be greater than 0")) {
    return "La superficie realizada tiene que ser mayor a 0.";
  }
  if (message.includes("Only a pending work order can be started")) {
    return "Esta orden ya no está pendiente de iniciar (puede que ya haya sido iniciada, finalizada o cancelada).";
  }
  if (message.includes("Only a work order in progress can be finished")) {
    return "Esta orden ya no está en ejecución.";
  }
  if (message.includes("Not authorized")) {
    return "No tenés permisos para esta acción.";
  }
  if (message.includes("solo se pueden corregir con la aplicación en estado observada")) {
    return message;
  }
  return fallback;
}

function toRpcProducts(products: SprayLoadProductFormValue[]) {
  return products.map((p) => ({
    product_id: p.productId,
    quantity_value: p.quantityValue,
    quantity_unit: p.quantityUnit,
  }));
}

function revalidateWorkOrder(workOrderId: string) {
  revalidatePath("/mis-trabajos");
  revalidatePath(`/mis-trabajos/${workOrderId}`);
  revalidatePath("/pulverizaciones");
  revalidatePath(`/pulverizaciones/${workOrderId}`);
}

export async function startSprayApplication(
  workOrderId: string,
): Promise<ExecutionActionResult> {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_spray_application", { p_work_order_id: workOrderId });

  if (error) {
    return { error: friendlyError(error.message, "No se pudo iniciar la aplicación.") };
  }

  revalidateWorkOrder(workOrderId);
  return { error: null };
}

export async function finishSprayApplication(
  input: FinishApplicationInput,
): Promise<ExecutionActionResult> {
  await requireOrgContext();
  const parsed = finishApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá los datos de finalización.",
      fieldErrors: flattenZodError(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_spray_application", {
    p_work_order_id: parsed.data.workOrderId,
    p_actual_area_ha: parsed.data.actualAreaHa,
    p_notes: parsed.data.notes,
  });

  if (error) {
    return { error: friendlyError(error.message, "No se pudo finalizar la aplicación.") };
  }

  revalidateWorkOrder(parsed.data.workOrderId);
  return { error: null };
}

export interface RegisterSprayLoadResult extends ExecutionActionResult {
  loadId?: string;
}

export async function registerSprayLoad(
  input: RegisterSprayLoadInput,
): Promise<RegisterSprayLoadResult> {
  await requireOrgContext();
  const parsed = registerSprayLoadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá los datos de la carga.",
      fieldErrors: flattenZodError(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_spray_load", {
    p_work_order_id: parsed.data.workOrderId,
    p_client_request_id: parsed.data.clientRequestId,
    p_water_liters: parsed.data.waterLiters,
    p_notes: parsed.data.notes,
    p_products: toRpcProducts(parsed.data.products),
  });

  if (error) {
    return { error: friendlyError(error.message, "No se pudo guardar la carga. Podés reintentar.") };
  }

  revalidateWorkOrder(parsed.data.workOrderId);
  return { error: null, loadId: data as string };
}

export async function updateSprayLoad(
  workOrderId: string,
  input: UpdateSprayLoadInput,
): Promise<ExecutionActionResult> {
  await requireOrgContext();
  const parsed = updateSprayLoadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá los datos de la carga.",
      fieldErrors: flattenZodError(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_spray_load", {
    p_spray_load_id: parsed.data.loadId,
    p_water_liters: parsed.data.waterLiters,
    p_notes: parsed.data.notes,
    p_products: toRpcProducts(parsed.data.products),
  });

  if (error) {
    return { error: friendlyError(error.message, "No se pudo guardar los cambios de la carga.") };
  }

  revalidateWorkOrder(workOrderId);
  return { error: null };
}

export async function deleteSprayLoad(
  workOrderId: string,
  loadId: string,
): Promise<ExecutionActionResult> {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_spray_load", { p_spray_load_id: loadId });

  if (error) {
    return { error: friendlyError(error.message, "No se pudo eliminar la carga.") };
  }

  revalidateWorkOrder(workOrderId);
  return { error: null };
}

export interface CorrectExecutionSummaryInput {
  workOrderId: string;
  actualAreaHa: number;
  notes: string | null;
}

export async function correctExecutionSummary(
  input: CorrectExecutionSummaryInput,
): Promise<ExecutionActionResult> {
  await requireOrgContext();
  const parsed = finishApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá la superficie realizada.",
      fieldErrors: flattenZodError(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_spray_execution_summary", {
    p_work_order_id: parsed.data.workOrderId,
    p_actual_area_ha: parsed.data.actualAreaHa,
    p_notes: parsed.data.notes,
  });

  if (error) {
    return { error: friendlyError(error.message, "No se pudo corregir la superficie realizada.") };
  }

  revalidateWorkOrder(parsed.data.workOrderId);
  return { error: null };
}
