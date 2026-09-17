import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ApplicatorFormSheet } from "@/components/masters/applicator-form-sheet";
import { ApplicatorsList } from "@/components/masters/applicators-list";
import { listApplicators, listOrgUserOptions } from "@/lib/masters/applicators";

export default async function AplicadoresPage() {
  const [applicators, userOptions] = await Promise.all([listApplicators(), listOrgUserOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Aplicadores" description="Operadores que ejecutan las pulverizaciones en el campo." />
        {applicators.length > 0 ? (
          <ApplicatorFormSheet
            userOptions={userOptions}
            trigger={
              <Button>
                <Plus className="size-4" />
                Nuevo aplicador
              </Button>
            }
          />
        ) : null}
      </div>
      <ApplicatorsList applicators={applicators} userOptions={userOptions} />
    </div>
  );
}
