"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/Container";
import { PaymentStage } from "@/components/PaymentStage";
import { ApiError, apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { rememberedContact, startPayment } from "@/lib/razorpay";
import { buttonClass } from "@/lib/ui";
import type { PublicOrder } from "@/lib/types";

function PendingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const orderNumber = params.get("order") || "";
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    let stopped = false;
    let timer = 0;

    async function load() {
      try {
        const result = await apiFetch<{ data: PublicOrder }>(`/api/orders/${orderNumber}`);
        if (stopped) return;
        setOrder(result.data);
        setError("");
        if (result.data.paymentStatus === "CAPTURED") {
          routerRef.current.replace(`/order/success?order=${orderNumber}`);
          return;
        }
        if (result.data.paymentStatus === "FAILED") {
          routerRef.current.replace(`/order/failure?order=${orderNumber}`);
          return;
        }
        timer = window.setTimeout(load, 8000);
      } catch (caught) {
        if (stopped) return;
        const status = caught instanceof ApiError ? caught.status : 0;
        if (status === 429) {
          setError("Still waiting for Razorpay. The next check will happen in a moment.");
          timer = window.setTimeout(load, 20000);
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not load the order");
        timer = window.setTimeout(load, 12000);
      }
    }

    load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [orderNumber]);

  async function retry() {
    const contact = rememberedContact(orderNumber);
    if (!contact) {
      setError("This browser no longer has the checkout contact. Place the order again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const status = await startPayment(orderNumber, contact);
      router.push(status === "CAPTURED" ? `/order/success?order=${orderNumber}` : `/order/pending?order=${orderNumber}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be restarted");
      setLoading(false);
    }
  }

  return (
    <Container>
      <PaymentStage tone="pending" eyebrow="Razorpay" title="Waiting for payment">
        <p className="mx-auto max-w-md text-sm leading-6 text-stone-600">
          {orderNumber ? `Order ${orderNumber} stays unpaid until Razorpay confirms it.` : "We need an order number to look this up."} Closing the payment window does not complete the order.
        </p>
        {order ? <p className="mt-4 text-sm text-stone-500">Amount {formatInr(order.total)}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
        {orderNumber ? (
          <button type="button" className={`${buttonClass} mt-8`} onClick={retry} disabled={loading}>
            {loading ? "Opening payment…" : "Try payment again"}
          </button>
        ) : null}
      </PaymentStage>
    </Container>
  );
}

export default function PendingPage() {
  return <Suspense fallback={<Container className="py-16 text-sm text-stone-600">Loading payment…</Container>}><PendingContent /></Suspense>;
}
