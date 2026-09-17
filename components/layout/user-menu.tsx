import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { logout } from "@/lib/auth/actions";
import type { MemberRole } from "@/types/database";

function initialsFrom(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({
  fullName,
  email,
  role,
}: {
  fullName: string | null;
  email: string | null;
  role: MemberRole;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-10 gap-2 px-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initialsFrom(fullName, email)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{fullName || email}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{fullName || "Sin nombre"}</span>
            <span className="text-xs font-normal text-muted-foreground">{email}</span>
            <span className="mt-1 flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <UserIcon className="size-3" />
              {ROLE_LABELS[role]}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem
            nativeButton
            render={
              <button type="submit" className="flex w-full items-center gap-2 text-left">
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
