import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <h1 className="mb-4 text-2xl font-medium">Edit product</h1>
      <ProductForm id={id} />
    </section>
  );
}
