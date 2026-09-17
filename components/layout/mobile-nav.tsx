"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "@/components/layout/brand";
import { NavContent } from "@/components/layout/nav-content";
import type { MemberRole } from "@/types/database";

export function MobileNav({ role }: { role: MemberRole }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="size-10 md:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-5">
          <SheetTitle render={<Brand className="!text-sidebar-foreground" />} />
        </SheetHeader>
        <div className="overflow-y-auto">
          <NavContent role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
