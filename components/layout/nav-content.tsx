"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, APPLICATOR_NAV_SECTIONS } from "@/lib/navigation";
import type { MemberRole } from "@/types/database";

export function NavContent({ role, onNavigate }: { role: MemberRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = role === "applicator" ? APPLICATOR_NAV_SECTIONS : NAV_SECTIONS;

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {section.label}
          </span>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-10 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </span>
                {item.comingSoon ? (
                  <Badge
                    variant="outline"
                    className="border-sidebar-border text-[10px] font-normal text-sidebar-foreground/60"
                  >
                    Próximamente
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
