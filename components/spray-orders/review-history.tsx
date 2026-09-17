import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewHistoryItem } from "@/lib/spray-orders/reviews";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function describe(item: ReviewHistoryItem): string {
  const who = item.reviewedByName ?? "Usuario";
  switch (item.decision) {
    case "approved":
      return `Aprobada por ${who}`;
    case "observed":
      return `Observada por ${who}`;
    case "resent":
      return `Corrección enviada por ${who}`;
  }
}

export function ReviewHistory({ items }: { items: ReviewHistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="border-l-2 pl-3 text-sm">
            <p className="text-xs text-muted-foreground">{formatDateTime(item.reviewedAt)}</p>
            <p className="font-medium">{describe(item)}</p>
            {item.notes ? <p className="text-muted-foreground whitespace-pre-wrap">&ldquo;{item.notes}&rdquo;</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
