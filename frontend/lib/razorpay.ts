import { apiFetch } from "./api";

type RazorpayOrder = {
  data: {
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    orderNumber: string;
  };
};

type VerifyResult = {
  data: { confirmed: boolean; paymentStatus: string; orderNumber?: string };
};

export type CheckoutContact = {
  name: string;
  email: string;
  phone: string;
};

export function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function startPayment(orderNumber: string, customer: CheckoutContact) {
  const payment = await apiFetch<RazorpayOrder>("/api/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ orderNumber }),
  });
  const loaded = await loadRazorpay();
  if (!loaded || !window.Razorpay) {
    throw new Error("Razorpay Checkout could not be loaded. Check your connection and try again.");
  }
  const Razorpay = window.Razorpay;
  const status = await new Promise<string>((resolve, reject) => {
    const checkout = new Razorpay({
      key: payment.data.keyId,
      amount: payment.data.amount,
      currency: payment.data.currency,
      name: "Forma",
      description: `Order ${orderNumber}`,
      order_id: payment.data.razorpayOrderId,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      theme: { color: "#022c22" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const verified = await apiFetch<VerifyResult>("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify(response),
          });
          resolve(verified.data.paymentStatus || "PENDING");
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(Object.assign(new Error("Payment window closed before completion."), { code: "DISMISSED" })),
      },
    });
    checkout.on("payment.failed", (response) => {
      reject(Object.assign(new Error(response.error?.description || "The payment was not completed."), { code: "FAILED" }));
    });
    checkout.open();
  });
  return status;
}

export function rememberContact(orderNumber: string, customer: CheckoutContact) {
  window.sessionStorage.setItem("forma_contact", JSON.stringify({ orderNumber, ...customer }));
}

export function rememberedContact(orderNumber: string): CheckoutContact | null {
  const raw = window.sessionStorage.getItem("forma_contact");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CheckoutContact & { orderNumber: string };
    if (parsed.orderNumber !== orderNumber) return null;
    return { name: parsed.name, email: parsed.email, phone: parsed.phone };
  } catch {
    return null;
  }
}
