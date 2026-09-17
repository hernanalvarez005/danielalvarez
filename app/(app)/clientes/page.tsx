import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CustomersList } from "@/components/masters/customers-list";
import { listCustomers } from "@/lib/masters/customers";

export default async function ClientesPage() {
  const customers = await listCustomers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Clientes" description="Clientes para los que se ejecutan trabajos." />
        {customers.length > 0 ? (
          <Button nativeButton={false} render={<Link href="/clientes/nuevo"><Plus className="size-4" />Nuevo cliente</Link>} />
        ) : null}
      </div>
      <CustomersList customers={customers} />
    </div>
  );
}
