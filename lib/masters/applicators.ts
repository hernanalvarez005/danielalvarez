import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/masters/require-org";

export interface ApplicatorItem {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  profileId: string | null;
  linkedUserName: string | null;
}

export async function listApplicators(): Promise<ApplicatorItem[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applicators")
    .select("id, name, phone, active, profile_id")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;

  const profileIds = (data ?? []).map((a) => a.profile_id).filter((id): id is string => id !== null);

  let profileNames = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    if (profilesError) throw profilesError;
    profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    phone: a.phone,
    active: a.active,
    profileId: a.profile_id,
    linkedUserName: a.profile_id ? (profileNames.get(a.profile_id) ?? "Usuario vinculado") : null,
  }));
}

export interface OrgUserOption {
  profileId: string;
  label: string;
}

/** Members of the current organization, for the optional "link to a system user" selector. */
export async function listOrgUserOptions(): Promise<OrgUserOption[]> {
  const { organizationId } = await requireOrgContext();
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("active", true);
  if (error) throw error;

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  return (profiles ?? [])
    .map((p) => ({ profileId: p.id, label: p.full_name ?? "Sin nombre" }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
