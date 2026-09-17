"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/navigation";

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                    ? "bg-secondary text-secondary-foreground"
                    : "text-foreground/80 hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </span>
                {item.comingSoon ? (
                  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
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
