import "server-only";
import { getAuthContext, type AuthContext } from "@/lib/auth/get-auth-context";

/**
 * All master-data queries/actions run inside the authenticated (app)
 * layout, which already guarantees an "ok" auth state -- this just gives
 * that guarantee a type-safe shape instead of re-deriving it everywhere.
 * RLS (not this check) is what actually stops cross-organization access;
 * this only recovers the current organizationId to scope queries by.
 */
export async function requireOrgContext(): Promise<AuthContext> {
  const state = await getAuthContext();
  if (state.status !== "ok") {
    throw new Error("No autorizado.");
  }
  return state.context;
}
