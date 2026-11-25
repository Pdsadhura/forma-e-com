import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { SUPPORT_EMAIL } from "@/lib/types";

export const metadata: Metadata = { title: "Cancellation and refunds" };

export default function RefundsPage() {
  return (
    <PolicyLayout title="Cancellation and refunds">
      <p>You can abandon checkout before paying. The unpaid order is cancelled automatically and stock returns to the shelf after 30 minutes. A failed Razorpay payment does not mark the order paid, and you can try the payment again while the order is still open.</p>
      <p>To cancel a paid order before it ships, email {SUPPORT_EMAIL} with the order number. If it has not shipped, we cancel the fulfillment and refund the captured amount to the original payment method. Refunds are initiated in Razorpay and usually appear in 5–7 business days, depending on the bank.</p>
      <p>Delivered items can be returned within 7 days if they are unused and in their original condition. Write to us with the order number and we will share the return steps. We refund the product amount after the return is checked. Shipping charged on the original order is refunded when we made an error or the item arrived damaged.</p>
      <p>Cancelling a paid order in the admin dashboard updates fulfillment. It does not automatically move money. Refund the payment from the Razorpay dashboard, then keep the order status as cancelled.</p>
    </PolicyLayout>
  );
}
