import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProductFormSheet } from "@/components/masters/product-form-sheet";
import { ProductsList } from "@/components/masters/products-list";
import { listProducts } from "@/lib/masters/products";

export default async function ProductosPage() {
  const products = await listProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Productos" description="Productos e insumos utilizados en las aplicaciones." />
        {products.length > 0 ? (
          <ProductFormSheet
            trigger={
              <Button>
                <Plus className="size-4" />
                Nuevo producto
              </Button>
            }
          />
        ) : null}
      </div>
      <ProductsList products={products} />
    </div>
  );
}
