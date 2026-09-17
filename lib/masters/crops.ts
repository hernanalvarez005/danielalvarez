import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";

export interface CropItem {
  id: string;
  name: string;
  active: boolean;
}

export async function listCrops(): Promise<CropItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crops")
    .select("id, name, active")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
