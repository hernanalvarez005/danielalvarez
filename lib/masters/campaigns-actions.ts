"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { campaignInputSchema, type CampaignInput } from "@/lib/masters/schemas";
import { emptyToNull, flattenZodError } from "@/lib/masters/utils";

export interface CampaignFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  return campaignInputSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
  });
}

function toRow(data: CampaignInput) {
  return { name: data.name, start_date: data.startDate, end_date: data.endDate };
}

export async function createCampaign(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .insert({ organization_id: organizationId, ...toRow(parsed.data) });

  if (error) {
    const message = error.code === "23505" ? "Ya existe una campaña con ese nombre." : "No se pudo crear la campaña.";
    return { error: message };
  }

  revalidatePath("/configuracion");
  return { error: null, success: true };
}

export async function updateCampaign(
  id: string,
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    const message = error.code === "23505" ? "Ya existe una campaña con ese nombre." : "No se pudo guardar.";
    return { error: message };
  }

  revalidatePath("/configuracion");
  return { error: null, success: true };
}

export async function setCampaignActive(id: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/configuracion");
}
