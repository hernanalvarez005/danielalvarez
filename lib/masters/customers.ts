import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";

export interface CustomerListItem {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  fieldsCount: number;
}

export async function listCustomers(): Promise<CustomerListItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const [{ data: customers, error }, { data: fields, error: fieldsError }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, legal_name, tax_id, phone, email, active")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase.from("fields").select("customer_id").eq("organization_id", organizationId),
  ]);
  if (error) throw error;
  if (fieldsError) throw fieldsError;

  const counts = new Map<string, number>();
  for (const f of fields ?? []) {
    counts.set(f.customer_id, (counts.get(f.customer_id) ?? 0) + 1);
  }

  return (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    legalName: c.legal_name,
    taxId: c.tax_id,
    phone: c.phone,
    email: c.email,
    active: c.active,
    fieldsCount: counts.get(c.id) ?? 0,
  }));
}

export interface CustomerDetail {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, legal_name, tax_id, phone, email, notes, active")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    legalName: data.legal_name,
    taxId: data.tax_id,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    active: data.active,
  };
}

export interface CustomerFieldItem {
  id: string;
  name: string;
  locality: string | null;
  active: boolean;
  plotsCount: number;
  totalAreaHa: number | null;
}

export async function listCustomerFields(customerId: string): Promise<CustomerFieldItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const { data: fields, error } = await supabase
    .from("fields")
    .select("id, name, locality, active")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .order("name");
  if (error) throw error;

  const fieldIds = (fields ?? []).map((f) => f.id);
  let plots: { field_id: string; active: boolean; area_ha: number | null }[] = [];
  if (fieldIds.length > 0) {
    const { data, error: plotsError } = await supabase
      .from("plots")
      .select("field_id, active, area_ha")
      .in("field_id", fieldIds);
    if (plotsError) throw plotsError;
    plots = data ?? [];
  }

  return (fields ?? []).map((f) => {
    const activePlots = plots.filter((p) => p.field_id === f.id && p.active);
    const known = activePlots.filter((p) => p.area_ha != null);
    return {
      id: f.id,
      name: f.name,
      locality: f.locality,
      active: f.active,
      plotsCount: activePlots.length,
      totalAreaHa: known.length > 0 ? known.reduce((sum, p) => sum + Number(p.area_ha), 0) : null,
    };
  });
}
