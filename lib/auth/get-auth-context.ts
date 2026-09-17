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
 * The three real states a request can be in, plus a distinct `error`
 * state for when resolving membership itself fails (a DB/RLS problem is
 * NOT the same thing as "this user has no membership" -- conflating them
 * previously caused an authenticated-but-unprovisioned user to bounce
 * forever between /login and /dashboard).
 */
export type AuthState =
  | { status: "unauthenticated" }
  | { status: "no-membership"; userId: string; email: string | null }
  | { status: "error"; userId: string }
  | { status: "ok"; context: AuthContext };

/**
 * Resolves the current request's auth/membership state.
 * `cache()` de-dupes this across Server Components within one request.
 *
 * Never collapses a query failure into "no membership" -- callers get an
 * explicit `error` state and the real Supabase error is logged
 * server-side only (never returned to the client).
 */
export const getAuthContext = cache(async (): Promise<AuthState> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { status: "unauthenticated" };

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role, organization_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[getAuthContext] organization_members query failed", {
      userId: user.id,
      error: membershipError,
    });
    return { status: "error", userId: user.id };
  }

  if (!membership) {
    return { status: "no-membership", userId: user.id, email: user.email ?? null };
  }

  const [
    { data: profile, error: profileError },
    { data: organization, error: organizationError },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .maybeSingle(),
  ]);

  if (profileError || organizationError) {
    console.error("[getAuthContext] profile/organization lookup failed", {
      userId: user.id,
      profileError,
      organizationError,
    });
    return { status: "error", userId: user.id };
  }

  return {
    status: "ok",
    context: {
      userId: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      organizationId: membership.organization_id,
      organizationName: organization?.name ?? "",
      role: membership.role,
    },
  };
});
