"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { productInputSchema, type ProductInput } from "@/lib/masters/schemas";
import { emptyToNull, flattenZodError } from "@/lib/masters/utils";

export interface ProductFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  return productInputSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    defaultUnit: String(formData.get("defaultUnit") ?? ""),
    notes: emptyToNull(formData.get("notes")),
  });
}

function toRow(data: ProductInput) {
  return { name: data.name, default_unit: data.defaultUnit, notes: data.notes };
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { organizationId } = await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .insert({ organization_id: organizationId, ...toRow(parsed.data) });

  if (error) {
    const message = error.code === "23505" ? "Ya existe un producto con ese nombre." : "No se pudo crear el producto.";
    return { error: message };
  }

  revalidatePath("/productos");
  return { error: null, success: true };
}

export async function updateProduct(
  id: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireOrgContext();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Revisá los datos del formulario.", fieldErrors: flattenZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    const message = error.code === "23505" ? "Ya existe un producto con ese nombre." : "No se pudo guardar.";
    return { error: message };
  }

  revalidatePath("/productos");
  return { error: null, success: true };
}

export async function setProductActive(id: string, active: boolean) {
  await requireOrgContext();
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/productos");
}
