import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth/actions";

/**
 * Standalone route (outside the (app) group on purpose) for an
 * authenticated user whose account has no active organization
 * membership -- reads the user directly instead of going through
 * getAuthContext(), so it never depends on the same membership lookup
 * that put the user here, and can never redirect back into a loop.
 */
export default async function SinAccesoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4">
      <BrandMark />
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="size-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-xl">Sin acceso</CardTitle>
          <CardDescription>Tu cuenta no tiene acceso a una organización activa.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            {user.email} inició sesión correctamente, pero todavía no está asociada a ninguna
            organización. Pedile a un administrador que te agregue.
          </p>
          <form action={logout} className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
