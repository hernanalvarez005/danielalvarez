import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";

export interface FieldListItem {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  active: boolean;
  plotsCount: number;
  totalAreaHa: number | null;
}

export async function listFields(): Promise<FieldListItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const [{ data: fields, error }, { data: customers, error: customersError }, { data: plots, error: plotsError }] =
    await Promise.all([
      supabase
        .from("fields")
        .select("id, name, customer_id, active")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase.from("customers").select("id, name").eq("organization_id", organizationId),
      supabase.from("plots").select("field_id, active, area_ha").eq("organization_id", organizationId),
    ]);
  if (error) throw error;
  if (customersError) throw customersError;
  if (plotsError) throw plotsError;

  const customerNames = new Map((customers ?? []).map((c) => [c.id, c.name]));

  return (fields ?? []).map((f) => {
    const activePlots = (plots ?? []).filter((p) => p.field_id === f.id && p.active);
    const known = activePlots.filter((p) => p.area_ha != null);
    return {
      id: f.id,
      name: f.name,
      customerId: f.customer_id,
      customerName: customerNames.get(f.customer_id) ?? "-",
      active: f.active,
      plotsCount: activePlots.length,
      totalAreaHa: known.length > 0 ? known.reduce((sum, p) => sum + Number(p.area_ha), 0) : null,
    };
  });
}

export interface FieldDetail {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  locality: string | null;
  province: string | null;
  notes: string | null;
  active: boolean;
}

export async function getField(id: string): Promise<FieldDetail | null> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fields")
    .select("id, name, customer_id, locality, province, notes, active")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("name")
    .eq("id", data.customer_id)
    .maybeSingle();

  return {
    id: data.id,
    name: data.name,
    customerId: data.customer_id,
    customerName: customer?.name ?? "-",
    locality: data.locality,
    province: data.province,
    notes: data.notes,
    active: data.active,
  };
}

export interface FieldPlotItem {
  id: string;
  name: string;
  areaHa: number | null;
  active: boolean;
}

export async function listFieldPlots(fieldId: string): Promise<FieldPlotItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plots")
    .select("id, name, area_ha, active")
    .eq("organization_id", organizationId)
    .eq("field_id", fieldId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, areaHa: p.area_ha, active: p.active }));
}

export interface CustomerOption {
  id: string;
  name: string;
}

export async function listActiveCustomerOptions(): Promise<CustomerOption[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
