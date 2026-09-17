import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import { roundTo } from "@/lib/spray-orders/calculations";

export interface DashboardStats {
  pendingCount: number;
  inProgressCount: number;
  pendingReviewCount: number;
  observedCount: number;
  /** Sum of actual_area_ha for completed work orders only -- documented
   *  choice: "applied" means the full cycle finished and the engineer
   *  approved it, not merely executed-but-still-under-review. */
  appliedHectares: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("work_orders")
    .select("id, status")
    .eq("organization_id", organizationId);
  if (error) throw error;

  const rows = orders ?? [];
  const completedIds = rows.filter((o) => o.status === "completed").map((o) => o.id);

  let appliedHectares = 0;
  if (completedIds.length > 0) {
    const { data: executions, error: execError } = await supabase
      .from("spray_executions")
      .select("actual_area_ha")
      .in("work_order_id", completedIds);
    if (execError) throw execError;
    appliedHectares = (executions ?? []).reduce((sum, e) => sum + (e.actual_area_ha ?? 0), 0);
  }

  return {
    pendingCount: rows.filter((o) => o.status === "pending").length,
    inProgressCount: rows.filter((o) => o.status === "in_progress").length,
    pendingReviewCount: rows.filter((o) => o.status === "pending_review").length,
    observedCount: rows.filter((o) => o.status === "observed").length,
    appliedHectares: roundTo(appliedHectares),
  };
}
