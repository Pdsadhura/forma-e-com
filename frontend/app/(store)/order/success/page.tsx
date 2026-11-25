"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/Container";
import { PaymentStage } from "@/components/PaymentStage";
import { apiFetch } from "@/lib/api";
import { rememberedEvent } from "@/lib/attribution";
import { formatInr } from "@/lib/format";
import { trackMeta } from "@/lib/meta";
import { buttonClass, buttonSecondaryClass } from "@/lib/ui";
import type { PublicOrder } from "@/lib/types";

function SuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order") || "";
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) return;
    let attempts = 0;
    let timer = 0;
    let stopped = false;
    async function load() {
      try {
        const result = await apiFetch<{ data: PublicOrder }>(`/api/orders/${orderNumber}`);
        if (stopped) return;
        setOrder(result.data);
        setError("");
        if (result.data.paymentStatus === "CAPTURED") {
          const key = `forma_purchase_tracked_${orderNumber}`;
          if (!window.sessionStorage.getItem(key)) {
            window.sessionStorage.setItem(key, "1");
            trackMeta("Purchase", {
              currency: "INR",
              value: Number(result.data.total),
              content_type: "product",
              content_ids: result.data.items.map((item) => item.productId).filter(Boolean),
              num_items: result.data.items.reduce((sum, item) => sum + item.quantity, 0),
            }, rememberedEvent(orderNumber));
          }
          return;
        }
      } catch (caught) {
        if (!stopped) setError(caught instanceof Error ? caught.message : "Could not load the order");
        return;
      }
      attempts += 1;
      if (attempts < 6 && !stopped) timer = window.setTimeout(load, 8000);
    }
    load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [orderNumber]);

  const paid = order?.paymentStatus === "CAPTURED";

  return (
    <Container>
      <PaymentStage tone={paid ? "success" : "pending"} eyebrow={paid ? "Order confirmed" : "Razorpay"} title={paid ? "Payment received" : "Still confirming"}>
        {!order ? <p className="text-sm text-stone-600">{error || "Checking the payment…"}</p> : null}
        {order ? (
          <div className="mx-auto max-w-lg rounded-3xl bg-white p-5 text-left">
            <p className="text-sm text-stone-500">{order.orderNumber}</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {paid
                ? "Razorpay has confirmed this payment. We will place the order for delivery."
                : "The payment window closed before Razorpay confirmed the charge. This order is not paid yet."}
            </p>
            <ul className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
              {order.items.map((item) => (
                <li key={`${item.productName}-${item.size || ""}`} className="flex justify-between gap-3">
                  <span>{item.productName}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</span>
                  <span>{formatInr(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-right font-medium">Total {formatInr(order.total)}</p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Deliver to {order.address.house}, {order.address.street}, {order.address.locality}, {order.address.city}, {order.address.state} {order.address.pincode}
            </p>
          </div>
        ) : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/products" className={buttonClass}>Continue shopping</Link>
          {order && !paid ? <Link href={`/order/pending?order=${order.orderNumber}`} className={buttonSecondaryClass}>Check payment</Link> : null}
        </div>
      </PaymentStage>
    </Container>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<Container className="py-16 text-sm text-stone-600">Loading order…</Container>}>
      <SuccessContent />
    </Suspense>
  );
}
