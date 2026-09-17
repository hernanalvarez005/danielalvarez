"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { applicatorInputSchema, type ApplicatorInput } from "@/lib/masters/schemas";
import { emptyToNull, flattenZodError } from "@/lib/masters/utils";

const NONE_VALUE = "__none__";

function parseProfileId(formData: FormData): string | null {
  const raw = emptyToNull(formData.get("profileId"));
  return raw && raw !== NONE_VALUE ? raw : null;
}

export interface ApplicatorFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  return applicatorInputSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    phone: emptyToNull(formData.get("phone")),
  });
}

function toRow(data: ApplicatorInput) {
  return { name: data.name, phone: data.phone };
}

export async function createApplicator(
  _prevState: ApplicatorFormState,
  formData: FormData,
): Promise<ApplicatorFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }
  const profileId = parseProfileId(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("applicators")
    .insert({ organization_id: organizationId, profile_id: profileId, ...toRow(parsed.data) });

  if (error) {
    return { error: "No se pudo crear el aplicador. Verificá tus permisos." };
  }

  revalidatePath("/aplicadores");
  return { error: null, success: true };
}

export async function updateApplicator(
  id: string,
  _prevState: ApplicatorFormState,
  formData: FormData,
): Promise<ApplicatorFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }
  const profileId = parseProfileId(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("applicators")
    .update({ profile_id: profileId, ...toRow(parsed.data) })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar. Verificá tus permisos." };
  }

  revalidatePath("/aplicadores");
  return { error: null, success: true };
}

export async function setApplicatorActive(id: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("applicators").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/aplicadores");
}
