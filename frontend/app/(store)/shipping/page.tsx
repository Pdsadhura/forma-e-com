import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";

export const metadata: Metadata = { title: "Shipping policy" };

export default function ShippingPage() {
  return (
    <PolicyLayout title="Shipping policy">
      <p>We deliver to Indian addresses with a valid 6-digit PIN code. Shipping is ₹79. Orders of ₹999 or more ship free. The server calculates this from the current product prices; the checkout summary is an estimate until payment opens.</p>
      <p>Paid orders move to processing. We aim to hand a parcel to the courier within 1–2 business days, then delivery commonly takes 3–7 business days depending on the PIN code. Remote PINs can take longer. We will share status updates from the admin order record: processing, shipped, or delivered.</p>
      <p>Unpaid orders are not shipped. If a payment is confirmed after the reservation has expired, we re-check stock before fulfilling it. We do not currently ship outside India.</p>
    </PolicyLayout>
  );
}
