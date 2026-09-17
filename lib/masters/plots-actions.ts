"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { plotInputSchema, type PlotInput } from "@/lib/masters/schemas";
import { emptyToNull, flattenZodError } from "@/lib/masters/utils";

export interface PlotFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  return plotInputSchema.safeParse({
    fieldId: String(formData.get("fieldId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    areaHa: emptyToNull(formData.get("areaHa")),
    notes: emptyToNull(formData.get("notes")),
  });
}

function toRow(data: PlotInput) {
  return {
    field_id: data.fieldId,
    name: data.name,
    area_ha: data.areaHa,
    notes: data.notes,
  };
}

export async function createPlot(
  _prevState: PlotFormState,
  formData: FormData,
): Promise<PlotFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plots")
    .insert({ organization_id: organizationId, ...toRow(parsed.data) });

  if (error) {
    return { error: "No se pudo crear el lote. Verificá tus permisos." };
  }

  revalidatePath(`/campos/${parsed.data.fieldId}`);
  revalidatePath("/campos");
  return { error: null, success: true };
}

export async function updatePlot(
  id: string,
  _prevState: PlotFormState,
  formData: FormData,
): Promise<PlotFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("plots").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    return { error: "No se pudo guardar. Verificá tus permisos." };
  }

  revalidatePath(`/campos/${parsed.data.fieldId}`);
  revalidatePath("/campos");
  return { error: null, success: true };
}

export async function setPlotActive(id: string, fieldId: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("plots").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/campos/${fieldId}`);
  revalidatePath("/campos");
}
