import { NavContent } from "@/components/layout/nav-content";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <span className="text-base font-semibold tracking-tight">AgroSuite</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavContent />
      </div>
    </aside>
  );
}
