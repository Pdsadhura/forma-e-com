import Link from "next/link";
import { Container } from "./Container";
import { STORE_NAME, SUPPORT_EMAIL } from "@/lib/types";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200">
      <Container className="grid gap-8 py-10 text-sm text-stone-600 sm:grid-cols-3">
        <div>
          <p className="font-medium text-stone-950">{STORE_NAME}</p>
          <p className="mt-2 max-w-xs">Everyday objects for the home. Orders are paid in INR through Razorpay.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms and conditions</Link>
          <Link href="/shipping">Shipping policy</Link>
          <Link href="/refunds">Cancellation and refunds</Link>
        </div>
        <div>
          <p>Questions about an order</p>
          <a className="mt-2 inline-block text-stone-950" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <Link href="/admin/login" className="mt-4 block text-stone-400">Admin</Link>
        </div>
      </Container>
    </footer>
  );
}
