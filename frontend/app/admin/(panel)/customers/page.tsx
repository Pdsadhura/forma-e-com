"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { apiFetch } from "@/lib/api";
import { inputClass } from "@/lib/ui";
import type { Customer, Pagination as Page } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState<Page>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function load(nextPage = 1, query = q) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "20" });
    if (query) params.set("q", query);
    const result = await apiFetch<{ data: Customer[]; pagination: Page }>(`/api/admin/customers?${params}`);
    setCustomers(result.data);
    setPage(result.pagination);
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load customers"));
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-medium">Customers</h1>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); load(1).catch((caught) => setError(caught.message)); }}>
        <input className={inputClass} placeholder="Name, email, or phone" value={q} onChange={(event) => setQ(event.target.value)} />
        <button className="rounded-full bg-emerald-950 px-4 text-sm text-white" type="submit">Search</button>
      </form>
      {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
      {customers.length === 0 && !error ? <div className="mt-4"><EmptyState title="No customers yet" body="A customer record is created when someone checks out." /></div> : null}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-stone-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Orders</th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-stone-100">
                <td className="px-4 py-3"><Link href={`/admin/customers/${customer.id}`}>{customer.name}</Link></td>
                <td className="px-4 py-3">{customer.email}</td>
                <td className="px-4 py-3">{customer.phone}</td>
                <td className="px-4 py-3">{customer.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page.page} totalPages={page.totalPages} onPage={(next) => load(next)} />
    </section>
  );
}
