import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  suffix,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  suffix?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">
          {value}
          {suffix ? <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
