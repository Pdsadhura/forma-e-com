"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { inputClass } from "@/lib/ui";
import type { AdminOrder, Pagination as Page } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState<Page>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [q, setQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextPage = page.page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "20" });
    if (q) params.set("q", q);
    if (orderStatus) params.set("orderStatus", orderStatus);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const result = await apiFetch<{ data: AdminOrder[]; pagination: Page }>(`/api/admin/orders?${params}`);
      setOrders(result.data);
      setPage(result.pagination);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // Initial load only. Filters apply when the form is submitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-medium">Orders</h1>
      <form className="mt-4 grid gap-2 sm:grid-cols-5" onSubmit={(event) => { event.preventDefault(); load(1); }}>
        <input className={inputClass} placeholder="Order, name, email, phone" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className={inputClass} value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
          <option value="">All fulfillment</option>
          {["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <select className={inputClass} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
          <option value="">All payments</option>
          {["PENDING", "CAPTURED", "FAILED"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <button className="rounded-full bg-emerald-950 px-4 py-3 text-sm text-white sm:col-span-5 sm:w-fit" type="submit">Apply filters</button>
      </form>
      {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-stone-600">Loading orders…</p> : null}
      {!loading && orders.length === 0 ? <div className="mt-4"><EmptyState title="No orders" body="Paid and unpaid orders will show up here." /></div> : null}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-stone-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Fulfillment</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-stone-100">
                <td className="px-4 py-3"><Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                <td className="px-4 py-3">{order.customer.name}<br /><span className="text-stone-500">{order.customer.phone}</span></td>
                <td className="px-4 py-3">{formatInr(order.total)}</td>
                <td className="px-4 py-3"><StatusBadge value={order.paymentStatus} /></td>
                <td className="px-4 py-3"><StatusBadge value={order.orderStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page.page} totalPages={page.totalPages} onPage={(next) => load(next)} />
    </section>
  );
}
