import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import type { ProductUnit } from "@/lib/masters/schemas";

export interface NamedOption {
  id: string;
  name: string;
}

export interface FieldOption extends NamedOption {
  customerId: string;
}

export interface PlotOption extends NamedOption {
  fieldId: string;
  areaHa: number | null;
}

export interface ProductOption extends NamedOption {
  defaultUnit: ProductUnit;
}

export interface SprayOrderFormOptions {
  customers: NamedOption[];
  fields: FieldOption[];
  plots: PlotOption[];
  campaigns: NamedOption[];
  crops: NamedOption[];
  applicators: NamedOption[];
  products: ProductOption[];
}

/**
 * Everything the create/edit form's cascading selects need, fetched once
 * up front rather than round-tripping to the server as the user picks a
 * customer/field -- reference data at this scale (one contractor's own
 * org) is small enough that client-side cascading filtering is simpler
 * and faster than a request per step.
 */
export async function getSprayOrderFormOptions(): Promise<SprayOrderFormOptions> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const [customers, fields, plots, campaigns, crops, applicators, products] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("fields")
      .select("id, name, customer_id")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("plots")
      .select("id, name, field_id, area_ha")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name", { ascending: false }),
    supabase
      .from("crops")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("applicators")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("products")
      .select("id, name, default_unit")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
  ]);

  for (const result of [customers, fields, plots, campaigns, crops, applicators, products]) {
    if (result.error) throw result.error;
  }

  return {
    customers: customers.data ?? [],
    fields: (fields.data ?? []).map((f) => ({ id: f.id, name: f.name, customerId: f.customer_id })),
    plots: (plots.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      fieldId: p.field_id,
      areaHa: p.area_ha,
    })),
    campaigns: campaigns.data ?? [],
    crops: crops.data ?? [],
    applicators: applicators.data ?? [],
    products: (products.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      defaultUnit: p.default_unit as ProductUnit,
    })),
  };
}
