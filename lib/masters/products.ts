import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import type { ProductUnit } from "@/lib/masters/schemas";

export interface ProductItem {
  id: string;
  name: string;
  defaultUnit: ProductUnit;
  notes: string | null;
  active: boolean;
}

export async function listProducts(): Promise<ProductItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, default_unit, notes, active")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    defaultUnit: p.default_unit as ProductUnit,
    notes: p.notes,
    active: p.active,
  }));
}
