"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { buttonClass } from "@/lib/ui";
import type { Pagination, Product } from "@/lib/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const result = await apiFetch<{ data: Product[]; pagination: Pagination }>("/api/admin/products?pageSize=50");
    setProducts(result.data);
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load products"));
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Remove this product? Ordered products are deactivated instead of deleted.")) return;
    await apiFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Products</h1>
        <Link href="/admin/products/new" className={buttonClass}>New product</Link>
      </div>
      {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
      {products.length === 0 && !error ? <div className="mt-4"><EmptyState title="No products" body="Create a product to show it on the storefront." /></div> : null}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-stone-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Meesho ID</th><th className="px-4 py-3">PID</th><th className="px-4 py-3">Your price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Website</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-stone-100">
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3">{product.meeshoProductId || "—"}</td>
                <td className="px-4 py-3">{product.pid || "—"}</td>
                <td className="px-4 py-3">{formatInr(product.effectivePrice)}</td>
                <td className="px-4 py-3">{product.stockQuantity}</td>
                <td className="px-4 py-3">{product.status === "ACTIVE" ? "Live" : "Hidden"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${product.id}`} className="mr-3">Edit</Link>
                  <button type="button" className="text-rose-800" onClick={() => remove(product.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
