"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { buttonClass } from "@/lib/ui";
import type { AdminOrder } from "@/lib/types";

const statuses = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState<(typeof statuses)[number]>("PROCESSING");
  const [meeshoOrderId, setMeeshoOrderId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch<{ data: AdminOrder }>(`/api/admin/orders/${params.id}`)
      .then((result) => {
        setOrder(result.data);
        setMeeshoOrderId(result.data.meeshoOrderId || "");
        if (statuses.includes(result.data.orderStatus as (typeof statuses)[number])) {
          setStatus(result.data.orderStatus as (typeof statuses)[number]);
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the order"));
  }, [params.id]);

  async function copySheet() {
    if (!order) return;
    const address = order.address;
    const text = [
      order.customer.name,
      order.customer.phone,
      address.house,
      address.street,
      address.locality,
      `${address.city}, ${address.state}`,
      `PIN ${address.pincode}`,
      address.landmark || "",
      "",
      ...order.items.map((item) => [
        `${item.productName}${item.size ? ` — size ${item.size}` : ""} × ${item.quantity}`,
        ...(item.specifications || []).map((spec) => `${spec.label}: ${spec.value}`),
        `Meesho product ID: ${item.meeshoProductId || "not saved"}`,
        `PID: ${item.pid || "not saved"}`,
        item.meeshoUrl || "",
        `Your price ₹${item.unitPrice}`,
        item.meeshoPrice ? `Meesho price ₹${item.meeshoPrice}` : "",
        item.margin ? `Margin ₹${item.margin} each` : "",
      ].filter(Boolean).join("\n")),
    ].filter((line) => line !== "").join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Address and Meesho details copied");
      setError("");
    } catch {
      setError("Could not copy. Select the address on this page and copy it manually.");
    }
  }

  async function saveMeesho() {
    setMessage("");
    setError("");
    try {
      const result = await apiFetch<{ data: AdminOrder }>(`/api/admin/orders/${params.id}/meesho`, {
        method: "PATCH",
        body: JSON.stringify({ meeshoOrderId }),
      });
      setOrder(result.data);
      setMeeshoOrderId(result.data.meeshoOrderId || "");
      if (statuses.includes(result.data.orderStatus as (typeof statuses)[number])) {
        setStatus(result.data.orderStatus as (typeof statuses)[number]);
      }
      setMessage("Meesho order ID saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the Meesho order ID");
    }
  }

  async function save() {
    setMessage("");
    setError("");
    try {
      const result = await apiFetch<{ data: AdminOrder }>(`/api/admin/orders/${params.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: status }),
      });
      setOrder(result.data);
      setMessage("Fulfillment updated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the order");
    }
  }

  if (error && !order) return <p className="text-sm text-rose-800">{error}</p>;
  if (!order) return <p className="text-sm text-stone-600">Loading order…</p>;

  return (
    <section className="space-y-4">
      <Link href="/admin/orders" className="text-sm text-stone-500">All orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium">{order.orderNumber}</h1>
        <StatusBadge value={order.paymentStatus} />
        <StatusBadge value={order.orderStatus} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl bg-white p-5 text-sm leading-6">
          <h2 className="font-medium">Customer</h2>
          <p className="mt-2">{order.customer.name}</p>
          <p>{order.customer.email}</p>
          <p>{order.customer.phone}</p>
          <h2 className="mt-4 font-medium">Delivery address</h2>
          <p className="mt-2">
            {order.address.house}, {order.address.street}<br />
            {order.address.locality}<br />
            {order.address.city}, {order.address.state} {order.address.pincode}<br />
            {order.address.landmark ? <>{order.address.landmark}<br /></> : null}
            {order.address.country}
          </p>
        </article>
        <article className="rounded-3xl bg-white p-5 text-sm">
          <h2 className="font-medium">Products</h2>
          <ul className="mt-3 space-y-2">
            {order.items.map((item) => (
              <li key={`${item.productName}-${item.size || ""}`} className="flex justify-between gap-3">
                <span>{item.productName}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</span>
                <span>{formatInr(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">Subtotal {formatInr(order.subtotal)}</p>
          <p>Shipping {formatInr(order.shippingAmount)}</p>
          <p className="font-medium">Total {formatInr(order.total)}</p>
          <p className="mt-3 text-stone-500">Customer email {order.customerEmailSentAt ? "sent" : "not sent"} · Owner email {order.ownerEmailSentAt ? "sent" : "not sent"}</p>
        </article>
      </div>
      <article className="rounded-3xl bg-white p-5 text-sm leading-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Place on Meesho</h2>
          <button type="button" className="rounded-full border border-stone-300 px-4 py-2" onClick={copySheet}>Copy details</button>
        </div>
        <p className="mt-2 text-stone-600">The customer already paid on Razorpay. Open the product, choose the size, paste this address, and pay Meesho yourself.</p>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.size || ""}`}>
              <p className="font-medium">{item.productName}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</p>
              {(item.specifications || []).map((spec) => <p key={spec.label}>{spec.label}: {spec.value}</p>)}
              <p>Meesho product ID {item.meeshoProductId || "not saved"}</p>
              <p>PID {item.pid || "not saved"}</p>
              {item.meeshoUrl ? <a className="text-emerald-900" href={item.meeshoUrl} target="_blank" rel="noreferrer">Open the Meesho listing</a> : null}
              <p>Your price {formatInr(item.unitPrice)}{item.meeshoPrice ? ` · Meesho price ${formatInr(item.meeshoPrice)}` : ""}{item.margin ? ` · Margin ${formatInr(item.margin)}` : ""}</p>
            </li>
          ))}
        </ul>
        <label className="mt-4 block max-w-sm">
          Meesho order ID
          <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" value={meeshoOrderId} onChange={(event) => setMeeshoOrderId(event.target.value)} placeholder="After you place the order" />
        </label>
        <button type="button" className={`${buttonClass} mt-3`} onClick={saveMeesho} disabled={order.paymentStatus !== "CAPTURED"}>Save Meesho order ID</button>
        {order.meeshoPlacedAt ? <p className="mt-2 text-stone-500">Saved {new Date(order.meeshoPlacedAt).toLocaleString()}</p> : null}
      </article>
      <article className="rounded-3xl bg-white p-5 text-sm">
        <h2 className="font-medium">Payments</h2>
        {order.payments.length === 0 ? <p className="mt-2 text-stone-600">No Razorpay order yet.</p> : null}
        <ul className="mt-3 space-y-3">
          {order.payments.map((payment) => (
            <li key={payment.id}>
              <StatusBadge value={payment.status} />
              <p className="mt-1">Razorpay order {payment.razorpayOrderId}</p>
              <p>Payment {payment.razorpayPaymentId || "—"} · {payment.method || "method pending"} · {formatInr(payment.amount)}</p>
            </li>
          ))}
        </ul>
      </article>
      {order.attribution ? (
        <article className="rounded-3xl bg-white p-5 text-sm">
          <h2 className="font-medium">Campaign</h2>
          <p className="mt-2">Source {order.attribution.utmSource || "—"} · Medium {order.attribution.utmMedium || "—"}</p>
          <p>Campaign {order.attribution.utmCampaign || "—"}</p>
          <p>Content {order.attribution.utmContent || "—"} · Term {order.attribution.utmTerm || "—"}</p>
          <p className="break-all">fbclid {order.attribution.fbclid || "—"}</p>
        </article>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Fulfillment
          <select className="ml-2 rounded-full border border-stone-300 bg-white px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}>
            {statuses.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <button type="button" className={buttonClass} onClick={save}>Update status</button>
      </div>
      {message ? <p className="text-sm text-emerald-900">{message}</p> : null}
      {error ? <p className="text-sm text-rose-800">{error}</p> : null}
    </section>
  );
}
