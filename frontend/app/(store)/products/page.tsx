import type { Metadata } from "next";
import { BackButton } from "@/components/BackButton";
import { Container } from "@/components/Container";
import { ProductCard } from "@/components/ProductCard";
import { serif } from "@/lib/fonts";
import { serverGet } from "@/lib/api";
import type { Product } from "@/lib/types";

export const metadata: Metadata = { title: "Shop" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams({ pageSize: "24" });
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  const result = await serverGet<{ data: Product[] }>(`/api/products?${query.toString()}`);
  const products = result?.data || [];

  return (
    <Container className="py-10">
      <BackButton />
      <h1 className={`${serif.className} mt-3 break-words text-3xl sm:text-4xl`}>{params.category || "All products"}</h1>
      <form className="mt-6 flex flex-col gap-2 sm:flex-row" action="/products">
        {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
        <input name="q" defaultValue={params.q || ""} placeholder="Search products" className="min-w-0 w-full rounded-full border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-800" />
        <button className="shrink-0 rounded-full bg-emerald-950 px-5 py-3 text-sm text-white sm:py-0" type="submit">Search</button>
      </form>
      {products.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-6 lg:grid-cols-3">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <p className="mt-8 text-sm text-stone-600">No products matched. Try another search, or check that the API is running.</p>
      )}
    </Container>
  );
}
