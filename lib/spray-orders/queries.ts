import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import type { ProductUnit } from "@/lib/masters/schemas";
import type { ApplicationMethod, DoseUnit, WorkOrderStatus } from "./constants";

export interface WorkOrderListItem {
  id: string;
  orderNumber: number;
  status: WorkOrderStatus;
  scheduledDate: string | null;
  customerName: string;
  fieldName: string;
  plotName: string;
  cropName: string | null;
  campaignName: string | null;
  applicatorName: string | null;
  plannedAreaHa: number;
}

export async function listWorkOrders(): Promise<WorkOrderListItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("work_orders")
    .select(
      "id, order_number, status, scheduled_date, customer_id, field_id, plot_id, crop_id, campaign_id, applicator_id, planned_area_ha",
    )
    .eq("organization_id", organizationId)
    .order("order_number", { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const ids = <T,>(values: (T | null)[]) => [...new Set(values.filter((v): v is T => v !== null))];

  const [customers, fields, plots, crops, campaigns, applicators] = await Promise.all([
    supabase.from("customers").select("id, name").in("id", ids(orders.map((o) => o.customer_id))),
    supabase.from("fields").select("id, name").in("id", ids(orders.map((o) => o.field_id))),
    supabase.from("plots").select("id, name").in("id", ids(orders.map((o) => o.plot_id))),
    supabase.from("crops").select("id, name").in("id", ids(orders.map((o) => o.crop_id))),
    supabase.from("campaigns").select("id, name").in("id", ids(orders.map((o) => o.campaign_id))),
    supabase.from("applicators").select("id, name").in("id", ids(orders.map((o) => o.applicator_id))),
  ]);
  for (const r of [customers, fields, plots, crops, campaigns, applicators]) if (r.error) throw r.error;

  const nameOf = (rows: { id: string; name: string }[] | null) => new Map((rows ?? []).map((r) => [r.id, r.name]));
  const customerNames = nameOf(customers.data);
  const fieldNames = nameOf(fields.data);
  const plotNames = nameOf(plots.data);
  const cropNames = nameOf(crops.data);
  const campaignNames = nameOf(campaigns.data);
  const applicatorNames = nameOf(applicators.data);

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status as WorkOrderStatus,
    scheduledDate: o.scheduled_date,
    customerName: customerNames.get(o.customer_id) ?? "-",
    fieldName: fieldNames.get(o.field_id) ?? "-",
    plotName: plotNames.get(o.plot_id) ?? "-",
    cropName: o.crop_id ? (cropNames.get(o.crop_id) ?? null) : null,
    campaignName: o.campaign_id ? (campaignNames.get(o.campaign_id) ?? null) : null,
    applicatorName: o.applicator_id ? (applicatorNames.get(o.applicator_id) ?? null) : null,
    plannedAreaHa: o.planned_area_ha,
  }));
}

export interface WorkOrderProductDetail {
  id: string;
  productId: string;
  productName: string;
  productDefaultUnit: ProductUnit;
  doseValue: number;
  doseUnit: DoseUnit;
  sortOrder: number;
}

export interface WorkOrderDetail {
  id: string;
  orderNumber: number;
  status: WorkOrderStatus;
  customerId: string;
  customerName: string;
  fieldId: string;
  fieldName: string;
  plotId: string;
  plotName: string;
  campaignId: string | null;
  campaignName: string | null;
  cropId: string | null;
  cropName: string | null;
  applicatorId: string | null;
  applicatorName: string | null;
  scheduledDate: string | null;
  plannedAreaHa: number;
  notes: string | null;
  applicationMethod: ApplicationMethod;
  targetSprayVolumePerHa: number | null;
  products: WorkOrderProductDetail[];
}

export async function getWorkOrder(id: string): Promise<WorkOrderDetail | null> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const { data: sprayOrder, error: sprayError } = await supabase
    .from("spray_orders")
    .select("application_method, target_spray_volume_per_ha")
    .eq("work_order_id", id)
    .maybeSingle();
  if (sprayError) throw sprayError;
  if (!sprayOrder) return null;

  const { data: lines, error: linesError } = await supabase
    .from("spray_order_products")
    .select("id, product_id, dose_value, dose_unit, sort_order")
    .eq("work_order_id", id)
    .order("sort_order");
  if (linesError) throw linesError;

  const productIds = [...new Set((lines ?? []).map((l) => l.product_id))];
  const { data: products, error: productsError } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name, default_unit").in("id", productIds)
      : { data: [], error: null };
  if (productsError) throw productsError;
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const [{ data: customer }, { data: field }, { data: plot }, { data: campaign }, { data: crop }, { data: applicator }] =
    await Promise.all([
      supabase.from("customers").select("name").eq("id", order.customer_id).maybeSingle(),
      supabase.from("fields").select("name").eq("id", order.field_id).maybeSingle(),
      supabase.from("plots").select("name").eq("id", order.plot_id).maybeSingle(),
      order.campaign_id
        ? supabase.from("campaigns").select("name").eq("id", order.campaign_id).maybeSingle()
        : Promise.resolve({ data: null }),
      order.crop_id
        ? supabase.from("crops").select("name").eq("id", order.crop_id).maybeSingle()
        : Promise.resolve({ data: null }),
      order.applicator_id
        ? supabase.from("applicators").select("name").eq("id", order.applicator_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status as WorkOrderStatus,
    customerId: order.customer_id,
    customerName: customer?.name ?? "-",
    fieldId: order.field_id,
    fieldName: field?.name ?? "-",
    plotId: order.plot_id,
    plotName: plot?.name ?? "-",
    campaignId: order.campaign_id,
    campaignName: campaign?.name ?? null,
    cropId: order.crop_id,
    cropName: crop?.name ?? null,
    applicatorId: order.applicator_id,
    applicatorName: applicator?.name ?? null,
    scheduledDate: order.scheduled_date,
    plannedAreaHa: order.planned_area_ha,
    notes: order.notes,
    applicationMethod: sprayOrder.application_method as ApplicationMethod,
    targetSprayVolumePerHa: sprayOrder.target_spray_volume_per_ha,
    products: (lines ?? []).map((l) => {
      const product = productMap.get(l.product_id);
      return {
        id: l.id,
        productId: l.product_id,
        productName: product?.name ?? "-",
        productDefaultUnit: (product?.default_unit ?? "l") as ProductUnit,
        doseValue: l.dose_value,
        doseUnit: l.dose_unit as DoseUnit,
        sortOrder: l.sort_order,
      };
    }),
  };
}
