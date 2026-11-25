"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { inputClass } from "@/lib/ui";
import type { Pagination as Page, PaymentRecord } from "@/lib/types";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [page, setPage] = useState<Page>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load(nextPage = 1, nextStatus = status) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "20" });
    if (nextStatus) params.set("status", nextStatus);
    const result = await apiFetch<{ data: PaymentRecord[]; pagination: Page }>(`/api/admin/payments?${params}`);
    setPayments(result.data);
    setPage(result.pagination);
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load payments"));
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-medium">Payments</h1>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); load(1).catch((caught) => setError(caught.message)); }}>
        <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {["PENDING", "CAPTURED", "FAILED", "REFUNDED"].map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="rounded-full bg-emerald-950 px-4 text-sm text-white" type="submit">Filter</button>
      </form>
      {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
      {payments.length === 0 && !error ? <div className="mt-4"><EmptyState title="No payments" body="A payment row is created when Razorpay Checkout is opened." /></div> : null}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-stone-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Razorpay order</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t border-stone-100">
                <td className="px-4 py-3">{payment.orderId ? <Link href={`/admin/orders/${payment.orderId}`}>{payment.orderNumber}</Link> : payment.orderNumber}</td>
                <td className="px-4 py-3">{payment.razorpayOrderId}</td>
                <td className="px-4 py-3">{payment.razorpayPaymentId || "—"}</td>
                <td className="px-4 py-3">{payment.method || "—"}</td>
                <td className="px-4 py-3">{formatInr(payment.amount)}</td>
                <td className="px-4 py-3"><StatusBadge value={payment.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page.page} totalPages={page.totalPages} onPage={(next) => load(next)} />
    </section>
  );
}
