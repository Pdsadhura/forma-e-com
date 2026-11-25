import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { STORE_NAME } from "@/lib/types";

export const metadata: Metadata = { title: "Terms and conditions" };

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms and conditions">
      <p>These terms cover purchases from {STORE_NAME} through this website. By placing an order you agree to them. Prices are shown in Indian rupees and include the price stored for that product at the moment the order is created. A sale price applies only when it is lower than the regular price.</p>
      <p>Placing an order reserves stock. The contract for sale is formed when Razorpay confirms a captured payment. An order that stays unpaid is cancelled and the stock is released after the reservation window, currently 30 minutes. Visiting the success page does not by itself mean the order is paid.</p>
      <p>You are responsible for a complete delivery address and a reachable mobile number. Title in the goods passes when they are delivered. We may refuse an order if a product is unavailable, if the payment amount does not match, or if the address cannot be served in India.</p>
      <p>The website and product text are owned by the store. You may not copy the catalogue for resale. These terms are governed by the laws of India. Replace this draft with counsel-approved terms before you take paid advertising live.</p>
    </PolicyLayout>
  );
}
