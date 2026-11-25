import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { SUPPORT_EMAIL, STORE_NAME } from "@/lib/types";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy policy">
      <p>{STORE_NAME} collects the details you enter at checkout so we can deliver an order and confirm payment. This page describes that handling. Have it reviewed for your business before you advertise.</p>
      <p>We store your name, email, mobile number, and delivery address with the order. We also store the product names, quantities, and prices at the time you paid. We do not store card numbers, CVV, or UPI PINs. Razorpay processes the payment and we keep the Razorpay order id, payment id, method, and status.</p>
      <p>If you arrive from an advertisement, we keep the campaign parameters from the link (utm source, medium, campaign, content, term, and fbclid) with that order. This lets the store see which campaign produced a paid order. We do not treat a failed or unpaid order as a purchase.</p>
      <p>With your consent, the site loads the Meta pixel and sends PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase events. Purchase is also sent from our server through the Meta Conversions API after Razorpay confirms a captured payment, using a shared event id so Meta can deduplicate the browser and server events. Hashed email, phone, and first name may be included. You can decline the pixel and still check out.</p>
      <p>Order emails are sent through Resend to you and to the store owner after a captured payment. Failed-payment emails are sent separately and are not purchase confirmations.</p>
      <p>Admin access is limited to signed-in store staff. Customer details are not returned by the public product catalogue. To ask about your data, email {SUPPORT_EMAIL}.</p>
    </PolicyLayout>
  );
}
