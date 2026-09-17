import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";
import type { ReviewDecision } from "./constants";

export interface ReviewHistoryItem {
  id: string;
  decision: ReviewDecision;
  notes: string | null;
  reviewedByName: string | null;
  reviewedAt: string;
}

export async function getReviewHistory(workOrderId: string): Promise<ReviewHistoryItem[]> {
  await requireOrgContext();
  const supabase = await createClient();

  const { data: reviews, error } = await supabase
    .from("spray_reviews")
    .select("id, decision, notes, reviewed_by, reviewed_at")
    .eq("work_order_id", workOrderId)
    .order("reviewed_at");
  if (error) throw error;
  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set(reviews.map((r) => r.reviewed_by).filter((id): id is string => id !== null))];
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return reviews.map((r) => ({
    id: r.id,
    decision: r.decision as ReviewDecision,
    notes: r.notes,
    reviewedByName: r.reviewed_by ? (profileNames.get(r.reviewed_by) ?? "Usuario") : null,
    reviewedAt: r.reviewed_at,
  }));
}

/** Latest 'observed' decision's notes -- shown to the applicator as the reason. */
export async function getLatestObservationNotes(workOrderId: string): Promise<string | null> {
  await requireOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spray_reviews")
    .select("notes")
    .eq("work_order_id", workOrderId)
    .eq("decision", "observed")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.notes ?? null;
}
