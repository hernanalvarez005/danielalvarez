import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authState = await getAuthContext();

  if (authState.status === "unauthenticated") {
    redirect("/login");
  }

  // "no-membership" and "error" both mean this user cannot see any
  // organization's data right now -- neither is ever routed back to
  // /login, which is what previously caused an authenticated user
  // without a membership to bounce forever between /login and
  // /dashboard (proxy sends an authenticated user away from /login,
  // this layout sent a membership-less user back to /login).
  if (authState.status === "no-membership" || authState.status === "error") {
    redirect("/sin-acceso");
  }

  const auth = authState.context;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          organizationName={auth.organizationName}
          fullName={auth.fullName}
          email={auth.email}
          role={auth.role}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
