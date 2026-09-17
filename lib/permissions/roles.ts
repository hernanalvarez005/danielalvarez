import type { MemberRole } from "@/types/database";

export type { MemberRole };

export const ROLES = ["admin", "engineer", "applicator"] as const;

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Administrador",
  engineer: "Ingeniero",
  applicator: "Aplicador",
};

/**
 * Capability map: the single source of truth for what each role can do.
 * Add new capabilities here instead of scattering `role === "admin"`
 * checks across components.
 */
export const PERMISSIONS = {
  "users:manage": ["admin"],
  "organization:configure": ["admin"],
  "modules:access-all": ["admin"],
  "work-orders:create": ["admin", "engineer"],
  "work-orders:review": ["admin", "engineer"],
  "work-orders:execute": ["admin", "engineer", "applicator"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Capability = keyof typeof PERMISSIONS;

export function can(role: MemberRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (PERMISSIONS[capability] as readonly MemberRole[]).includes(role);
}

export function hasRole(
  role: MemberRole | null | undefined,
  allowed: readonly MemberRole[],
): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
