import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";

export interface CampaignItem {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export async function listCampaigns(): Promise<CampaignItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, start_date, end_date, active")
    .eq("organization_id", organizationId)
    .order("name", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.start_date,
    endDate: c.end_date,
    active: c.active,
  }));
}
