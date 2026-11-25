"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: CustomerDetail }>(`/api/admin/customers/${params.id}`)
      .then((result) => setCustomer(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the customer"));
  }, [params.id]);

  if (error) return <p className="text-sm text-rose-800">{error}</p>;
  if (!customer) return <p className="text-sm text-stone-600">Loading customer…</p>;

  return (
    <section>
      <Link href="/admin/customers" className="text-sm text-stone-500">All customers</Link>
      <h1 className="mt-2 text-2xl font-medium">{customer.name}</h1>
      <p className="text-sm text-stone-600">{customer.email} · {customer.phone}</p>
      <div className="mt-4 space-y-3">
        {customer.orders.map((order) => (
          <article key={order.id} className="rounded-3xl bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/orders/${order.id}`} className="font-medium">{order.orderNumber}</Link>
              <StatusBadge value={order.paymentStatus} />
              <StatusBadge value={order.orderStatus} />
              <span className="ml-auto">{formatInr(order.total)}</span>
            </div>
            <ul className="mt-2 text-stone-600">
              {order.items.map((item) => <li key={`${item.productName}-${item.size || ""}`}>{item.productName}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
