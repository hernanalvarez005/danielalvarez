import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

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
