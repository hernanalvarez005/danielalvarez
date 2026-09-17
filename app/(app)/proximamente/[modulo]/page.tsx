import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";
import { ALL_NAV_ITEMS } from "@/lib/navigation";

export function generateStaticParams() {
  return ALL_NAV_ITEMS.filter((item) => item.comingSoon).map((item) => ({
    modulo: item.href.replace("/proximamente/", ""),
  }));
}

export default async function ProximamentePage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const item = ALL_NAV_ITEMS.find((i) => i.href === `/proximamente/${modulo}`);

  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={item.label} />
      <ComingSoon icon={item.icon} title={item.label} description={item.description} />
    </div>
  );
}
