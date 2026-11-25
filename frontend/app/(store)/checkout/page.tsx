"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Container } from "@/components/Container";
import { ApiError, apiFetch } from "@/lib/api";
import { checkoutAttribution, rememberEvent } from "@/lib/attribution";
import { useCart } from "@/lib/cart";
import { estimateTotal, formatInr } from "@/lib/format";
import { trackMeta } from "@/lib/meta";
import { rememberContact, startPayment } from "@/lib/razorpay";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import type { PublicOrder, Settings } from "@/lib/types";

const empty = {
  name: "",
  email: "",
  phone: "",
  house: "",
  street: "",
  locality: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [form, setForm] = useState(empty);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const totals = useMemo(
    () => estimateTotal(cart.items.map((item) => ({ price: item.price, quantity: item.quantity, slug: item.slug })), settings),
    [cart.items, settings],
  );

  useEffect(() => {
    apiFetch<{ data: Settings }>("/api/settings").then((result) => setSettings(result.data)).catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (!cart.ready || !cart.items.length) return;
    trackMeta("InitiateCheckout", {
      currency: "INR",
      value: totals.total,
      num_items: cart.count,
      content_ids: cart.items.map((item) => item.productId),
      content_type: "product",
    });
  }, [cart.ready]);

  function update(field: keyof typeof empty, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const eventId = crypto.randomUUID();
    let orderNumber = "";
    try {
      const order = await apiFetch<{ data: PublicOrder }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer: { name: form.name, email: form.email, phone: form.phone },
          address: {
            house: form.house,
            street: form.street,
            locality: form.locality,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            landmark: form.landmark,
          },
          items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, size: item.size || null })),
          attribution: checkoutAttribution(eventId),
        }),
      });
      orderNumber = order.data.orderNumber;
      rememberEvent(orderNumber, eventId);
      rememberContact(orderNumber, { name: form.name, email: form.email, phone: form.phone });
      const status = await startPayment(orderNumber, { name: form.name, email: form.email, phone: form.phone });
      if (status === "CAPTURED") cart.clear();
      router.push(status === "CAPTURED" ? `/order/success?order=${orderNumber}` : `/order/pending?order=${orderNumber}`);
    } catch (caught) {
      const apiError = caught as ApiError & { code?: string };
      if (orderNumber && (apiError.code === "DISMISSED" || apiError.code === "FAILED")) {
        router.push(`${apiError.code === "FAILED" ? "/order/failure" : "/order/pending"}?order=${orderNumber}`);
        return;
      }
      setError(orderNumber
        ? `${apiError.message || "Payment could not be opened."} Order ${orderNumber} is reserved until it expires or is paid.`
        : (apiError.message || "Checkout could not be completed"));
      setLoading(false);
    }
  }

  if (!cart.ready) return <Container className="py-16 text-sm text-stone-600">Loading your cart…</Container>;
  if (!cart.items.length) {
    return (
      <Container className="py-16">
        <BackButton fallback="/cart" />
        <h1 className="mt-3 text-3xl font-medium">Your cart is empty</h1>
        <a href="/products" className={`${buttonClass} mt-6`}>Browse products</a>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <BackButton fallback="/cart" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-3xl font-medium">Delivery details</h1>
        <p className="text-sm text-stone-600">Your cart stays as it is. This page only collects the address and opens payment.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={form.name} onChange={(value) => update("name", value)} autoComplete="name" />
          <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} autoComplete="email" />
          <Field label="Mobile number" value={form.phone} onChange={(value) => update("phone", value)} autoComplete="tel" />
          <Field label="House / building" value={form.house} onChange={(value) => update("house", value)} />
          <Field label="Street" value={form.street} onChange={(value) => update("street", value)} autoComplete="address-line1" />
          <Field label="Locality" value={form.locality} onChange={(value) => update("locality", value)} />
          <Field label="City" value={form.city} onChange={(value) => update("city", value)} autoComplete="address-level2" />
          <label className="block">
            <span className={labelClass}>State</span>
            <select className={inputClass} required value={form.state} onChange={(event) => update("state", event.target.value)}>
              <option value="">Select state</option>
              {(settings?.states || []).map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          <Field label="PIN code" value={form.pincode} onChange={(value) => update("pincode", value)} autoComplete="postal-code" />
          <Field label="Landmark (optional)" value={form.landmark} onChange={(value) => update("landmark", value)} required={false} />
        </div>
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? "Opening payment…" : "Pay securely"}
          </button>
          <Link href="/cart" className="text-sm text-stone-600">Back to cart</Link>
        </div>
        <p className="text-xs leading-5 text-stone-500">The amount charged is calculated on the server from current prices. Card details stay with Razorpay.</p>
      </form>
      <aside className="h-fit rounded-3xl bg-white p-5">
        <h2 className="font-medium">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.items.map((item) => (
            <li key={`${item.productId}-${item.size || ""}`} className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words">{item.name}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</span>
              <span className="shrink-0">{formatInr(Number(item.price) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatInr(totals.subtotal)}</dd></div>
          {totals.testOnly ? null : <div className="flex justify-between"><dt>Shipping</dt><dd>{totals.shipping === 0 ? "Free" : formatInr(totals.shipping)}</dd></div>}
          <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatInr(totals.total)}</dd></div>
        </dl>
      </aside>
      </div>
    </Container>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input className={inputClass} required={required} type={type} value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
