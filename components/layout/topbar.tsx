import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import type { MemberRole } from "@/types/database";

export function Topbar({
  organizationName,
  fullName,
  email,
  role,
}: {
  organizationName: string;
  fullName: string | null;
  email: string | null;
  role: MemberRole;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav role={role} />
        <span className="truncate text-sm font-medium text-muted-foreground">
          {organizationName}
        </span>
      </div>
      <UserMenu fullName={fullName} email={email} role={role} />
    </header>
  );
}
