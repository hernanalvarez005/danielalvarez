"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { cropInputSchema } from "@/lib/masters/schemas";
import { flattenZodError } from "@/lib/masters/utils";

export interface CropFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  return cropInputSchema.safeParse({ name: String(formData.get("name") ?? "").trim() });
}

export async function createCrop(
  _prevState: CropFormState,
  formData: FormData,
): Promise<CropFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crops")
    .insert({ organization_id: organizationId, name: parsed.data.name });

  if (error) {
    const message = error.code === "23505" ? "Ya existe un cultivo con ese nombre." : "No se pudo crear el cultivo.";
    return { error: message };
  }

  revalidatePath("/configuracion");
  return { error: null, success: true };
}

export async function updateCrop(
  id: string,
  _prevState: CropFormState,
  formData: FormData,
): Promise<CropFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crops").update({ name: parsed.data.name }).eq("id", id);

  if (error) {
    const message = error.code === "23505" ? "Ya existe un cultivo con ese nombre." : "No se pudo guardar.";
    return { error: message };
  }

  revalidatePath("/configuracion");
  return { error: null, success: true };
}

export async function setCropActive(id: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("crops").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/configuracion");
}
