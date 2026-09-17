import { Brand } from "@/components/layout/brand";
import { NavContent } from "@/components/layout/nav-content";
import type { MemberRole } from "@/types/database";

export function Sidebar({ role }: { role: MemberRole }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavContent role={role} />
      </div>
    </aside>
  );
}
