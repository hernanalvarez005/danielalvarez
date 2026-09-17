import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/database";

export interface AuthContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  organizationId: string;
  organizationName: string;
  role: MemberRole;
}

/**
 * Resolves the current user's active organization membership.
 * `cache()` de-dupes this across Server Components within one request.
 *
 * Returns `null` when there is no authenticated user or the user has no
 * active membership yet — callers decide how to handle that (redirect,
 * onboarding screen, etc).
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organization_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const [{ data: profile }, { data: organization }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    organizationId: membership.organization_id,
    organizationName: organization?.name ?? "",
    role: membership.role,
  };
});
