"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/Container";
import { PaymentStage } from "@/components/PaymentStage";
import { buttonClass, buttonSecondaryClass } from "@/lib/ui";
import { rememberedContact, startPayment } from "@/lib/razorpay";

function FailureContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderNumber = params.get("order") || "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const contact = orderNumber ? rememberedContact(orderNumber) : null;

  async function retry() {
    if (!orderNumber || !contact) return;
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
      <PaymentStage tone="failure" eyebrow="Payment" title="Payment didn't go through">
        <p className="mx-auto max-w-md text-sm leading-6 text-stone-600">
          Razorpay did not confirm a successful payment{orderNumber ? ` for ${orderNumber}` : ""}. The order is not marked paid. A pending bank debit is usually reversed by the bank.
        </p>
        {error ? <p className="mt-4 text-sm text-rose-800">{error}</p> : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {contact ? <button type="button" className={buttonClass} onClick={retry} disabled={loading}>{loading ? "Opening payment…" : "Try payment again"}</button> : null}
          <Link href="/products" className={buttonSecondaryClass}>Back to shop</Link>
        </div>
      </PaymentStage>
    </Container>
  );
}

export default function FailurePage() {
  return <Suspense fallback={<Container className="py-16 text-sm text-stone-600">Loading…</Container>}><FailureContent /></Suspense>;
}
