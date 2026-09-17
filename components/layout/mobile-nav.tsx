"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavContent } from "@/components/layout/nav-content";

export function MobileNav() {
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
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-16 justify-center border-b px-5">
          <SheetTitle className="text-left text-base font-semibold tracking-tight">
            AgroSuite
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto">
          <NavContent onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
