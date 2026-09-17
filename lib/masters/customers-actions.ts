"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { customerInputSchema, type CustomerInput } from "@/lib/masters/schemas";
import { emptyToNull, flattenZodError } from "@/lib/masters/utils";

export interface CustomerFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return customerInputSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    legalName: emptyToNull(formData.get("legalName")),
    taxId: emptyToNull(formData.get("taxId")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    notes: emptyToNull(formData.get("notes")),
  });
}

function toRow(data: CustomerInput) {
  return {
    name: data.name,
    legal_name: data.legalName,
    tax_id: data.taxId,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
  };
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: organizationId, ...toRow(parsed.data) })
    .select("id")
    .single();

  if (error) {
    return { error: "No se pudo crear el cliente. Verificá tus permisos." };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateCustomer(
  id: string,
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    return { error: "No se pudo guardar. Verificá tus permisos." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function setCustomerActive(id: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}
