"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { cn, inputClass } from "@/lib/ui";
import type { Analytics } from "@/lib/types";

const widths = ["w-0", "w-1/12", "w-2/12", "w-3/12", "w-4/12", "w-5/12", "w-6/12", "w-7/12", "w-8/12", "w-9/12", "w-10/12", "w-11/12", "w-full"];

function Bar({ value, max }: { value: number; max: number }) {
  const index = max <= 0 ? 0 : Math.max(1, Math.round((value / max) * 12));
  return (
    <div className="h-2 rounded-full bg-stone-100">
      <div className={cn("h-2 rounded-full bg-emerald-900", widths[Math.min(index, 12)])} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  async function load(event?: React.FormEvent) {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const result = await apiFetch<{ data: Analytics }>(`/api/admin/analytics?${params}`);
    setData(result.data);
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load analytics"));
  }, []);

  const maxRevenue = Math.max(...(data?.revenueByDay.map((row) => Number(row.revenue)) || [0]), 0);
  const maxCampaign = Math.max(...(data?.campaigns.map((row) => row.orders) || [0]), 0);

  return (
    <section>
      <h1 className="text-2xl font-medium">Sales and campaigns</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">Paid orders only. Failed and pending checkouts are not counted as purchases. This is store-side attribution, not Meta’s ad-account spend.</p>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => load(event).catch((caught) => setError(caught.message))}>
        <input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <button className="rounded-full bg-emerald-950 px-4 text-sm text-white" type="submit">Update</button>
      </form>
      {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
      {!data ? <p className="mt-4 text-sm text-stone-600">Loading analytics…</p> : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="rounded-3xl bg-white p-4"><p className="text-xs uppercase text-stone-500">Paid orders</p><p className="mt-2 text-2xl">{data.paidOrders}</p></article>
            <article className="rounded-3xl bg-white p-4"><p className="text-xs uppercase text-stone-500">Revenue</p><p className="mt-2 text-2xl">{formatInr(data.revenue)}</p></article>
          </div>
          <article className="mt-4 rounded-3xl bg-white p-5">
            <h2 className="font-medium">Revenue by day</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {data.revenueByDay.length === 0 ? <li className="text-stone-500">No captured payments in this range.</li> : null}
              {data.revenueByDay.map((row) => (
                <li key={row.date}>
                  <div className="mb-1 flex justify-between"><span>{row.date}</span><span>{formatInr(row.revenue)} · {row.orders}</span></div>
                  <Bar value={Number(row.revenue)} max={maxRevenue} />
                </li>
              ))}
            </ul>
          </article>
          <article className="mt-4 rounded-3xl bg-white p-5">
            <h2 className="font-medium">Campaigns</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {data.campaigns.map((row) => (
                <li key={`${row.source}-${row.campaign}`}>
                  <div className="mb-1 flex justify-between gap-3"><span>{row.campaign} · {row.source}</span><span>{row.orders} orders · {formatInr(row.revenue)}</span></div>
                  <Bar value={row.orders} max={maxCampaign} />
                </li>
              ))}
            </ul>
          </article>
          <article className="mt-4 rounded-3xl bg-white p-5 text-sm">
            <h2 className="font-medium">Top products</h2>
            <ul className="mt-3 space-y-2">
              {data.topProducts.map((row) => <li key={row.name} className="flex justify-between"><span>{row.name}</span><span>{row.quantity} · {formatInr(row.revenue)}</span></li>)}
            </ul>
          </article>
        </>
      )}
    </section>
  );
}
