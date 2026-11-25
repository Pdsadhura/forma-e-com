"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export default function AdminHomePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: Dashboard }>("/api/admin/dashboard")
      .then((result) => setData(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the dashboard"));
  }, []);

  if (error) return <p className="text-sm text-rose-800">{error}</p>;
  if (!data) return <p className="text-sm text-stone-600">Loading summary…</p>;

  const cards = [
    ["Total orders", String(data.totalOrders)],
    ["Revenue", formatInr(data.revenue)],
    ["Paid orders", String(data.paidOrders)],
    ["Pending orders", String(data.pendingOrders)],
    ["Products", String(data.products)],
  ];

  return (
    <section>
      <h1 className="text-2xl font-medium">Overview</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-3xl bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-medium">{value}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-stone-600">Revenue counts captured payments only. Pending orders are unpaid and still reserved.</p>
    </section>
  );
}
