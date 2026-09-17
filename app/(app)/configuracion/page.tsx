import { Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export default async function ConfiguracionPage() {
  const authState = await getAuthContext();
  const auth = authState.status === "ok" ? authState.context : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Datos de la organización y preferencias del sistema." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organización</CardTitle>
          <CardDescription>{auth?.organizationName}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Settings}
            title="Gestión de usuarios y roles"
            description={`Tu rol actual es ${auth ? ROLE_LABELS[auth.role] : "-"}. La administración completa de usuarios, roles e integraciones se incorpora en una próxima etapa.`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
