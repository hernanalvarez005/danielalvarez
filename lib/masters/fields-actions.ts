"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { fieldInputSchema, type FieldInput } from "@/lib/masters/schemas";
import { emptyToNull, flattenZodError } from "@/lib/masters/utils";

export interface FieldFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return fieldInputSchema.safeParse({
    customerId: String(formData.get("customerId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    locality: emptyToNull(formData.get("locality")),
    province: emptyToNull(formData.get("province")),
    notes: emptyToNull(formData.get("notes")),
  });
}

function toRow(data: FieldInput) {
  return {
    customer_id: data.customerId,
    name: data.name,
    locality: data.locality,
    province: data.province,
    notes: data.notes,
  };
}

export async function createField(
  _prevState: FieldFormState,
  formData: FormData,
): Promise<FieldFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fields")
    .insert({ organization_id: organizationId, ...toRow(parsed.data) })
    .select("id")
    .single();

  if (error) {
    return { error: "No se pudo crear el campo. Verificá tus permisos." };
  }

  revalidatePath("/campos");
  revalidatePath(`/clientes/${parsed.data.customerId}`);
  redirect(`/campos/${data.id}`);
}

export async function updateField(
  id: string,
  _prevState: FieldFormState,
  formData: FormData,
): Promise<FieldFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("fields").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    return { error: "No se pudo guardar. Verificá tus permisos." };
  }

  revalidatePath("/campos");
  revalidatePath(`/campos/${id}`);
  revalidatePath(`/clientes/${parsed.data.customerId}`);
  redirect(`/campos/${id}`);
}

export async function setFieldActive(id: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("fields").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/campos");
  revalidatePath(`/campos/${id}`);
}
